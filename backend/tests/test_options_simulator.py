import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.options.schemas import (
    OptionType,
    PositionType,
    OptionsSimulationRequest,
)
from app.options.payoff import (
    calculate_option_payoff_single,
    calculate_break_even,
    calculate_max_profit_loss,
    validate_option_inputs,
    simulate_options,
)

client = TestClient(app)


# -------------------------------------------------------------
# 1. CORE PAYOFF & INTRINSIC CALCULATIONS
# -------------------------------------------------------------

def test_long_call_payoff_and_pl():
    """
    Long Call:
    Strike = 100, Premium = 5, Q = 2, M = 100 (Total Premium = 1,000)
    - At S = 120 (ITM): Intrinsic = 20, Payoff = 20 * 200 = 4,000, P/L = 3,000, Return = +300%
    - At S = 105 (Break-Even): Intrinsic = 5, Payoff = 1,000, P/L = 0, Return = 0%
    - At S = 100 (ATM): Intrinsic = 0, Payoff = 0, P/L = -1,000, Return = -100%
    - At S = 80 (OTM): Intrinsic = 0, Payoff = 0, P/L = -1,000, Return = -100%
    """
    # ITM
    res_itm = calculate_option_payoff_single(
        s=120.0, strike_price=100.0, premium=5.0, quantity=2.0, multiplier=100.0,
        option_type=OptionType.CALL, position=PositionType.LONG
    )
    assert res_itm["intrinsic_value"] == 20.0
    assert res_itm["payoff"] == 4000.0
    assert res_itm["profit_loss"] == 3000.0
    assert res_itm["return_pct"] == 300.0

    # Break-Even
    res_be = calculate_option_payoff_single(
        s=105.0, strike_price=100.0, premium=5.0, quantity=2.0, multiplier=100.0,
        option_type=OptionType.CALL, position=PositionType.LONG
    )
    assert res_be["intrinsic_value"] == 5.0
    assert res_be["payoff"] == 1000.0
    assert res_be["profit_loss"] == 0.0
    assert res_be["return_pct"] == 0.0

    # ATM
    res_atm = calculate_option_payoff_single(
        s=100.0, strike_price=100.0, premium=5.0, quantity=2.0, multiplier=100.0,
        option_type=OptionType.CALL, position=PositionType.LONG
    )
    assert res_atm["intrinsic_value"] == 0.0
    assert res_atm["payoff"] == 0.0
    assert res_atm["profit_loss"] == -1000.0
    assert res_atm["return_pct"] == -100.0

    # OTM
    res_otm = calculate_option_payoff_single(
        s=80.0, strike_price=100.0, premium=5.0, quantity=2.0, multiplier=100.0,
        option_type=OptionType.CALL, position=PositionType.LONG
    )
    assert res_otm["intrinsic_value"] == 0.0
    assert res_otm["payoff"] == 0.0
    assert res_otm["profit_loss"] == -1000.0
    assert res_otm["return_pct"] == -100.0


def test_short_call_payoff_and_pl():
    """
    Short Call is exactly the negative P/L of Long Call.
    Strike = 100, Premium = 5, Q = 2, M = 100
    - At S = 120 (ITM): Payoff = -4,000, P/L = -3,000
    - At S = 105 (BE): Payoff = -1,000, P/L = 0
    - At S = 90 (OTM): Payoff = 0, P/L = +1,000 (seller keeps premium)
    """
    res_itm = calculate_option_payoff_single(
        s=120.0, strike_price=100.0, premium=5.0, quantity=2.0, multiplier=100.0,
        option_type=OptionType.CALL, position=PositionType.SHORT
    )
    assert res_itm["payoff"] == -4000.0
    assert res_itm["profit_loss"] == -3000.0
    assert res_itm["return_pct"] == -300.0

    res_otm = calculate_option_payoff_single(
        s=90.0, strike_price=100.0, premium=5.0, quantity=2.0, multiplier=100.0,
        option_type=OptionType.CALL, position=PositionType.SHORT
    )
    assert res_otm["payoff"] == 0.0
    assert res_otm["profit_loss"] == 1000.0
    assert res_otm["return_pct"] == 100.0


def test_long_put_payoff_and_pl():
    """
    Long Put:
    Strike = 100, Premium = 7, Q = 1, M = 100 (Total Premium = 700)
    - At S = 80 (ITM): Intrinsic = 20, Payoff = 2,000, P/L = 1,300, Return = ~185.71%
    - At S = 93 (BE): Intrinsic = 7, Payoff = 700, P/L = 0, Return = 0%
    - At S = 100 (ATM): Intrinsic = 0, Payoff = 0, P/L = -700, Return = -100%
    - At S = 120 (OTM): Intrinsic = 0, Payoff = 0, P/L = -700, Return = -100%
    """
    res_itm = calculate_option_payoff_single(
        s=80.0, strike_price=100.0, premium=7.0, quantity=1.0, multiplier=100.0,
        option_type=OptionType.PUT, position=PositionType.LONG
    )
    assert res_itm["intrinsic_value"] == 20.0
    assert res_itm["payoff"] == 2000.0
    assert res_itm["profit_loss"] == 1300.0
    assert round(res_itm["return_pct"], 2) == 185.71

    res_be = calculate_option_payoff_single(
        s=93.0, strike_price=100.0, premium=7.0, quantity=1.0, multiplier=100.0,
        option_type=OptionType.PUT, position=PositionType.LONG
    )
    assert res_be["intrinsic_value"] == 7.0
    assert res_be["profit_loss"] == 0.0
    assert res_be["return_pct"] == 0.0

    res_atm = calculate_option_payoff_single(
        s=100.0, strike_price=100.0, premium=7.0, quantity=1.0, multiplier=100.0,
        option_type=OptionType.PUT, position=PositionType.LONG
    )
    assert res_atm["intrinsic_value"] == 0.0
    assert res_atm["payoff"] == 0.0
    assert res_atm["profit_loss"] == -700.0

    res_otm = calculate_option_payoff_single(
        s=120.0, strike_price=100.0, premium=7.0, quantity=1.0, multiplier=100.0,
        option_type=OptionType.PUT, position=PositionType.LONG
    )
    assert res_otm["intrinsic_value"] == 0.0
    assert res_otm["payoff"] == 0.0
    assert res_otm["profit_loss"] == -700.0


def test_short_put_payoff_and_pl():
    """
    Short Put:
    Strike = 100, Premium = 7, Q = 1, M = 100
    - At S = 80: Payoff = -2,000, P/L = -1,300
    - At S = 93: Payoff = -700, P/L = 0
    - At S = 110: Payoff = 0, P/L = +700
    """
    res_itm = calculate_option_payoff_single(
        s=80.0, strike_price=100.0, premium=7.0, quantity=1.0, multiplier=100.0,
        option_type=OptionType.PUT, position=PositionType.SHORT
    )
    assert res_itm["payoff"] == -2000.0
    assert res_itm["profit_loss"] == -1300.0

    res_otm = calculate_option_payoff_single(
        s=110.0, strike_price=100.0, premium=7.0, quantity=1.0, multiplier=100.0,
        option_type=OptionType.PUT, position=PositionType.SHORT
    )
    assert res_otm["payoff"] == 0.0
    assert res_otm["profit_loss"] == 700.0
    assert res_otm["return_pct"] == 100.0


# -------------------------------------------------------------
# 2. BREAK-EVEN & MAX PROFIT / LOSS
# -------------------------------------------------------------

def test_break_even_calculations():
    # Call Break-Even = Strike + Premium
    assert calculate_break_even(100.0, 5.5, OptionType.CALL) == 105.5
    # Put Break-Even = Strike - Premium
    assert calculate_break_even(100.0, 5.5, OptionType.PUT) == 94.5


def test_max_gain_and_loss_behavior():
    # Long Call: Max Profit is Unlimited (None), Max Loss is Premium
    max_p, l_p, max_l, l_l = calculate_max_profit_loss(
        strike_price=100.0, premium=10.0, quantity=2.0, multiplier=100.0,
        option_type=OptionType.CALL, position=PositionType.LONG
    )
    assert max_p is None
    assert l_p == "Unlimited"
    assert max_l == 2000.0
    assert "2,000.00" in l_l

    # Short Call: Max Profit is Premium, Max Loss is Unlimited
    max_p, l_p, max_l, l_l = calculate_max_profit_loss(
        strike_price=100.0, premium=10.0, quantity=2.0, multiplier=100.0,
        option_type=OptionType.CALL, position=PositionType.SHORT
    )
    assert max_p == 2000.0
    assert max_l is None
    assert l_l == "Unlimited"

    # Long Put: Max Profit at S=0 is (K - P) * Q * M, Max Loss is Premium
    max_p, l_p, max_l, l_l = calculate_max_profit_loss(
        strike_price=100.0, premium=10.0, quantity=1.0, multiplier=100.0,
        option_type=OptionType.PUT, position=PositionType.LONG
    )
    assert max_p == 9000.0  # (100 - 10) * 100
    assert max_l == 1000.0

    # Short Put: Max Profit is Premium, Max Loss at S=0 is (K - P) * Q * M
    max_p, l_p, max_l, l_l = calculate_max_profit_loss(
        strike_price=100.0, premium=10.0, quantity=1.0, multiplier=100.0,
        option_type=OptionType.PUT, position=PositionType.SHORT
    )
    assert max_p == 1000.0
    assert max_l == 9000.0


# -------------------------------------------------------------
# 3. INPUT VALIDATION & EDGE CASES
# -------------------------------------------------------------

def test_validation_rejects_invalid_inputs():
    with pytest.raises(ValueError, match="strictly positive"):
        validate_option_inputs(
            underlying_price=0.0, strike_price=100.0, premium=5.0, quantity=1.0,
            multiplier=100.0, option_type="CALL", position="LONG"
        )

    with pytest.raises(ValueError, match="strictly positive"):
        validate_option_inputs(
            underlying_price=100.0, strike_price=-10.0, premium=5.0, quantity=1.0,
            multiplier=100.0, option_type="CALL", position="LONG"
        )

    with pytest.raises(ValueError, match="non-negative"):
        validate_option_inputs(
            underlying_price=100.0, strike_price=100.0, premium=-1.0, quantity=1.0,
            multiplier=100.0, option_type="CALL", position="LONG"
        )

    with pytest.raises(ValueError, match="strictly positive"):
        validate_option_inputs(
            underlying_price=100.0, strike_price=100.0, premium=5.0, quantity=0.0,
            multiplier=100.0, option_type="CALL", position="LONG"
        )

    with pytest.raises(ValueError, match="strictly positive"):
        validate_option_inputs(
            underlying_price=100.0, strike_price=100.0, premium=5.0, quantity=1.0,
            multiplier=-50.0, option_type="CALL", position="LONG"
        )

    with pytest.raises(ValueError, match="Invalid option_type"):
        validate_option_inputs(
            underlying_price=100.0, strike_price=100.0, premium=5.0, quantity=1.0,
            multiplier=100.0, option_type="STRADDLE", position="LONG"
        )

    with pytest.raises(ValueError, match="Invalid position"):
        validate_option_inputs(
            underlying_price=100.0, strike_price=100.0, premium=5.0, quantity=1.0,
            multiplier=100.0, option_type="CALL", position="MIDDLE"
        )


def test_zero_premium_edge_case():
    """When premium is zero, P/L equals Payoff and return_pct handles division safely."""
    res = calculate_option_payoff_single(
        s=120.0, strike_price=100.0, premium=0.0, quantity=1.0, multiplier=100.0,
        option_type=OptionType.CALL, position=PositionType.LONG
    )
    assert res["intrinsic_value"] == 20.0
    assert res["payoff"] == 2000.0
    assert res["profit_loss"] == 2000.0
    assert res["return_pct"] == 0.0  # safe zero division handling


# -------------------------------------------------------------
# 4. FULL SIMULATION AND ENDPOINT INTEGRATION
# -------------------------------------------------------------

def test_full_options_simulation_flow():
    req = OptionsSimulationRequest(
        underlying_price=22000.0,
        strike_price=22500.0,
        premium=150.0,
        quantity=5.0,
        multiplier=50.0,
        expiry_date="2026-10-30",
        option_type=OptionType.CALL,
        position=PositionType.LONG,
    )
    sim = simulate_options(req)

    assert sim.total_premium == 150.0 * 5.0 * 50.0  # 37,500
    assert sim.break_even_price == 22650.0
    assert sim.max_profit is None
    assert sim.max_loss == 37500.0
    assert len(sim.scenarios) > 5
    assert len(sim.curve) > 20
    assert "Simplified Expiry-Payoff Model" in sim.assumptions_and_warnings


def test_options_api_endpoint():
    payload = {
        "underlying_price": 22000.0,
        "strike_price": 22000.0,
        "premium": 180.0,
        "quantity": 2.0,
        "multiplier": 50.0,
        "expiry_date": "2026-11-15",
        "option_type": "PUT",
        "position": "SHORT",
    }
    response = client.post("/api/options/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["option_type"] == "PUT"
    assert data["position"] == "SHORT"
    assert data["break_even_price"] == 21820.0  # 22000 - 180
    assert data["max_profit"] == 18000.0       # 180 * 2 * 50
    assert len(data["scenarios"]) >= 5
    assert len(data["curve"]) >= 20
    assert "Simplified Expiry-Payoff Model" in data["assumptions_and_warnings"]


def test_options_api_rejects_invalid_strike():
    payload = {
        "underlying_price": 22000.0,
        "strike_price": -50.0,
        "premium": 180.0,
        "quantity": 2.0,
        "multiplier": 50.0,
        "expiry_date": "2026-11-15",
        "option_type": "CALL",
        "position": "LONG",
    }
    response = client.post("/api/options/simulate", json=payload)
    assert response.status_code == 422
