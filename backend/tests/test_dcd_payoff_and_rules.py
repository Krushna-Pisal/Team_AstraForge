"""
Unit, integration, curve consistency, backtest, and suitability tests for DCD.
Follows the exact standards as CPN: zero synthetic fallback in production, exact math.
"""

import pytest
import numpy as np
import pandas as pd
from app.dcd.schemas import DcdProductInput, DcdPayoffRequest
from app.dcd.payoff import calculate_dcd_payoff_core
from app.dcd.curve import generate_dcd_curve
from app.dcd.scenarios import run_dcd_scenarios
from app.dcd.backtest import run_dcd_backtest
from app.dcd.loss_measures import calculate_dcd_loss_measures
from app.phase4_models import ClientProfile, ProductRiskCharacteristics, SuitabilityRequest
from app.phase4_suitability import run_suitability_assessment


# Test 1: No conversion (S_T < Strike for FX_AT_OR_ABOVE_STRIKE)
def test_dcd_no_conversion():
    prod = DcdProductInput(
        pair="USDINR=X",
        deposit_currency="USD",
        alternate_currency="INR",
        deposit_amount=100_000.0,
        tenor_years=0.25,  # 3 months
        conversion_strike_rate=85.0,
        initial_fx_rate=84.0,
        conversion_condition="FX_AT_OR_ABOVE_STRIKE",
        coupon_pct_pa=6.0,
    )
    # Maturity FX is 83.0 (no conversion)
    outcome = calculate_dcd_payoff_core(prod, 83.0)
    assert not outcome.conversion_occurred
    assert outcome.repayment_currency == "USD"
    assert outcome.principal_repayment_amount == 100_000.0
    assert outcome.coupon_amount == 100_000.0 * 0.06 * 0.25  # 1,500 USD
    assert outcome.total_value_deposit_currency == 101_500.0
    assert outcome.return_pct == pytest.approx(1.5, abs=1e-4)


# Test 2: Conversion triggered (S_T >= Strike for FX_AT_OR_ABOVE_STRIKE)
def test_dcd_conversion_triggered():
    prod = DcdProductInput(
        pair="USDINR=X",
        deposit_currency="USD",
        alternate_currency="INR",
        deposit_amount=100_000.0,
        tenor_years=0.25,
        conversion_strike_rate=85.0,
        initial_fx_rate=84.0,
        conversion_condition="FX_AT_OR_ABOVE_STRIKE",
        coupon_pct_pa=6.0,
    )
    # Maturity FX is 90.0 (alternate currency depreciated, S_T >= K)
    outcome = calculate_dcd_payoff_core(prod, 90.0)
    assert outcome.conversion_occurred
    assert outcome.repayment_currency == "INR"
    assert outcome.principal_repayment_amount == 100_000.0 * 85.0  # 8,500,000 INR
    assert outcome.coupon_amount == 1500.0
    # Equivalent USD value: 8,500,000 / 90.0 = 94,444.44 USD
    expected_principal_val_usd = (100_000.0 * 85.0) / 90.0
    assert outcome.principal_value_deposit_currency == pytest.approx(expected_principal_val_usd, abs=0.01)
    expected_total_val = expected_principal_val_usd + 1500.0
    assert outcome.total_value_deposit_currency == pytest.approx(expected_total_val, abs=0.01)
    expected_return = ((expected_total_val - 100_000.0) / 100_000.0) * 100.0
    assert outcome.return_pct == pytest.approx(expected_return, abs=1e-3)


# Test 3: Reverse condition (FX_AT_OR_BELOW_STRIKE)
def test_dcd_reverse_condition():
    prod = DcdProductInput(
        pair="USDINR=X",
        deposit_currency="USD",
        alternate_currency="INR",
        deposit_amount=100_000.0,
        tenor_years=0.25,
        conversion_strike_rate=85.0,
        conversion_condition="FX_AT_OR_BELOW_STRIKE",
        coupon_pct_pa=4.0,
    )
    # S_T = 83.0 triggers conversion because S_T <= 85.0
    out_conv = calculate_dcd_payoff_core(prod, 83.0)
    assert out_conv.conversion_occurred
    assert out_conv.repayment_currency == "INR"

    # S_T = 88.0 does not trigger conversion
    out_no_conv = calculate_dcd_payoff_core(prod, 88.0)
    assert not out_no_conv.conversion_occurred
    assert out_no_conv.repayment_currency == "USD"


# Test 4: Curve consistency - every single point matches payoff engine
def test_dcd_curve_consistency():
    prod = DcdProductInput(
        pair="USDINR=X",
        deposit_currency="USD",
        alternate_currency="INR",
        deposit_amount=50_000.0,
        tenor_years=0.5,
        conversion_strike_rate=86.0,
        initial_fx_rate=85.0,
        coupon_pct_pa=8.0,
    )
    curve = generate_dcd_curve(prod)
    assert len(curve.points) > 0

    for pt in curve.points:
        expected = calculate_dcd_payoff_core(prod, pt.fx_rate)
        assert pt.investor_return_pct == pytest.approx(expected.return_pct, abs=1e-4)
        assert pt.conversion_occurred == expected.conversion_occurred


# Test 5: Break-even analytical calculation
def test_dcd_break_even():
    # Strike: 85.0, coupon: 6% p.a., tenor: 0.25
    # coupon_ratio = 0.06 * 0.25 = 0.015
    # S* = 85.0 / (1 - 0.015) = 86.294416...
    prod = DcdProductInput(
        pair="USDINR=X",
        deposit_currency="USD",
        alternate_currency="INR",
        deposit_amount=100_000.0,
        tenor_years=0.25,
        conversion_strike_rate=85.0,
        initial_fx_rate=85.0,
        coupon_pct_pa=6.0,
    )
    curve = generate_dcd_curve(prod)
    be_rate = curve.breakpoints.break_even_fx_rate
    assert be_rate is not None
    assert be_rate == pytest.approx(85.0 / (1.0 - 0.015), abs=1e-2)

    # Evaluate at break-even rate: return should be ~0%
    be_outcome = calculate_dcd_payoff_core(prod, be_rate)
    assert be_outcome.return_pct == pytest.approx(0.0, abs=0.1)


# Test 6: Scenarios evaluation
def test_dcd_scenarios():
    prod = DcdProductInput(
        pair="USDINR=X",
        deposit_currency="USD",
        alternate_currency="INR",
        deposit_amount=100_000.0,
        tenor_years=0.25,
        conversion_strike_rate=85.0,
        initial_fx_rate=85.0,
        coupon_pct_pa=6.0,
    )
    scenarios_res = run_dcd_scenarios(prod, [-10.0, 0.0, 10.0])
    assert len(scenarios_res.scenarios) == 3
    # At -10% shock (rate = 76.5 < 85): no conversion
    assert not scenarios_res.scenarios[0].conversion_occurred
    # At +10% shock (rate = 93.5 >= 85): conversion occurred
    assert scenarios_res.scenarios[2].conversion_occurred


# Test 7: Real-data backtest on USDINR=X
def test_dcd_real_backtest():
    prod = DcdProductInput(
        pair="USDINR=X",
        deposit_currency="USD",
        alternate_currency="INR",
        deposit_amount=100_000.0,
        tenor_years=0.25,
        conversion_strike_rate=85.0,
        coupon_pct_pa=6.0,
        fd_rate_pct_pa=3.0,
    )
    bt = run_dcd_backtest(prod)
    assert bt.total_windows > 100
    assert 0.0 <= bt.conversion_frequency_pct <= 100.0
    assert len(bt.histogram) == 10
    assert "Yahoo Finance" in bt.source or "USDINR" in bt.source


# Test 8: Input validation rejects invalid terms
def test_dcd_validation():
    # Same currencies
    with pytest.raises(ValueError):
        DcdProductInput(
            pair="USDUSD=X",
            deposit_currency="USD",
            alternate_currency="USD",
            deposit_amount=100_000.0,
            tenor_years=0.25,
            conversion_strike_rate=1.0,
        )

    # Zero or negative strike
    with pytest.raises(ValueError):
        DcdProductInput(
            pair="USDINR=X",
            deposit_currency="USD",
            alternate_currency="INR",
            deposit_amount=100_000.0,
            tenor_years=0.25,
            conversion_strike_rate=0.0,
        )

    # Negative deposit amount
    with pytest.raises(ValueError):
        DcdProductInput(
            pair="USDINR=X",
            deposit_currency="USD",
            alternate_currency="INR",
            deposit_amount=-1000.0,
            tenor_years=0.25,
            conversion_strike_rate=85.0,
        )


# Test 9: Suitability evaluation with DCD
def test_dcd_suitability():
    client_prof = ClientProfile(
        client_id="CLI-DCD-01",
        client_name="Corporate Treasurer",
        risk_appetite="AGGRESSIVE",
        investment_horizon_months=12,
        max_acceptable_loss_pct=30.0,
        total_portfolio_value=50_000_000,
        proposed_investment_amount=1_000_000,
        liquidity_requirement_months=6,
    )

    dcd_prod = ProductRiskCharacteristics(
        product_type="DCD",
        product_reference="DCD-USDINR-85",
        tenor_years=0.25,
        underlying_asset="USDINR=X",
        issuer="AstraForge Bank",
        currency_conversion_risk=True,
        max_contractual_loss_pct=100.0,
        assessed_loss_pct=100.0,
    )
    req = SuitabilityRequest(client=client_prof, product_risk=dcd_prod)
    res = run_suitability_assessment(req)
    assert res.overall_status in ["suitable", "suitable_with_warnings", "review_required"]
    loss_check = next(c for c in res.checks if c.type == "loss_tolerance")
    assert loss_check.status == "MISMATCH"  # 100% loss bound exceeds 30% tolerance


# Test 10: Regression test: CPN tests still pass
def test_dcd_cpn_regression():
    from app.cpn.payoff import calculate_cpn_payoff_core
    cpn_outcome = calculate_cpn_payoff_core(
        investment=1_000_000.0,
        tenor_years=1.0,
        protection_pct=100.0,
        participation_pct=100.0,
        r=0.20,
        cap_pct=None,
        coupon_pct_pa=0.0,
    )
    assert cpn_outcome["final_amount"] == 1_200_000.0
