import pytest
from pydantic import ValidationError
from app.phase2_models import (
    ElnPayoffRequest, DcdPayoffRequest, CpnPayoffRequest
)
from app.phase2_engines import (
    calculate_eln_payoff, calculate_dcd_payoff, calculate_cpn_payoff
)

# --- ELN Tests ---
def test_eln_barrier_never_breached_above_strike():
    req = ElnPayoffRequest(
        investment=1_000_000, initial_price=100, final_price=110,
        strike_pct=90, barrier_pct=70, coupon_pct_pa=10, tenor_years=1,
        barrier_breached=False, barrier_monitoring="daily", settlement_method="cash"
    )
    res = calculate_eln_payoff(req)
    assert res.principal_repayment == 1_000_000
    assert res.coupon_earned == 100_000
    assert res.total_maturity_value == 1_100_000

def test_eln_barrier_never_breached_below_strike():
    req = ElnPayoffRequest(
        investment=1_000_000, initial_price=100, final_price=80,
        strike_pct=90, barrier_pct=70, coupon_pct_pa=10, tenor_years=1,
        barrier_breached=False, barrier_monitoring="daily", settlement_method="cash"
    )
    res = calculate_eln_payoff(req)
    assert res.principal_repayment == 1_000_000
    assert res.coupon_earned == 0

def test_eln_barrier_breached_above_strike():
    req = ElnPayoffRequest(
        investment=1_000_000, initial_price=100, final_price=110,
        strike_pct=90, barrier_pct=70, coupon_pct_pa=10, tenor_years=1,
        barrier_breached=True, barrier_monitoring="daily", settlement_method="cash"
    )
    res = calculate_eln_payoff(req)
    # Principal proportional to performance = 1M * (110/100) = 1.1M
    assert res.principal_repayment == 1_100_000
    assert res.coupon_earned == 0

def test_eln_barrier_breached_below_strike():
    req = ElnPayoffRequest(
        investment=1_000_000, initial_price=100, final_price=60,
        strike_pct=90, barrier_pct=70, coupon_pct_pa=10, tenor_years=1,
        barrier_breached=True, barrier_monitoring="daily", settlement_method="cash"
    )
    res = calculate_eln_payoff(req)
    # Principal proportional = 1M * (60/100) = 600K
    assert res.principal_repayment == 600_000
    assert res.coupon_earned == 0

def test_eln_invalid_barrier_strike():
    with pytest.raises(ValidationError):
        ElnPayoffRequest(
            investment=1_000_000, initial_price=100, final_price=110,
            strike_pct=70, barrier_pct=90, coupon_pct_pa=10, tenor_years=1,
            barrier_breached=False, barrier_monitoring="daily", settlement_method="cash"
        )

def test_eln_invalid_investment():
    with pytest.raises(ValidationError):
        ElnPayoffRequest(
            investment=-500, initial_price=100, final_price=110,
            strike_pct=90, barrier_pct=70, coupon_pct_pa=10, tenor_years=1,
            barrier_breached=False, barrier_monitoring="daily", settlement_method="cash"
        )

# --- DCD Tests ---
def test_dcd_conversion_condition_satisfied_above():
    req = DcdPayoffRequest(
        deposit_currency="INR", alternate_currency="USD", deposit_amount=100_000,
        initial_fx_rate=83.0, conversion_strike_rate=84.0, maturity_fx_rate=85.0,
        coupon_rate=5.0, tenor_years=1.0, conversion_condition="FX_AT_OR_ABOVE_STRIKE"
    )
    res = calculate_dcd_payoff(req)
    assert res.conversion_occurred is True
    assert res.principal_repayment_amount == 100_000 * 84.0
    assert res.repayment_currency == "USD"
    assert res.coupon_amount == 5_000
    assert res.coupon_currency == "INR"

def test_dcd_conversion_condition_not_satisfied_above():
    req = DcdPayoffRequest(
        deposit_currency="INR", alternate_currency="USD", deposit_amount=100_000,
        initial_fx_rate=83.0, conversion_strike_rate=84.0, maturity_fx_rate=82.0,
        coupon_rate=5.0, tenor_years=1.0, conversion_condition="FX_AT_OR_ABOVE_STRIKE"
    )
    res = calculate_dcd_payoff(req)
    assert res.conversion_occurred is False
    assert res.principal_repayment_amount == 100_000
    assert res.repayment_currency == "INR"
    assert res.coupon_amount == 5_000

def test_dcd_conversion_condition_satisfied_below():
    req = DcdPayoffRequest(
        deposit_currency="USD", alternate_currency="EUR", deposit_amount=10_000,
        initial_fx_rate=1.10, conversion_strike_rate=1.05, maturity_fx_rate=1.04,
        coupon_rate=2.0, tenor_years=0.5, conversion_condition="FX_AT_OR_BELOW_STRIKE"
    )
    res = calculate_dcd_payoff(req)
    assert res.conversion_occurred is True
    assert res.principal_repayment_amount == 10_000 * 1.05
    assert res.repayment_currency == "EUR"
    assert res.coupon_amount == 100

def test_dcd_same_currency_invalid():
    with pytest.raises(ValidationError):
        DcdPayoffRequest(
            deposit_currency="INR", alternate_currency="inr", deposit_amount=100_000,
            initial_fx_rate=83.0, conversion_strike_rate=84.0, maturity_fx_rate=85.0,
            coupon_rate=5.0, tenor_years=1.0, conversion_condition="FX_AT_OR_ABOVE_STRIKE"
        )

def test_dcd_invalid_fx():
    with pytest.raises(ValidationError):
        DcdPayoffRequest(
            deposit_currency="INR", alternate_currency="USD", deposit_amount=100_000,
            initial_fx_rate=0, conversion_strike_rate=84.0, maturity_fx_rate=85.0,
            coupon_rate=5.0, tenor_years=1.0, conversion_condition="FX_AT_OR_ABOVE_STRIKE"
        )

# --- CPN Tests ---
def test_cpn_underlying_increases():
    req = CpnPayoffRequest(
        investment=100_000, initial_price=100, final_price=120,
        protection_pct=100, participation_rate=80, upside_cap_pct=None,
        coupon_rate=None, tenor_years=1
    )
    res = calculate_cpn_payoff(req)
    assert res.protected_principal == 100_000
    assert res.participation_gain == 100_000 * 0.8 * 0.2
    assert res.total_maturity_value == 100_000 + 16_000

def test_cpn_underlying_decreases():
    req = CpnPayoffRequest(
        investment=100_000, initial_price=100, final_price=80,
        protection_pct=100, participation_rate=80, upside_cap_pct=None,
        coupon_rate=None, tenor_years=1
    )
    res = calculate_cpn_payoff(req)
    assert res.protected_principal == 100_000
    assert res.participation_gain == 0
    assert res.total_maturity_value == 100_000

def test_cpn_partial_protection():
    req = CpnPayoffRequest(
        investment=100_000, initial_price=100, final_price=80,
        protection_pct=90, participation_rate=100, upside_cap_pct=None,
        coupon_rate=None, tenor_years=1
    )
    res = calculate_cpn_payoff(req)
    assert res.protected_principal == 90_000
    assert res.participation_gain == 0
    assert res.total_maturity_value == 90_000

def test_cpn_upside_cap():
    req = CpnPayoffRequest(
        investment=100_000, initial_price=100, final_price=150,
        protection_pct=100, participation_rate=100, upside_cap_pct=20,
        coupon_rate=None, tenor_years=1
    )
    res = calculate_cpn_payoff(req)
    assert res.participation_gain == 20_000 # Capped at 20%
    assert res.total_maturity_value == 120_000

def test_cpn_optional_coupon():
    req = CpnPayoffRequest(
        investment=100_000, initial_price=100, final_price=100,
        protection_pct=100, participation_rate=50, upside_cap_pct=None,
        coupon_rate=2.0, tenor_years=2.0
    )
    res = calculate_cpn_payoff(req)
    assert res.coupon == 4_000
    assert res.total_maturity_value == 104_000

def test_cpn_invalid_protection():
    with pytest.raises(ValidationError):
        CpnPayoffRequest(
            investment=100_000, initial_price=100, final_price=100,
            protection_pct=105, participation_rate=50, upside_cap_pct=None,
            coupon_rate=None, tenor_years=1
        )
