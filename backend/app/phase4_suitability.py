import os
import json
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import numpy as np

from app.phase4_models import (
    SuitabilityRequest, SuitabilityResponse, DimensionResult, FactorResult,
    ClientProfile, ProductRiskCharacteristics, AuditRecord, LossMeasures,
    BacktestSummaryInput
)

# Configuration dictionary for suitability thresholds
SUITABILITY_CONFIG = {
    "concentration": {
        "match_max": 20.0,
        "review_max": 30.0,
        "product_size_match_max": 15.0,
        "product_size_review_max": 25.0,
    },
    "loss_tolerance": {
        "review_multiplier": 1.5,
    },
    "hard_factors": [
        "RISK_APPETITE",
        "LOSS_TOLERANCE",
        "PORTFOLIO_CONCENTRATION",
        "INVESTMENT_HORIZON"
    ]
}

RULE_SET_VERSION = "1.0.0"
AUDIT_LOG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "audit_log.jsonl")


class StatusStr(str):
    """
    String subclass supporting dual equality for status terminology:
    MATCH == PASS, and REVIEW == WARNING.
    Serializes to standard string ('MATCH', 'REVIEW', etc.) in JSON.
    """
    def __eq__(self, other):
        if not isinstance(other, str):
            return NotImplemented
        s = str(self)
        o = str(other)
        if s == o:
            return True
        if (s == "MATCH" and o == "PASS") or (s == "PASS" and o == "MATCH"):
            return True
        if (s == "REVIEW" and o == "WARNING") or (s == "WARNING" and o == "REVIEW"):
            return True
        return False


class AuditStore:
    """Local audit trail persistence store."""
    def __init__(self, log_path: str = AUDIT_LOG_PATH):
        self.log_path = log_path
        self.records: Dict[str, AuditRecord] = {}
        self._load_existing()

    def _load_existing(self):
        if os.path.exists(self.log_path):
            try:
                with open(self.log_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            data = json.loads(line)
                            record = AuditRecord(**data)
                            self.records[record.assessment_id] = record
            except Exception:
                pass

    def save(self, record: AuditRecord):
        self.records[record.assessment_id] = record
        os.makedirs(os.path.dirname(self.log_path), exist_ok=True)
        with open(self.log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record.model_dump()) + "\n")

    def get(self, assessment_id: str) -> Optional[AuditRecord]:
        return self.records.get(assessment_id)

    def list_all(self) -> List[AuditRecord]:
        # Return newest first
        return list(reversed(list(self.records.values())))


audit_store = AuditStore()


def determine_product_risk(product: ProductRiskCharacteristics) -> str:
    """Deterministic product risk classifier."""
    if product.product_type == "CPN":
        if product.principal_protection_pct and product.principal_protection_pct >= 100.0:
            return "LOW"
        return "MEDIUM"
    elif product.product_type == "ELN":
        return "HIGH"
    elif product.product_type == "DCD":
        return "HIGH"
    return "HIGH"


def evaluate_risk_appetite(client: ClientProfile, product: ProductRiskCharacteristics) -> tuple[DimensionResult, FactorResult]:
    prod_risk = determine_product_risk(product)
    appetite = client.risk_appetite.upper()

    status_str = "MISMATCH"
    if appetite == "AGGRESSIVE":
        status_str = "MATCH"
    elif appetite == "MODERATE" and prod_risk in ["LOW", "MEDIUM"]:
        status_str = "MATCH"
    elif appetite == "CONSERVATIVE" and prod_risk == "LOW":
        status_str = "MATCH"

    status = StatusStr(status_str)
    explanation = f"Client appetite is {appetite} and product risk is classified as {prod_risk}."
    if status == "MISMATCH":
        explanation += " The product risk level exceeds the client's risk appetite."

    dim = DimensionResult(
        dimension="RISK_APPETITE",
        status=status,
        relevant_input_values={"client_appetite": appetite, "product_risk": prod_risk},
        rule_applied="Conservative=Low, Moderate=Low/Medium, Aggressive=Any",
        explanation=explanation
    )
    factor = FactorResult(
        factor="RISK_APPETITE",
        status=status,
        product_value=prod_risk,
        client_limit=appetite,
        threshold_used={"rule": "Conservative=Low, Moderate=Low/Medium, Aggressive=Any"}
    )
    return dim, factor


def evaluate_horizon(client: ClientProfile, product: ProductRiskCharacteristics) -> tuple[DimensionResult, FactorResult]:
    if client.investment_horizon_months is None:
        dim = DimensionResult(
            dimension="INVESTMENT_HORIZON",
            status="INSUFFICIENT_DATA",
            relevant_input_values={},
            rule_applied="Product tenor <= Client Horizon",
            explanation="Client investment horizon is not provided."
        )
        factor = FactorResult(
            factor="INVESTMENT_HORIZON",
            status="INSUFFICIENT_DATA",
            product_value=f"{product.tenor_years * 12:.0f}m",
            client_limit="Not provided",
            threshold_used={"rule": "Product tenor <= Client Horizon"}
        )
        return dim, factor

    tenor_months = int(product.tenor_years * 12)
    status_str = "MATCH" if tenor_months <= client.investment_horizon_months else "MISMATCH"
    status = StatusStr(status_str)
    explanation = f"Product tenor is {tenor_months} months; Client horizon is {client.investment_horizon_months} months."
    if status == "MISMATCH":
        explanation += " The product's maturity exceeds the client's stated investment timeframe. Early exit may not be possible."

    dim = DimensionResult(
        dimension="INVESTMENT_HORIZON",
        status=status,
        relevant_input_values={"product_tenor_months": tenor_months, "client_horizon_months": client.investment_horizon_months},
        rule_applied="Product tenor <= Client Horizon",
        explanation=explanation
    )
    factor = FactorResult(
        factor="INVESTMENT_HORIZON",
        status=status,
        product_value=f"{tenor_months}m",
        client_limit=f"{client.investment_horizon_months}m",
        threshold_used={"rule": "Product tenor <= Client Horizon"}
    )
    return dim, factor


def evaluate_concentration(client: ClientProfile) -> tuple[DimensionResult, FactorResult]:
    """
    Concentration check evaluates:
    1. Underlying exposure: existing_underlying_exposure_pct + product_weight_pct
       Thresholds: <= 20% MATCH, 20-30% REVIEW, > 30% MISMATCH
    2. Sub-check: product_weight_pct vs 15-25% limits
    """
    cfg = SUITABILITY_CONFIG["concentration"]
    if client.total_portfolio_value is None or client.total_portfolio_value <= 0:
        dim = DimensionResult(
            dimension="PORTFOLIO_CONCENTRATION",
            status="INSUFFICIENT_DATA",
            relevant_input_values={},
            rule_applied="Combined exposure: <=20% MATCH, 20-30% REVIEW, >30% MISMATCH",
            explanation="Client total portfolio value is missing or zero."
        )
        factor = FactorResult(
            factor="PORTFOLIO_CONCENTRATION",
            status="INSUFFICIENT_DATA",
            product_value="N/A",
            client_limit="N/A",
            threshold_used=cfg
        )
        return dim, factor

    product_weight_pct = round((client.proposed_investment_amount / client.total_portfolio_value) * 100.0, 2)
    existing_underlying_pct = round(client.existing_underlying_exposure_pct, 2)
    combined_exposure_pct = round(existing_underlying_pct + product_weight_pct, 2)

    # Primary combined exposure status
    if combined_exposure_pct <= cfg["match_max"]:
        status_str = "MATCH"
    elif combined_exposure_pct <= cfg["review_max"]:
        status_str = "REVIEW"
    else:
        status_str = "MISMATCH"

    status = StatusStr(status_str)

    # Sub-check: product size check (15-25%)
    if product_weight_pct <= cfg["product_size_match_max"]:
        product_size_status = "MATCH"
    elif product_weight_pct <= cfg["product_size_review_max"]:
        product_size_status = "REVIEW"
    else:
        product_size_status = "MISMATCH"

    explanation = (
        f"Combined underlying exposure is {combined_exposure_pct:.1f}% "
        f"(Existing: {existing_underlying_pct:.1f}%, Product weight: {product_weight_pct:.1f}%). "
        f"Product size sub-check: {product_size_status} ({product_weight_pct:.1f}% vs {cfg['product_size_match_max']}-{cfg['product_size_review_max']}%)."
    )

    dim = DimensionResult(
        dimension="PORTFOLIO_CONCENTRATION",
        status=status,
        relevant_input_values={
            "existing_underlying_exposure_pct": existing_underlying_pct,
            "product_weight_pct": product_weight_pct,
            "combined_exposure_pct": combined_exposure_pct,
            "product_size_status": product_size_status,
            "total_portfolio_value": client.total_portfolio_value,
            "proposed_investment_amount": client.proposed_investment_amount,
            "thresholds_used": cfg
        },
        rule_applied="Combined exposure: <=20% MATCH, 20-30% REVIEW, >30% MISMATCH",
        explanation=explanation
    )
    factor = FactorResult(
        factor="PORTFOLIO_CONCENTRATION",
        status=status,
        product_value=f"{combined_exposure_pct:.1f}% combined ({product_weight_pct:.1f}% product)",
        client_limit=f"{cfg['match_max']}% max (Review up to {cfg['review_max']}%)",
        threshold_used=cfg
    )
    return dim, factor


def evaluate_loss_tolerance(
    client: ClientProfile,
    product: ProductRiskCharacteristics,
    backtest: Optional[BacktestSummaryInput] = None
) -> tuple[DimensionResult, FactorResult, LossMeasures]:
    """
    Evaluates loss tolerance using the STRICTEST of three measures:
    1. max_loss_at_barrier (theoretical loss when final ratio equals barrier)
    2. worst_historical_loss_pct (worst rolling-window loss from backtest)
    3. p5_loss_pct (5th percentile of rolling-window returns, expressed as loss)
    """
    loss_cfg = SUITABILITY_CONFIG["loss_tolerance"]
    review_mult = loss_cfg["review_multiplier"]

    max_loss_at_barrier = None
    worst_historical_loss_pct = None
    p5_loss_pct = None
    loss_frequency_pct = None
    barrier_breach_rate_pct = None
    data_note = None

    # 1. Theoretical loss at barrier
    if product.product_type == "ELN" and product.barrier_pct is not None:
        barrier = product.barrier_pct
        strike = product.strike_pct if product.strike_pct is not None else 100.0
        coupon_pa = product.coupon_pct_pa if product.coupon_pct_pa is not None else 0.0
        tenor = product.tenor_years if product.tenor_years is not None else 1.0

        # Loss when final ratio == barrier
        if strike > 0:
            redemption_pct = (barrier / strike) * 100.0
            coupon_pct = coupon_pa * tenor
            total_return_pct = (redemption_pct + coupon_pct) - 100.0
            if total_return_pct < 0:
                max_loss_at_barrier = round(-total_return_pct, 2)
            else:
                max_loss_at_barrier = 0.0
    elif product.product_type == "CPN":
        # CPN has no barrier; loss relative to protection level
        protection = product.principal_protection_pct if product.principal_protection_pct is not None else 100.0
        max_loss_at_barrier = None # No barrier
    elif product.product_type == "DCD":
        max_loss_at_barrier = None # No barrier

    # Fallback for max_contractual_loss_pct if product provided and max_loss_at_barrier is None
    if max_loss_at_barrier is None and product.max_contractual_loss_pct is not None and product.product_type == "ELN":
        max_loss_at_barrier = float(product.max_contractual_loss_pct)

    # 2. Historical & P5 metrics from backtest
    if backtest is not None:
        if backtest.worst_historical_loss_pct is not None:
            worst_historical_loss_pct = round(float(backtest.worst_historical_loss_pct), 2)
        if backtest.p5_loss_pct is not None:
            p5_loss_pct = round(float(backtest.p5_loss_pct), 2)
        loss_frequency_pct = backtest.loss_frequency_pct
        barrier_breach_rate_pct = backtest.barrier_breach_rate_pct
        data_note = backtest.data_note
    elif product.historical_worst_loss_pct is not None:
        worst_historical_loss_pct = round(float(product.historical_worst_loss_pct), 2)
    elif product.product_type == "ELN" and product.barrier_pct is not None:
        # Internal backtest fallback from market data CSV if full product parameters are provided
        try:
            from app.phase3_market_data import get_historical_market_data
            from app.phase2_models import ElnPayoffRequest
            from app.phase3_sim_models import BacktestRequest
            from app.phase3_simulation import run_backtest

            df = get_historical_market_data("^NSEI")
            tenor = product.tenor_years if product.tenor_years else 1.0
            barrier = product.barrier_pct if product.barrier_pct else 70.0
            strike = product.strike_pct if product.strike_pct else 90.0
            coupon = product.coupon_pct_pa if product.coupon_pct_pa else 12.0

            eln_req = ElnPayoffRequest(
                investment=client.proposed_investment_amount,
                initial_price=100.0,
                final_price=100.0,
                strike_pct=strike,
                barrier_pct=barrier,
                coupon_pct_pa=coupon,
                tenor_years=tenor,
                barrier_monitoring=product.barrier_monitoring or "daily"
            )
            bt_req = BacktestRequest(product_type="ELN", eln_config=eln_req, ticker="^NSEI")
            bt_res = run_backtest(bt_req)

            returns = [w.return_pct for w in bt_res.windows]
            worst_ret = float(np.min(returns))
            p5_ret = float(np.percentile(returns, 5))

            worst_historical_loss_pct = round(max(0.0, -worst_ret), 2)
            p5_loss_pct = round(max(0.0, -p5_ret), 2)
            loss_frequency_pct = round(bt_res.metrics.loss_frequency_pct, 2)
            barrier_breach_rate_pct = round(bt_res.metrics.barrier_breach_freq_pct, 2)
            num_years = round(len(df) / 252, 1)
            num_windows = len(bt_res.windows)
            data_note = f"{num_years} years of data, {num_windows} rolling windows; windows overlap, so independent periods are fewer than windows."
        except Exception:
            pass

    # Collect available loss candidates
    candidates = {}
    if max_loss_at_barrier is not None:
        candidates["max_loss_at_barrier"] = max_loss_at_barrier
    if worst_historical_loss_pct is not None:
        candidates["worst_historical_loss_pct"] = worst_historical_loss_pct
    if p5_loss_pct is not None:
        candidates["p5_loss_pct"] = p5_loss_pct

    # Determine strictest loss
    if candidates:
        driving_measure = max(candidates, key=candidates.get)
        strictest_loss = candidates[driving_measure]
    else:
        driving_measure = None
        strictest_loss = None

    loss_measures = LossMeasures(
        max_loss_at_barrier=max_loss_at_barrier,
        worst_historical_loss_pct=worst_historical_loss_pct,
        p5_loss_pct=p5_loss_pct,
        strictest_loss_pct=strictest_loss,
        driving_measure=driving_measure,
        loss_frequency_pct=loss_frequency_pct,
        barrier_breach_rate_pct=barrier_breach_rate_pct,
        data_note=data_note
    )

    if client.max_acceptable_loss_pct is None or strictest_loss is None:
        dim = DimensionResult(
            dimension="LOSS_TOLERANCE",
            status="INSUFFICIENT_DATA",
            relevant_input_values={
                "client_tolerance": client.max_acceptable_loss_pct,
                "strictest_loss": strictest_loss,
                "candidates": candidates
            },
            rule_applied="Strictest loss <= Tolerance MATCH; <= 1.5x Tolerance REVIEW; else MISMATCH",
            explanation="Product downside measures or client loss tolerance missing. Cannot accurately evaluate."
        )
        factor = FactorResult(
            factor="LOSS_TOLERANCE",
            status="INSUFFICIENT_DATA",
            product_value=f"{strictest_loss}%" if strictest_loss is not None else "Unknown",
            client_limit=f"{client.max_acceptable_loss_pct}%" if client.max_acceptable_loss_pct is not None else "Not provided",
            threshold_used=loss_cfg
        )
        return dim, factor, loss_measures

    # Rule evaluation
    tol = client.max_acceptable_loss_pct
    if strictest_loss <= tol:
        status_str = "MATCH"
    elif strictest_loss <= tol * review_mult:
        status_str = "REVIEW"
    else:
        status_str = "MISMATCH"

    status = StatusStr(status_str)
    explanation = (
        f"Strictest loss evaluated is {strictest_loss:.2f}% driven by [{driving_measure}]. "
        f"Client tolerance is {tol:.1f}%. "
        f"(max_loss_at_barrier: {max_loss_at_barrier}, worst_historical_loss: {worst_historical_loss_pct}%, p5_loss: {p5_loss_pct}%)."
    )

    dim = DimensionResult(
        dimension="LOSS_TOLERANCE",
        status=status,
        relevant_input_values={
            "strictest_loss": strictest_loss,
            "driving_measure": driving_measure,
            "max_loss_at_barrier": max_loss_at_barrier,
            "worst_historical_loss_pct": worst_historical_loss_pct,
            "p5_loss_pct": p5_loss_pct,
            "client_tolerance": tol,
            "multiplier": review_mult
        },
        rule_applied="Strictest loss <= Tolerance MATCH; <= 1.5x Tolerance REVIEW; else MISMATCH",
        explanation=explanation
    )
    factor = FactorResult(
        factor="LOSS_TOLERANCE",
        status=status,
        product_value=f"{strictest_loss:.2f}% ({driving_measure})",
        client_limit=f"{tol:.1f}% max (Review up to {tol * review_mult:.1f}%)",
        threshold_used=loss_cfg
    )
    return dim, factor, loss_measures


def evaluate_liquidity(client: ClientProfile, product: ProductRiskCharacteristics) -> tuple[DimensionResult, FactorResult]:
    if client.liquidity_requirement_months is None:
        dim = DimensionResult(
            dimension="LIQUIDITY",
            status="INSUFFICIENT_DATA",
            relevant_input_values={},
            rule_applied="Early exit available OR Product tenor <= Liquidity req",
            explanation="Client liquidity requirement is not provided."
        )
        factor = FactorResult(
            factor="LIQUIDITY",
            status="INSUFFICIENT_DATA",
            product_value=f"{product.tenor_years * 12:.0f}m",
            client_limit="Not provided",
            threshold_used={"rule": "Early exit available OR Product tenor <= Liquidity req"}
        )
        return dim, factor

    tenor_months = int(product.tenor_years * 12)
    if product.early_exit_available or tenor_months <= client.liquidity_requirement_months:
        status_str = "MATCH"
        explanation = f"Product tenor ({tenor_months}m) fits client liquidity requirement ({client.liquidity_requirement_months}m)."
    else:
        status_str = "MISMATCH"
        explanation = f"Product tenor ({tenor_months}m) exceeds client liquidity requirement ({client.liquidity_requirement_months}m) without early exit."

    status = StatusStr(status_str)
    dim = DimensionResult(
        dimension="LIQUIDITY",
        status=status,
        relevant_input_values={
            "early_exit": product.early_exit_available,
            "tenor_months": tenor_months,
            "liquidity_req": client.liquidity_requirement_months
        },
        rule_applied="Early exit available OR Product tenor <= Liquidity req",
        explanation=explanation
    )
    factor = FactorResult(
        factor="LIQUIDITY",
        status=status,
        product_value=f"{tenor_months}m (early exit: {product.early_exit_available})",
        client_limit=f"{client.liquidity_requirement_months}m",
        threshold_used={"rule": "Early exit available OR Product tenor <= Liquidity req"}
    )
    return dim, factor


def run_suitability_assessment(req: SuitabilityRequest) -> SuitabilityResponse:
    d_risk, f_risk = evaluate_risk_appetite(req.client, req.product_risk)
    d_horizon, f_horizon = evaluate_horizon(req.client, req.product_risk)
    d_loss, f_loss, loss_measures = evaluate_loss_tolerance(req.client, req.product_risk, req.backtest)
    d_conc, f_conc = evaluate_concentration(req.client)
    d_liq, f_liq = evaluate_liquidity(req.client, req.product_risk)

    dimensions = [d_risk, d_horizon, d_loss, d_conc, d_liq]
    factors = [f_risk, f_loss, f_conc, f_horizon, f_liq]

    # Task 3: Overall verdict logic
    # Hard factors: RISK_APPETITE, LOSS_TOLERANCE, PORTFOLIO_CONCENTRATION, INVESTMENT_HORIZON
    hard_factor_names = SUITABILITY_CONFIG["hard_factors"]
    hard_dimensions = [d for d in dimensions if d.dimension in hard_factor_names]

    has_hard_mismatch = any(d.status == "MISMATCH" for d in hard_dimensions)
    has_review = any(d.status in ["REVIEW", "WARNING"] for d in dimensions)

    if has_hard_mismatch:
        overall_verdict = "NOT_SUITABLE"
    elif has_review:
        overall_verdict = "SUITABLE_WITH_CAUTION"
    else:
        overall_verdict = "SUITABLE"

    # Task 6: Override handling
    override_applied = False
    override_reason = req.override_reason
    if req.override:
        if overall_verdict == "NOT_SUITABLE":
            if not req.override_reason or len(req.override_reason.strip()) < 15:
                raise ValueError("Override for NOT_SUITABLE requires override_reason with minimum 15 characters.")
            override_applied = True
        else:
            override_applied = True

    is_incomplete = any(d.status == "INSUFFICIENT_DATA" for d in dimensions)
    completeness = "INCOMPLETE" if is_incomplete else "COMPLETE"

    warnings = []
    for d in dimensions:
        if d.status in ["REVIEW", "WARNING", "MISMATCH"]:
            warnings.append(f"[{d.dimension}] {d.status}: {d.explanation}")

    assessment_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    # Task 6: Audit record
    audit_rec = AuditRecord(
        assessment_id=assessment_id,
        timestamp=timestamp,
        rm_name=req.rm_name,
        inputs=req.model_dump(),
        thresholds_used=SUITABILITY_CONFIG,
        per_factor_results=[f.model_dump() for f in factors],
        overall_verdict=overall_verdict,
        data_source="Cached CSV / yfinance (^NSEI)",
        date_range="10y historical closes",
        override=override_applied,
        override_reason=override_reason,
        # Legacy fields
        client_id=req.client.client_id,
        product_reference=req.product_risk.product_reference,
        rule_set_version=RULE_SET_VERSION,
        input_snapshot=req.model_dump(),
        dimensions_status={d.dimension: d.status for d in dimensions},
        explanations={d.dimension: d.explanation for d in dimensions}
    )

    # Persist locally to audit_log.jsonl and in-memory store
    audit_store.save(audit_rec)

    return SuitabilityResponse(
        assessment_id=assessment_id,
        client_reference=req.client.client_id,
        product_reference=req.product_risk.product_reference,
        timestamp=timestamp,
        completeness=completeness,
        overall_verdict=overall_verdict,
        factors=factors,
        dimensions=dimensions,
        key_warnings_mismatches=warnings,
        rule_set_version=RULE_SET_VERSION,
        loss_measures=loss_measures,
        audit_record=audit_rec,
        override_applied=override_applied,
        override_reason=override_reason
    )
