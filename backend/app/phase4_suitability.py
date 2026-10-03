import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any
from app.phase4_models import (
    SuitabilityRequest, SuitabilityResponse, DimensionResult,
    ClientProfile, ProductRiskCharacteristics, AuditRecord, SuitabilityCheck
)

# In-memory audit persistence adapter
class AuditStore:
    def __init__(self):
        self.records: Dict[str, AuditRecord] = {}

    def save(self, record: AuditRecord):
        if len(self.records) >= 200:
            self.records.pop(next(iter(self.records)))
        self.records[record.assessment_id] = record

    def get(self, assessment_id: str) -> AuditRecord:
        return self.records.get(assessment_id)

audit_store = AuditStore()

RULE_SET_VERSION = "1.1.0"

def determine_product_risk(product: ProductRiskCharacteristics) -> str:
    """Basic deterministic product risk classifier."""
    if product.product_type == "CPN":
        if product.principal_protection_pct and product.principal_protection_pct >= 100.0:
            return "LOW"
        return "MEDIUM"
    elif product.product_type == "ELN":
        return "HIGH" # Standard non-protected equity risk
    elif product.product_type == "DCD":
        return "HIGH" # Currency conversion risk
    return "HIGH" # Default fallback

def evaluate_risk_appetite(client: ClientProfile, product: ProductRiskCharacteristics) -> DimensionResult:
    prod_risk = determine_product_risk(product)
    appetite = client.risk_appetite.upper()
    
    status = "MISMATCH"
    if appetite == "AGGRESSIVE":
        status = "PASS"
    elif appetite == "MODERATE" and prod_risk in ["LOW", "MEDIUM"]:
        status = "PASS"
    elif appetite == "CONSERVATIVE" and prod_risk == "LOW":
        status = "PASS"
        
    explanation = f"Client appetite is {appetite} and product risk is classified as {prod_risk}."
    if status == "MISMATCH":
        explanation += " The product risk level exceeds the client's risk appetite."
        
    return DimensionResult(
        dimension="RISK_APPETITE",
        status=status,
        relevant_input_values={"client_appetite": appetite, "product_risk": prod_risk},
        rule_applied="Conservative=Low, Moderate=Low/Medium, Aggressive=Any",
        explanation=explanation
    )

def evaluate_horizon(client: ClientProfile, product: ProductRiskCharacteristics) -> DimensionResult:
    if client.investment_horizon_months is None:
        return DimensionResult(
            dimension="INVESTMENT_HORIZON",
            status="INSUFFICIENT_DATA",
            relevant_input_values={},
            rule_applied="Product tenor <= Client Horizon",
            explanation="Client investment horizon is not provided."
        )
        
    tenor_months = product.tenor_years * 12
    status = "PASS" if tenor_months <= client.investment_horizon_months else "MISMATCH"
    explanation = f"Product tenor is {tenor_months} months; Client horizon is {client.investment_horizon_months} months."
    if status == "MISMATCH":
        explanation += " The product's maturity exceeds the client's stated investment timeframe. Early exit may not be possible."
        
    return DimensionResult(
        dimension="INVESTMENT_HORIZON",
        status=status,
        relevant_input_values={"product_tenor_months": tenor_months, "client_horizon_months": client.investment_horizon_months},
        rule_applied="Product tenor <= Client Horizon",
        explanation=explanation
    )

def evaluate_loss_tolerance(client: ClientProfile, product: ProductRiskCharacteristics) -> DimensionResult:
    if client.max_acceptable_loss_pct is None:
        return DimensionResult(
            dimension="LOSS_TOLERANCE",
            status="INSUFFICIENT_DATA",
            relevant_input_values={},
            rule_applied="Worst potential loss <= Client Max Tolerance",
            explanation="Client max acceptable loss is not provided."
        )
        
    assessed_loss = product.assessed_loss_pct
    if assessed_loss is None and product.product_type == "CPN" and product.principal_protection_pct is not None:
        assessed_loss = round(max(0.0, 100.0 - float(product.principal_protection_pct)), 2)
    if assessed_loss is None:
        return DimensionResult(
            dimension="LOSS_TOLERANCE",
            status="INSUFFICIENT_DATA",
            relevant_input_values={
                "client_tolerance": client.max_acceptable_loss_pct,
                "stress_loss_pct": product.stress_loss_pct,
                "historical_worst_loss_pct": product.historical_worst_loss_pct,
                "max_contractual_loss_pct": product.max_contractual_loss_pct,
            },
            rule_applied="Assessed downside (stress or historical) <= Client Max Tolerance",
            explanation="Modeled stress and historical downside evidence are unavailable. Cannot accurately assess loss tolerance; contractual maximum loss is not used as a substitute."
        )
        
    status = "PASS" if assessed_loss <= client.max_acceptable_loss_pct else "MISMATCH"
    comparison = "within" if status == "PASS" else "exceeds"
    explanation = (
        f"Assessed downside of {assessed_loss:.1f}% is {comparison} the client's "
        f"stated maximum acceptable loss of {client.max_acceptable_loss_pct:.1f}%."
    )
    if product.max_contractual_loss_pct is not None and product.max_contractual_loss_pct > client.max_acceptable_loss_pct:
        explanation += (
            f" Separate contractual tail-risk disclosure: the theoretical contractual maximum "
            f"loss is {product.max_contractual_loss_pct:.1f}%, above the client's stated tolerance."
        )
    explanation += " Historical worst observed loss is not the maximum possible future loss."
    
    return DimensionResult(
        dimension="LOSS_TOLERANCE",
        status=status,
        relevant_input_values={
            "assessed_loss_pct": assessed_loss,
            "stress_loss_pct": product.stress_loss_pct,
            "historical_worst_loss_pct": product.historical_worst_loss_pct,
            "max_contractual_loss_pct": product.max_contractual_loss_pct,
            "client_tolerance": client.max_acceptable_loss_pct,
        },
        rule_applied="Assessed downside (max of stress and historical loss) <= Client Max Tolerance",
        explanation=explanation
    )

def evaluate_concentration(client: ClientProfile) -> DimensionResult:
    if client.total_portfolio_value is None or client.total_portfolio_value <= 0 or not client.exposure_details_provided:
        return DimensionResult(
            dimension="PORTFOLIO_CONCENTRATION",
            status="INSUFFICIENT_DATA",
            relevant_input_values={},
            rule_applied="<=20% PASS, >20-30% WARNING, >30% MISMATCH",
            explanation="Add the customer's total investments and existing holdings to complete this check. Missing details have not been treated as zero."
        )
        
    # Apply the existing policy limits to the largest relevant exposure bucket.
    # Buckets can overlap and must not be added to one another.
    proposed_exposure = max(client.existing_structured_product_exposure,
        client.existing_underlying_exposure, client.existing_issuer_exposure) + client.proposed_investment_amount
    concentration_pct = (proposed_exposure / client.total_portfolio_value) * 100.0
    
    if concentration_pct <= 20.0:
        status = "PASS"
    elif concentration_pct <= 30.0:
        status = "WARNING"
    else:
        status = "MISMATCH"
        
    explanation = f"Largest post-investment concentration (underlying, issuer or structured products) is {concentration_pct:.2f}% of total portfolio."
    
    return DimensionResult(
        dimension="PORTFOLIO_CONCENTRATION",
        status=status,
        relevant_input_values={
            "proposed_exposure": proposed_exposure,
            "total_portfolio": client.total_portfolio_value,
            "concentration_pct": concentration_pct
        },
        rule_applied="<=20% PASS, >20-30% WARNING, >30% MISMATCH",
        explanation=explanation
    )

def evaluate_liquidity(client: ClientProfile, product: ProductRiskCharacteristics) -> DimensionResult:
    if client.liquidity_requirement_months is None:
        return DimensionResult(
            dimension="LIQUIDITY",
            status="INSUFFICIENT_DATA",
            relevant_input_values={},
            rule_applied="Early exit available OR Product tenor <= Liquidity req",
            explanation="Client liquidity requirement is not provided."
        )
        
    tenor_months = product.tenor_years * 12
    if product.early_exit_available:
        status = "PASS"
        explanation = "Product offers early exit options fulfilling liquidity requirements."
    elif tenor_months <= client.liquidity_requirement_months:
        status = "PASS"
        explanation = f"Product tenor ({tenor_months}m) fits within client liquidity constraints ({client.liquidity_requirement_months}m)."
    else:
        status = "MISMATCH"
        explanation = f"Product tenor ({tenor_months}m) exceeds client liquidity constraints ({client.liquidity_requirement_months}m) and no early exit is guaranteed."
        
    return DimensionResult(
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

def evaluate_objective(client, product):
    objective = client.investment_objective
    fits = None
    if objective == "CAPITAL_PRESERVATION" and product.principal_protection_pct is not None:
        fits = product.principal_protection_pct >= 100
    elif objective == "INCOME" and product.coupon_pct_pa is not None:
        fits = product.coupon_pct_pa > 0
    elif objective == "GROWTH" and product.upside_participation is not None:
        fits = product.upside_participation
    return DimensionResult(dimension="INVESTMENT_OBJECTIVE",
        status="INSUFFICIENT_DATA" if fits is None else "PASS" if fits else "MISMATCH",
        relevant_input_values={"client_objective": objective, "protection_pct": product.principal_protection_pct,
            "coupon_pct_pa": product.coupon_pct_pa, "upside_participation": product.upside_participation},
        rule_applied="Preservation requires 100% protection; income requires positive coupon; growth requires upside participation.",
        explanation="Objective or product attributes are missing." if fits is None else
            "Product terms support the stated objective under the illustrative policy." if fits else
            "Product terms do not support the stated investment objective.")


def canonical_check(d):
    values = d.relevant_input_values
    keys = {
        "RISK_APPETITE": ("client_appetite", "product_risk"),
        "INVESTMENT_HORIZON": ("client_horizon_months", "product_tenor_months"),
        "LOSS_TOLERANCE": ("client_tolerance", "worst_loss_evaluated"),
        "PORTFOLIO_CONCENTRATION": ("total_portfolio", "concentration_pct"),
        "LIQUIDITY": ("liquidity_req", "tenor_months"),
        "INVESTMENT_OBJECTIVE": ("client_objective", "protection_pct"),
    }
    codes = {
        "RISK_APPETITE": "RISK_EXCEEDS_APPETITE",
        "INVESTMENT_HORIZON": "TENOR_EXCEEDS_HORIZON",
        "LOSS_TOLERANCE": "LOSS_EXCEEDS_TOLERANCE",
        "PORTFOLIO_CONCENTRATION": "CONCENTRATION_EXCEEDS_LIMIT",
        "LIQUIDITY": "LIQUIDITY_MISMATCH",
        "INVESTMENT_OBJECTIVE": "OBJECTIVE_MISMATCH",
    }
    client_key, product_key = keys[d.dimension]
    code = "MISSING_" + d.dimension if d.status == "INSUFFICIENT_DATA" else (
        d.dimension + "_MATCH" if d.status == "PASS" else
        "CONCENTRATION_WARNING" if d.status == "WARNING" else codes[d.dimension])
    return SuitabilityCheck(type=d.dimension.lower(), status="WARNING" if d.status == "INSUFFICIENT_DATA" else d.status,
        client_value=values.get(client_key), product_value=values if d.dimension == "INVESTMENT_OBJECTIVE" else values.get(product_key),
        reason_code=code, reason=d.explanation)


def run_suitability_assessment(req: SuitabilityRequest) -> SuitabilityResponse:
    d_risk = evaluate_risk_appetite(req.client, req.product_risk)
    d_horizon = evaluate_horizon(req.client, req.product_risk)
    d_loss = evaluate_loss_tolerance(req.client, req.product_risk)
    d_conc = evaluate_concentration(req.client)
    d_liq = evaluate_liquidity(req.client, req.product_risk)
    
    dimensions = [d_risk, d_horizon, d_loss, d_conc, d_liq, evaluate_objective(req.client, req.product_risk)]
    
    is_incomplete = any(d.status == "INSUFFICIENT_DATA" for d in dimensions)
    completeness = "INCOMPLETE" if is_incomplete else "COMPLETE"
    
    warnings = []
    for d in dimensions:
        if d.status in ["WARNING", "MISMATCH"]:
            warnings.append(f"[{d.dimension}] {d.status}: {d.explanation}")
            
    assessment_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()
    
    resp = SuitabilityResponse(
        checks=[canonical_check(d) for d in dimensions],
        overall_status="review_required" if is_incomplete or any(d.status == "MISMATCH" for d in dimensions) else
            "suitable_with_warnings" if any(d.status == "WARNING" for d in dimensions) else "suitable",
        assessment_id=assessment_id,
        client_reference=req.client.client_id,
        product_reference=req.product_risk.product_reference,
        timestamp=timestamp,
        completeness=completeness,
        dimensions=dimensions,
        key_warnings_mismatches=warnings,
        rule_set_version=RULE_SET_VERSION
    )
    
    # Audit trail
    record = AuditRecord(
        assessment_id=assessment_id,
        client_id=req.client.client_id,
        product_reference=req.product_risk.product_reference,
        timestamp=timestamp,
        rule_set_version=RULE_SET_VERSION,
        input_snapshot=req.model_dump(),
        dimensions_status={d.dimension: d.status for d in dimensions},
        explanations={d.dimension: d.explanation for d in dimensions}
    )
    audit_store.save(record)
    
    return resp
