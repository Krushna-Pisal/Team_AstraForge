import pytest
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from app.cpn.schemas import CpnProductInput, CpnPayoffRequest
from app.cpn.payoff import calculate_cpn_payoff_core
from app.cpn.curve import generate_cpn_curve
from app.cpn.backtest import run_cpn_backtest
from app.phase4_models import (
    SuitabilityRequest,
    ClientProfile,
    ProductRiskCharacteristics,
)
from app.phase4_suitability import run_suitability_assessment

client = TestClient(app)


# Test 1: protection 100, participation 100, no cap, coupon 0
def test_cpn_test_1_basic():
    # r = +20% -> 1,200,000
    res_pos = calculate_cpn_payoff_core(
        investment=1_000_000,
        tenor_years=1.0,
        protection_pct=100.0,
        participation_pct=100.0,
        r=0.20,
        cap_pct=None,
        coupon_pct_pa=0.0,
    )
    assert res_pos["final_amount"] == 1_200_000.0
    assert res_pos["profit_loss"] == 200_000.0
    assert res_pos["return_pct"] == 20.0

    # r = 0 -> 1,000,000
    res_zero = calculate_cpn_payoff_core(
        investment=1_000_000,
        tenor_years=1.0,
        protection_pct=100.0,
        participation_pct=100.0,
        r=0.0,
        cap_pct=None,
        coupon_pct_pa=0.0,
    )
    assert res_zero["final_amount"] == 1_000_000.0
    assert res_zero["profit_loss"] == 0.0
    assert res_zero["return_pct"] == 0.0

    # r = -40% -> 1,000,000
    res_neg = calculate_cpn_payoff_core(
        investment=1_000_000,
        tenor_years=1.0,
        protection_pct=100.0,
        participation_pct=100.0,
        r=-0.40,
        cap_pct=None,
        coupon_pct_pa=0.0,
    )
    assert res_neg["final_amount"] == 1_000_000.0
    assert res_neg["profit_loss"] == 0.0
    assert res_neg["return_pct"] == 0.0


# Test 2: same with cap 30: r=+50% -> 1,300,000
def test_cpn_test_2_cap():
    res = calculate_cpn_payoff_core(
        investment=1_000_000,
        tenor_years=1.0,
        protection_pct=100.0,
        participation_pct=100.0,
        r=0.50,
        cap_pct=30.0,
        coupon_pct_pa=0.0,
    )
    assert res["final_amount"] == 1_300_000.0
    assert res["profit_loss"] == 300_000.0
    assert res["return_pct"] == 30.0


# Test 3: protection 90, participation 100, no cap: r=-40% -> 900,000; r=+25% -> 1,150,000
def test_cpn_test_3_partial_protection():
    res_neg = calculate_cpn_payoff_core(
        investment=1_000_000,
        tenor_years=1.0,
        protection_pct=90.0,
        participation_pct=100.0,
        r=-0.40,
        cap_pct=None,
        coupon_pct_pa=0.0,
    )
    assert res_neg["final_amount"] == 900_000.0
    assert res_neg["profit_loss"] == -100_000.0
    assert res_neg["return_pct"] == -10.0

    res_pos = calculate_cpn_payoff_core(
        investment=1_000_000,
        tenor_years=1.0,
        protection_pct=90.0,
        participation_pct=100.0,
        r=0.25,
        cap_pct=None,
        coupon_pct_pa=0.0,
    )
    assert res_pos["final_amount"] == 1_150_000.0
    assert res_pos["profit_loss"] == 150_000.0
    assert res_pos["return_pct"] == 15.0


# Test 4: protection 100, participation 80: r=+10% -> 1,080,000
def test_cpn_test_4_participation_rate():
    res = calculate_cpn_payoff_core(
        investment=1_000_000,
        tenor_years=1.0,
        protection_pct=100.0,
        participation_pct=80.0,
        r=0.10,
        cap_pct=None,
        coupon_pct_pa=0.0,
    )
    assert res["final_amount"] == 1_080_000.0
    assert res["profit_loss"] == 80_000.0
    assert res["return_pct"] == 8.0


# Test 5: protection 100, coupon 2% p.a., tenor 2, r=0 -> 1,040,000
def test_cpn_test_5_coupon():
    res = calculate_cpn_payoff_core(
        investment=1_000_000,
        tenor_years=2.0,
        protection_pct=100.0,
        participation_pct=100.0,
        r=0.0,
        cap_pct=None,
        coupon_pct_pa=2.0,
    )
    assert res["final_amount"] == 1_040_000.0
    assert res["profit_loss"] == 40_000.0
    assert res["return_pct"] == 4.0


# Test 6: protection 95, participation 50, cap 20, coupon 1% p.a., tenor 3, r=+40% -> 1,080,000
def test_cpn_test_6_combined():
    res = calculate_cpn_payoff_core(
        investment=1_000_000,
        tenor_years=3.0,
        protection_pct=95.0,
        participation_pct=50.0,
        r=0.40,
        cap_pct=20.0,
        coupon_pct_pa=1.0,
    )
    # protected = 950,000; coupon = 30,000; gain = 1,000,000 * 0.50 * 0.20 = 100,000 -> 1,080,000
    assert res["final_amount"] == 1_080_000.0
    assert res["profit_loss"] == 80_000.0
    assert res["return_pct"] == 8.0


# Test 7: Curve consistency: every curve point equals the payoff function at the same r; flat at and below r=0, non-decreasing, flat above the cap
def test_cpn_test_7_curve_consistency():
    prod = CpnProductInput(
        investment=1_000_000,
        tenor_years=1.0,
        protection_pct=95.0,
        participation_pct=80.0,
        cap_pct=25.0,
        coupon_pct_pa=2.0,
    )
    curve_res = generate_cpn_curve(prod)
    points = curve_res.points
    assert len(points) == 111  # -50 to +60 inclusive

    # 1. Every point equals the payoff function at the same r
    for pt in points:
        r_dec = pt.underlying_return_pct / 100.0
        expected = calculate_cpn_payoff_core(
            investment=prod.investment,
            tenor_years=prod.tenor_years,
            protection_pct=prod.protection_pct,
            participation_pct=prod.participation_pct,
            r=r_dec,
            cap_pct=prod.cap_pct,
            coupon_pct_pa=prod.coupon_pct_pa,
        )
        assert pt.investor_return_pct == pytest.approx(expected["return_pct"], abs=1e-4)
        assert pt.final_amount == pytest.approx(expected["final_amount"], abs=1e-2)

    # 2. Flat at and below r=0
    neg_returns = [pt.investor_return_pct for pt in points if pt.underlying_return_pct <= 0]
    assert all(r == pytest.approx(neg_returns[0]) for r in neg_returns)

    # 3. Non-decreasing throughout
    all_returns = [pt.investor_return_pct for pt in points]
    for i in range(len(all_returns) - 1):
        assert all_returns[i + 1] >= all_returns[i] - 1e-6

    # 4. Flat above the cap (cap_pct=25)
    cap_returns = [pt.investor_return_pct for pt in points if pt.underlying_return_pct >= 25]
    assert all(r == pytest.approx(cap_returns[0]) for r in cap_returns)


# Test 8: Break-even: protection 90, no coupon -> +10%; protection 100 -> null
def test_cpn_test_8_break_even():
    prod_90 = CpnProductInput(
        investment=1_000_000,
        tenor_years=1.0,
        protection_pct=90.0,
        participation_pct=100.0,
        cap_pct=None,
        coupon_pct_pa=0.0,
    )
    curve_90 = generate_cpn_curve(prod_90)
    assert curve_90.breakpoints.break_even_underlying_return_pct == pytest.approx(10.0, abs=1e-4)

    prod_100 = CpnProductInput(
        investment=1_000_000,
        tenor_years=1.0,
        protection_pct=100.0,
        participation_pct=100.0,
        cap_pct=None,
        coupon_pct_pa=0.0,
    )
    curve_100 = generate_cpn_curve(prod_100)
    assert curve_100.breakpoints.break_even_underlying_return_pct is None


# Test 9: Backtest on a small hand-made price series where the expected results can be calculated by hand
def test_cpn_test_9_backtest_hand_made():
    # Construct a small series: 5 trading days spanning 1 year
    # Tenor = 1 year (12 months)
    # Day 0: 2020-01-01, close = 100
    # Day 1: 2020-06-01, close = 110
    # Day 2: 2021-01-01, close = 120 (1 year from Day 0: r = (120-100)/100 = +20%)
    # Day 3: 2021-06-01, close = 90 (1 year from Day 1: r = (90-110)/110 = -18.18%)
    # Day 4: 2022-01-01, close = 150 (1 year from Day 2: r = (150-120)/120 = +25%)
    data = {
        "date": ["2020-01-01", "2020-06-01", "2021-01-01", "2021-06-01", "2022-01-01"],
        "close": [100.0, 110.0, 120.0, 90.0, 150.0],
    }
    df = pd.DataFrame(data)

    prod = CpnProductInput(
        investment=1_000_000,
        tenor_years=1.0,
        protection_pct=100.0,
        participation_pct=100.0,
        cap_pct=None,
        coupon_pct_pa=0.0,
    )
    bt = run_cpn_backtest(prod, df=df)
    # Window 0 (2020-01-01 to 2021-01-01): r = +20% -> final_amount = 1,200,000, ret = +20%
    # Window 1 (2020-06-01 to 2021-06-01): r = (90-110)/110 = -18.18% -> final_amount = 1,000,000, ret = 0%
    # Window 2 (2021-01-01 to 2022-01-01): r = (150-120)/120 = +25% -> final_amount = 1,250,000, ret = +25%
    # Windows 3 and 4 run past data end (no date >= 2022-06-01)
    assert bt.total_windows == 3
    assert bt.best_return_pct == pytest.approx(25.0)
    assert bt.best_final_amount == pytest.approx(1_250_000.0)
    assert bt.worst_return_pct == pytest.approx(0.0)
    assert bt.worst_final_amount == pytest.approx(1_000_000.0)
    assert bt.median_return_pct == pytest.approx(20.0)
    assert bt.median_final_amount == pytest.approx(1_200_000.0)
    assert bt.no_upside_windows_pct == pytest.approx(100.0 * 1 / 3, abs=0.1)


# Test 10: Missing or too-short data returns a 4xx error, never numbers
def test_cpn_test_10_missing_or_short_data():
    # 1. Non-existent underlying -> 404
    resp_404 = client.post(
        "/api/cpn/backtest",
        json={
            "underlying": "NON_EXISTENT_TICKER",
            "investment": 1_000_000,
            "tenor_years": 1.0,
            "protection_pct": 100.0,
            "participation_pct": 100.0,
        },
    )
    assert resp_404.status_code == 404

    # 2. Too short data (e.g. hand-made 1 row) -> 422
    df_short = pd.DataFrame({"date": ["2020-01-01"], "close": [100.0]})
    prod = CpnProductInput(
        investment=1_000_000,
        tenor_years=1.0,
        protection_pct=100.0,
        participation_pct=100.0,
    )
    with pytest.raises(Exception) as excinfo:
        run_cpn_backtest(prod, df=df_short)
    assert "Insufficient price history" in str(excinfo.value) or "too short" in str(excinfo.value)


# Test 11: Validation rejects protection 70, participation 0 and an unsupported tenor
def test_cpn_test_11_validation():
    # protection 70 (must be 80-100)
    resp1 = client.post(
        "/api/cpn/payoff",
        json={
            "underlying": "NIFTY50",
            "investment": 1_000_000,
            "tenor_years": 1.0,
            "protection_pct": 70.0,
            "participation_pct": 100.0,
        },
    )
    assert resp1.status_code == 422

    # participation 0 (must be 10-150)
    resp2 = client.post(
        "/api/cpn/payoff",
        json={
            "underlying": "NIFTY50",
            "investment": 1_000_000,
            "tenor_years": 1.0,
            "protection_pct": 100.0,
            "participation_pct": 0.0,
        },
    )
    assert resp2.status_code == 422

    # unsupported tenor (e.g. 4.0; allowed: 0.5, 1, 2, 3, 5)
    resp3 = client.post(
        "/api/cpn/payoff",
        json={
            "underlying": "NIFTY50",
            "investment": 1_000_000,
            "tenor_years": 4.0,
            "protection_pct": 100.0,
            "participation_pct": 100.0,
        },
    )
    assert resp3.status_code == 422


# Test 12: Suitability with a CPN: protection 100 has max_principal_loss_pct 0 and passes the loss check for a 5% tolerance client; protection 80 has max_principal_loss_pct 20 and fails it for the same client; the loss flag names the measure that drove it
def test_cpn_test_12_suitability():
    # Client with 5% loss tolerance
    client_5pct = ClientProfile(
        client_id="CLI-TEST-05",
        client_name="Cautious Retiree",
        risk_appetite="CONSERVATIVE",
        investment_horizon_months=36,
        max_acceptable_loss_pct=5.0,
        total_portfolio_value=10_000_000,
        proposed_investment_amount=1_000_000,
        liquidity_requirement_months=12,
    )

    # CPN 100% protection
    prod_100 = ProductRiskCharacteristics(
        product_type="CPN",
        product_reference="CPN-NIFTY50-100",
        tenor_years=1.0,
        underlying_asset="NIFTY50",
        issuer="AstraForge Bank",
        principal_protection_pct=100.0,
    )
    req_100 = SuitabilityRequest(client=client_5pct, product_risk=prod_100)
    res_100 = run_suitability_assessment(req_100)

    # Check loss tolerance factor: should MATCH / PASS
    loss_factor_100 = next(c for c in res_100.checks if c.type == "loss_tolerance")
    assert loss_factor_100.status == "PASS"

    # CPN 80% protection -> max_principal_loss_pct = 20%
    prod_80 = ProductRiskCharacteristics(
        product_type="CPN",
        product_reference="CPN-NIFTY50-80",
        tenor_years=1.0,
        underlying_asset="NIFTY50",
        issuer="AstraForge Bank",
        principal_protection_pct=80.0,
    )
    req_80 = SuitabilityRequest(client=client_5pct, product_risk=prod_80)
    res_80 = run_suitability_assessment(req_80)

    # Check loss tolerance factor: should MISMATCH
    loss_factor_80 = next(c for c in res_80.checks if c.type == "loss_tolerance")
    assert loss_factor_80.status == "MISMATCH"
    assert "20" in loss_factor_80.reason or loss_factor_80.product_value == 20.0


# Test 13: Regression: the ELN and DCD suitability results for the same inputs are identical before and after your change
def test_cpn_test_13_regression_eln_dcd():
    client_prof = ClientProfile(
        client_id="CLI-REG-01",
        client_name="Moderate Client",
        risk_appetite="MODERATE",
        investment_horizon_months=24,
        max_acceptable_loss_pct=25.0,
        total_portfolio_value=10_000_000,
        proposed_investment_amount=1_000_000,
        liquidity_requirement_months=12,
    )

    eln_prod = ProductRiskCharacteristics(
        product_type="ELN",
        product_reference="ELN-NIFTY50-90-70",
        tenor_years=1.0,
        underlying_asset="NIFTY50",
        issuer="AstraForge Bank",
        coupon_pct_pa=12.0,
        max_contractual_loss_pct=100.0,
    )
    req_eln = SuitabilityRequest(client=client_prof, product_risk=eln_prod)
    res_eln = run_suitability_assessment(req_eln)
    assert res_eln.overall_status in ["suitable", "suitable_with_warnings", "review_required"]
    eln_loss_check = next(c for c in res_eln.checks if c.type == "loss_tolerance")
    assert eln_loss_check.status == "MISMATCH"  # 100% loss exceeds 25% tolerance

    dcd_prod = ProductRiskCharacteristics(
        product_type="DCD",
        product_reference="DCD-USDINR",
        tenor_years=0.5,
        underlying_asset="USDINR",
        issuer="AstraForge Bank",
        currency_conversion_risk=True,
        max_contractual_loss_pct=20.0,
    )
    req_dcd = SuitabilityRequest(client=client_prof, product_risk=dcd_prod)
    res_dcd = run_suitability_assessment(req_dcd)
    assert res_dcd.overall_status in ["suitable", "suitable_with_warnings", "review_required"]
    dcd_loss_check = next(c for c in res_dcd.checks if c.type == "loss_tolerance")
    assert dcd_loss_check.status == "PASS"  # 20% loss within 25% tolerance

