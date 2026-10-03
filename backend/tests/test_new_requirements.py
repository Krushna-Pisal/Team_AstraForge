import pytest
import numpy as np
from app.models import ProductInput
from app.payoff_engine import build_eln_two_curves
from app.phase4_models import (
    ClientProfile, ProductRiskCharacteristics, SuitabilityRequest, BacktestSummaryInput
)
from app.phase4_suitability import run_suitability_assessment, audit_store
import numpy as np

def test_concentration_combined_thresholds():
    """
    Test 1: Concentration check at 20, 25, and 31 percent combined exposure
    gives MATCH, REVIEW, MISMATCH.
    """
    # 1. 20% combined exposure -> MATCH
    client_20 = ClientProfile(
        client_id="C20",
        risk_appetite="MODERATE",
        investment_horizon_months=12,
        max_acceptable_loss_pct=20.0,
        total_portfolio_value=1_000_000,
        existing_underlying_exposure_pct=10.0, # 10%
        proposed_investment_amount=100_000,   # 10% -> total 20%
        liquidity_requirement_months=6
    )
    prod = ProductRiskCharacteristics(
        product_type="ELN",
        product_reference="ELN_TEST",
        tenor_years=1.0,
        underlying_asset="NIFTY50",
        issuer="BankA",
        barrier_pct=70.0,
        strike_pct=90.0,
        coupon_pct_pa=10.0
    )
    res_20 = run_suitability_assessment(SuitabilityRequest(client=client_20, product_risk=prod))
    conc_20 = next(f for f in res_20.factors if f.factor == "PORTFOLIO_CONCENTRATION")
    assert conc_20.status == "MATCH"

    # 2. 25% combined exposure -> REVIEW (20 < combined <= 30)
    client_25 = client_20.model_copy(update={
        "existing_underlying_exposure_pct": 15.0 # 15% + 10% = 25%
    })
    res_25 = run_suitability_assessment(SuitabilityRequest(client=client_25, product_risk=prod))
    conc_25 = next(f for f in res_25.factors if f.factor == "PORTFOLIO_CONCENTRATION")
    assert conc_25.status == "REVIEW"

    # 3. 31% combined exposure -> MISMATCH (> 30)
    client_31 = client_20.model_copy(update={
        "existing_underlying_exposure_pct": 21.0 # 21% + 10% = 31%
    })
    res_31 = run_suitability_assessment(SuitabilityRequest(client=client_31, product_risk=prod))
    conc_31 = next(f for f in res_31.factors if f.factor == "PORTFOLIO_CONCENTRATION")
    assert conc_31.status == "MISMATCH"


def test_loss_tolerance_strictest_measure():
    """
    Test 2: Loss tolerance uses the strictest of the three measures.
    Construct a case where p5_loss_pct or worst_historical_loss_pct drives the flag.
    """
    client = ClientProfile(
        client_id="C_LOSS",
        risk_appetite="MODERATE",
        investment_horizon_months=12,
        max_acceptable_loss_pct=15.0, # Client tolerance 15%
        total_portfolio_value=1_000_000,
        proposed_investment_amount=100_000,
        existing_underlying_exposure_pct=0.0
    )
    # ELN where theoretical loss at barrier (75/90 = 83.33% redemption -> ~16.67% loss - 10% coupon = 6.67% loss)
    # But backtest has p5_loss_pct = 22.0% (which is higher than max_loss_at_barrier)
    prod = ProductRiskCharacteristics(
        product_type="ELN",
        product_reference="ELN_TEST_LOSS",
        tenor_years=1.0,
        underlying_asset="NIFTY50",
        issuer="BankA",
        barrier_pct=75.0,
        strike_pct=90.0,
        coupon_pct_pa=10.0
    )
    bt = BacktestSummaryInput(
        worst_historical_loss_pct=28.0,
        p5_loss_pct=22.0,
        loss_frequency_pct=15.0,
        barrier_breach_rate_pct=10.0,
        total_windows=500,
        num_years=10.0,
        data_note="500 rolling windows."
    )
    res = run_suitability_assessment(SuitabilityRequest(client=client, product_risk=prod, backtest=bt))
    assert res.loss_measures is not None
    assert res.loss_measures.driving_measure == "worst_historical_loss_pct"
    assert res.loss_measures.strictest_loss_pct == 28.0

    # Test where p5_loss_pct drives (p5=25.0%, worst=20.0%, max_loss_at_barrier=6.67%)
    bt_p5 = BacktestSummaryInput(
        worst_historical_loss_pct=20.0,
        p5_loss_pct=25.0
    )
    res_p5 = run_suitability_assessment(SuitabilityRequest(client=client, product_risk=prod, backtest=bt_p5))
    assert res_p5.loss_measures.driving_measure == "p5_loss_pct"
    assert res_p5.loss_measures.strictest_loss_pct == 25.0


def test_overall_verdict_logic():
    """
    Test 3: overall_verdict logic for all three outcomes:
    - NOT_SUITABLE if any hard factor is MISMATCH
    - SUITABLE_WITH_CAUTION if no MISMATCH but at least one REVIEW
    - SUITABLE otherwise
    """
    prod = ProductRiskCharacteristics(
        product_type="ELN",
        product_reference="ELN_VERDICT",
        tenor_years=1.0,
        underlying_asset="NIFTY50",
        issuer="BankA",
        barrier_pct=70.0,
        strike_pct=90.0,
        coupon_pct_pa=10.0
    )

    # 1. SUITABLE: Aggressive appetite, 24m horizon, 30% loss tolerance, 10% concentration
    client_suitable = ClientProfile(
        client_id="C_S",
        risk_appetite="AGGRESSIVE",
        investment_horizon_months=24,
        max_acceptable_loss_pct=30.0,
        total_portfolio_value=1_000_000,
        proposed_investment_amount=100_000, # 10%
        existing_underlying_exposure_pct=0.0,
        liquidity_requirement_months=12
    )
    res_s = run_suitability_assessment(SuitabilityRequest(client=client_suitable, product_risk=prod))
    assert res_s.overall_verdict == "SUITABLE"

    # 2. SUITABLE_WITH_CAUTION: Concentration at 25% (REVIEW), no MISMATCH
    client_caution = client_suitable.model_copy(update={
        "existing_underlying_exposure_pct": 15.0 # 15% + 10% = 25% (REVIEW)
    })
    res_c = run_suitability_assessment(SuitabilityRequest(client=client_caution, product_risk=prod))
    assert res_c.overall_verdict == "SUITABLE_WITH_CAUTION"

    # 3. NOT_SUITABLE: Conservative client for HIGH risk ELN (MISMATCH on RISK_APPETITE)
    client_not_suitable = client_suitable.model_copy(update={
        "risk_appetite": "CONSERVATIVE"
    })
    res_ns = run_suitability_assessment(SuitabilityRequest(client=client_not_suitable, product_risk=prod))
    assert res_ns.overall_verdict == "NOT_SUITABLE"


def test_eln_payoff_curve_both_series():
    """
    Test 4: ELN payoff curve returns both series (curve_not_breached and curve_breached),
    and the breached curve is never above the not-breached curve.
    """
    p = ProductInput(
        underlying="NIFTY50",
        investment=100_000,
        tenor_years=1.0,
        strike_pct=90.0,
        barrier_pct=70.0,
        barrier_monitoring="daily",
        coupon_pct_pa=12.0
    )
    ratios = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.5]
    res = build_eln_two_curves(p, ratios)

    assert "curve_not_breached" in res
    assert "curve_breached" in res
    assert len(res["curve_not_breached"]) == len(ratios)
    assert len(res["curve_breached"]) == len(ratios)

    for nb, b in zip(res["curve_not_breached"], res["curve_breached"]):
        # The breached curve investor_return_pct must never exceed the not-breached curve investor_return_pct
        assert b["investor_return_pct"] <= nb["investor_return_pct"] + 1e-6


def test_audit_record_persistence_and_override():
    """
    Test 5: audit_record is written, retrievable by id,
    and override requires a reason with min 15 chars when NOT_SUITABLE.
    """
    client = ClientProfile(
        client_id="C_AUDIT",
        risk_appetite="CONSERVATIVE", # NOT_SUITABLE for ELN
        investment_horizon_months=12,
        max_acceptable_loss_pct=10.0,
        total_portfolio_value=1_000_000,
        proposed_investment_amount=100_000
    )
    prod = ProductRiskCharacteristics(
        product_type="ELN",
        product_reference="ELN_AUDIT",
        tenor_years=1.0,
        underlying_asset="NIFTY50",
        issuer="BankA",
        barrier_pct=70.0,
        strike_pct=90.0,
        coupon_pct_pa=10.0
    )
    req = SuitabilityRequest(client=client, product_risk=prod)
    res = run_suitability_assessment(req)

    # Check persistence
    rec = audit_store.get(res.assessment_id)
    assert rec is not None
    assert rec.assessment_id == res.assessment_id
    assert rec.overall_verdict == "NOT_SUITABLE"

    # Test override without reason or < 15 chars raises ValueError
    req_override_invalid = req.model_copy(update={
        "override": True,
        "override_reason": "Too short" # 9 chars
    })
    with pytest.raises(ValueError, match="override_reason with minimum 15 characters"):
        run_suitability_assessment(req_override_invalid)

    # Test override with valid reason (>= 15 chars) succeeds
    req_override_valid = req.model_copy(update={
        "override": True,
        "override_reason": "Client has significant outside wealth and requested explicit exception."
    })
    res_override = run_suitability_assessment(req_override_valid)
    assert res_override.override_applied is True
    assert res_override.override_reason == "Client has significant outside wealth and requested explicit exception."


def test_mock_clients_verdict_comparison():
    """
    Test 6: Mock client with 5% tolerance (Conservative retiree) gets NOT_SUITABLE
    for a 70%-barrier NIFTY ELN, and the 40% tolerance aggressive trader does not.
    """
    eln_prod = ProductRiskCharacteristics(
        product_type="ELN",
        product_reference="ELN-NIFTY-90-70",
        tenor_years=1.0,
        underlying_asset="NIFTY50",
        issuer="AstraForge Bank",
        barrier_pct=70.0,
        strike_pct=90.0,
        coupon_pct_pa=12.0,
        barrier_monitoring="daily"
    )

    # Conservative retiree: CONSERVATIVE, 5% loss tolerance -> NOT_SUITABLE
    retiree = ClientProfile(
        client_id="CLI-RET-01",
        client_name="Conservative retiree",
        risk_appetite="CONSERVATIVE",
        investment_horizon_months=12,
        max_acceptable_loss_pct=5.0,
        existing_underlying_exposure_pct=10.0,
        total_portfolio_value=10_000_000.0,
        proposed_investment_amount=1_000_000.0,
        liquidity_requirement_months=12
    )
    res_retiree = run_suitability_assessment(SuitabilityRequest(client=retiree, product_risk=eln_prod))
    assert res_retiree.overall_verdict == "NOT_SUITABLE"

    # Aggressive trader: AGGRESSIVE, 40% loss tolerance -> SUITABLE
    trader = ClientProfile(
        client_id="CLI-AGG-03",
        client_name="Aggressive trader",
        risk_appetite="AGGRESSIVE",
        investment_horizon_months=36,
        max_acceptable_loss_pct=40.0,
        existing_underlying_exposure_pct=20.0,
        total_portfolio_value=20_000_000.0,
        proposed_investment_amount=1_000_000.0,
        liquidity_requirement_months=3
    )
    res_trader = run_suitability_assessment(SuitabilityRequest(client=trader, product_risk=eln_prod))
    assert res_trader.overall_verdict in ["SUITABLE", "SUITABLE_WITH_CAUTION"]
    assert res_trader.overall_verdict != "NOT_SUITABLE"
