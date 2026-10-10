import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.debenture.schemas import DebentureRequest
from app.debenture.engine import (
    calculate_debenture,
    calculate_pv,
    calculate_ytm,
    calculate_duration,
    validate_debenture_inputs,
)

client = TestClient(app)


# -------------------------------------------------------------
# 1. COUPON CALCULATIONS & CASH FLOWS
# -------------------------------------------------------------

def test_periodic_and_total_coupons():
    """
    Face Value = 100,000, Coupon = 8.0%, Frequency = Semi-Annual (2), Tenor = 5 years
    - N = 10 periods
    - Periodic coupon = 100,000 * 0.08 / 2 = 4,000
    - Total coupons = 10 * 4,000 = 40,000
    - Total cash flows = 40,000 + 100,000 = 140,000
    """
    req = DebentureRequest(
        face_value=100000.0,
        purchase_price=100000.0,
        coupon_rate_pct=8.0,
        frequency=2,
        years_to_maturity=5.0,
        redemption_value=100000.0,
        market_yield_pct=8.0,
    )
    res = calculate_debenture(req)

    assert res.total_periods == 10
    assert res.periodic_coupon == 4000.0
    assert res.total_coupons == 40000.0
    assert res.redemption_value == 100000.0
    assert res.total_cash_flows == 140000.0
    assert len(res.cash_flows) == 10
    assert res.cash_flows[-1].total_cash_flow == 104000.0


def test_quarterly_and_annual_frequencies():
    # Annual: 10,000 Face, 10% coupon, 3 years => 3 periods, 1,000 per period
    req_ann = DebentureRequest(
        face_value=10000.0,
        purchase_price=10000.0,
        coupon_rate_pct=10.0,
        frequency=1,
        years_to_maturity=3.0,
    )
    res_ann = calculate_debenture(req_ann)
    assert res_ann.total_periods == 3
    assert res_ann.periodic_coupon == 1000.0
    assert res_ann.total_coupons == 3000.0

    # Quarterly: 10,000 Face, 10% coupon, 2 years => 8 periods, 250 per period
    req_qtr = DebentureRequest(
        face_value=10000.0,
        purchase_price=10000.0,
        coupon_rate_pct=10.0,
        frequency=4,
        years_to_maturity=2.0,
    )
    res_qtr = calculate_debenture(req_qtr)
    assert res_qtr.total_periods == 8
    assert res_qtr.periodic_coupon == 250.0
    assert res_qtr.total_coupons == 2000.0


# -------------------------------------------------------------
# 2. YTM & PRICING (PAR, DISCOUNT, PREMIUM, ZERO-COUPON)
# -------------------------------------------------------------

def test_par_bond_ytm_and_pv():
    """When purchase price == face value == redemption value, nominal YTM == coupon rate."""
    req = DebentureRequest(
        face_value=1000.0,
        purchase_price=1000.0,
        coupon_rate_pct=7.5,
        frequency=2,
        years_to_maturity=4.0,
        market_yield_pct=7.5,
    )
    res = calculate_debenture(req)

    assert round(res.ytm_purchase_price_pct, 2) == 7.50
    assert round(res.present_value_market_yield, 2) == 1000.0
    assert res.pricing_status == "Par"
    assert res.premium_discount_amount == 0.0


def test_discount_bond_ytm_and_pricing():
    """
    When purchased at a discount (P < F), YTM > Coupon Rate.
    Face = 1,000, Price = 950, Coupon = 6%, Tenor = 3 yrs, Annual
    """
    req = DebentureRequest(
        face_value=1000.0,
        purchase_price=950.0,
        coupon_rate_pct=6.0,
        frequency=1,
        years_to_maturity=3.0,
        market_yield_pct=6.0,
    )
    res = calculate_debenture(req)

    assert res.pricing_status == "Discount"
    assert res.premium_discount_amount == -50.0
    assert res.ytm_purchase_price_pct > 6.0  # Approx 7.95%
    assert round(res.current_yield_pct, 2) == round(60.0 / 950.0 * 100.0, 2)


def test_premium_bond_ytm_and_pricing():
    """
    When purchased at a premium (P > F), YTM < Coupon Rate.
    Face = 1,000, Price = 1,050, Coupon = 8%, Tenor = 5 yrs, Semi-annual
    """
    req = DebentureRequest(
        face_value=1000.0,
        purchase_price=1050.0,
        coupon_rate_pct=8.0,
        frequency=2,
        years_to_maturity=5.0,
        market_yield_pct=8.0,
    )
    res = calculate_debenture(req)

    assert res.pricing_status == "Premium"
    assert res.premium_discount_amount == 50.0
    assert res.ytm_purchase_price_pct < 8.0


def test_zero_coupon_debenture_ytm():
    """Zero coupon bond: P = 800, F = 1000, T = 2 years, Annual."""
    nominal, ear = calculate_ytm(
        purchase_price=800.0,
        c=0.0,
        n=2,
        m=1,
        redemption=1000.0,
    )
    # 800 * (1 + r)^2 = 1000 => r = sqrt(1.25) - 1 = 11.8034%
    assert round(nominal, 2) == 11.80
    assert round(ear, 2) == 11.80


# -------------------------------------------------------------
# 3. YIELD SENSITIVITY & DURATION
# -------------------------------------------------------------

def test_yield_sensitivity_relationship():
    """Bond price is inversely related to market yield."""
    req = DebentureRequest(
        face_value=1000.0,
        purchase_price=1000.0,
        coupon_rate_pct=8.0,
        frequency=2,
        years_to_maturity=5.0,
        market_yield_pct=8.0,
    )
    res = calculate_debenture(req)

    # Scenarios: lower yield -> higher price; higher yield -> lower price
    pv_down_shock = next(s for s in res.scenarios if s.shock_bps == -100.0)
    pv_base = next(s for s in res.scenarios if s.shock_bps == 0.0)
    pv_up_shock = next(s for s in res.scenarios if s.shock_bps == 100.0)

    assert pv_down_shock.present_value > pv_base.present_value
    assert pv_up_shock.present_value < pv_base.present_value
    assert res.macaulay_duration_years > 0.0
    assert res.modified_duration > 0.0


# -------------------------------------------------------------
# 4. INPUT VALIDATION & ERROR HANDLING
# -------------------------------------------------------------

def test_invalid_inputs_rejected():
    with pytest.raises(ValueError, match="strictly positive"):
        validate_debenture_inputs(
            face_value=-1000.0, purchase_price=1000.0, coupon_rate_pct=8.0,
            frequency=2, years_to_maturity=5.0
        )

    with pytest.raises(ValueError, match="Frequency must be 1, 2, 4, or 12"):
        validate_debenture_inputs(
            face_value=1000.0, purchase_price=1000.0, coupon_rate_pct=8.0,
            frequency=3, years_to_maturity=5.0
        )

    with pytest.raises(ValueError, match="non-negative"):
        validate_debenture_inputs(
            face_value=1000.0, purchase_price=1000.0, coupon_rate_pct=-5.0,
            frequency=2, years_to_maturity=5.0
        )

    with pytest.raises(ValueError, match="strictly positive"):
        validate_debenture_inputs(
            face_value=1000.0, purchase_price=1000.0, coupon_rate_pct=8.0,
            frequency=2, years_to_maturity=0.0
        )


# -------------------------------------------------------------
# 5. API ENDPOINT INTEGRATION
# -------------------------------------------------------------

def test_debenture_api_endpoint():
    payload = {
        "face_value": 100000.0,
        "purchase_price": 98500.0,
        "coupon_rate_pct": 9.25,
        "frequency": 2,
        "years_to_maturity": 4.0,
        "market_yield_pct": 9.0,
    }
    response = client.post("/api/debenture/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["face_value"] == 100000.0
    assert data["pricing_status"] == "Discount"
    assert data["total_periods"] == 8
    assert data["periodic_coupon"] == 4625.0
    assert len(data["cash_flows"]) == 8
    assert len(data["scenarios"]) >= 5
    assert len(data["curve"]) >= 20
    assert "Standard Fixed-Rate Bullet Debenture" in data["assumptions_and_disclaimers"]


def test_debenture_api_validation_error():
    payload = {
        "face_value": 100000.0,
        "purchase_price": 98500.0,
        "coupon_rate_pct": 9.25,
        "frequency": 5,  # Invalid frequency
        "years_to_maturity": 4.0,
    }
    response = client.post("/api/debenture/simulate", json=payload)
    assert response.status_code == 422
