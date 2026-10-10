from __future__ import annotations

import math
from typing import List, Optional, Tuple, Dict, Any
from app.options.schemas import (
    OptionType,
    PositionType,
    OptionsSimulationRequest,
    OptionsSimulationResponse,
    OptionScenarioItem,
    OptionCurvePoint,
)

ASSUMPTIONS_AND_WARNINGS = (
    "Simplified Expiry-Payoff Model: This tool models European-style option payoff and net profit/loss "
    "strictly at expiration (terminal intrinsic value). It is NOT a full options pricing engine (e.g. Black-Scholes, "
    "Binomial, or Monte Carlo). It does not reflect market factors prior to expiry, including time decay (Theta), "
    "implied volatility fluctuations (Vega), interest rates (Rho), early exercise risk (American style), "
    "exchange margin requirements, borrowing costs, transaction fees, bid-ask spreads, or liquidity constraints."
)


def validate_option_inputs(
    underlying_price: float,
    strike_price: float,
    premium: float,
    quantity: float,
    multiplier: float,
    option_type: str | OptionType,
    position: str | PositionType,
) -> Tuple[OptionType, PositionType]:
    """Validate all numeric and enum inputs strictly, raising ValueError on any invalid input."""
    if underlying_price is None or underlying_price <= 0:
        raise ValueError("Underlying asset price must be strictly positive (> 0).")
    if strike_price is None or strike_price <= 0:
        raise ValueError("Strike price must be strictly positive (> 0).")
    if premium is None or premium < 0:
        raise ValueError("Option premium must be non-negative (>= 0).")
    if quantity is None or quantity <= 0:
        raise ValueError("Number of contracts (quantity) must be strictly positive (> 0).")
    if multiplier is None or multiplier <= 0:
        raise ValueError("Contract multiplier must be strictly positive (> 0).")

    # Validate option_type
    if isinstance(option_type, OptionType):
        opt_type = option_type
    else:
        opt_str = str(option_type).strip().upper()
        if opt_str in ("CALL", "PUT"):
            opt_type = OptionType(opt_str)
        else:
            raise ValueError(f"Invalid option_type: {option_type!r}. Must be 'CALL' or 'PUT'.")

    # Validate position
    if isinstance(position, PositionType):
        pos_type = position
    else:
        pos_str = str(position).strip().upper()
        if pos_str in ("LONG", "SHORT"):
            pos_type = PositionType(pos_str)
        else:
            raise ValueError(f"Invalid position: {position!r}. Must be 'LONG' or 'SHORT'.")

    return opt_type, pos_type


def calculate_break_even(strike_price: float, premium: float, option_type: OptionType) -> float:
    """
    Break-even price at expiry where Net Profit/Loss equals zero:
    - Call: Strike + Premium
    - Put: Strike - Premium
    """
    if option_type == OptionType.CALL:
        return round(strike_price + premium, 4)
    else:
        return round(strike_price - premium, 4)


def calculate_max_profit_loss(
    strike_price: float,
    premium: float,
    quantity: float,
    multiplier: float,
    option_type: OptionType,
    position: PositionType,
) -> Tuple[Optional[float], str, Optional[float], str]:
    """
    Calculate maximum profit and maximum loss for European options at expiry.
    Returns: (max_profit_val, max_profit_label, max_loss_val, max_loss_label)
    Where None indicates unbounded/unlimited gain or loss.
    """
    total_premium = premium * quantity * multiplier

    if option_type == OptionType.CALL:
        if position == PositionType.LONG:
            # Long Call: Max profit is unlimited (as S -> inf), Max loss is premium paid
            max_profit = None
            max_profit_label = "Unlimited"
            max_loss = round(total_premium, 2)
            max_loss_label = f"{max_loss:,.2f}"
        else:
            # Short Call: Max profit is premium received, Max loss is unlimited (as S -> inf)
            max_profit = round(total_premium, 2)
            max_profit_label = f"{max_profit:,.2f}"
            max_loss = None
            max_loss_label = "Unlimited"
    else:
        # PUT
        if position == PositionType.LONG:
            # Long Put: Max profit at S = 0 is (K - P) * Q * M, Max loss is premium paid
            max_profit_val = max(0.0, (strike_price - premium) * quantity * multiplier)
            max_profit = round(max_profit_val, 2)
            max_profit_label = f"{max_profit:,.2f}"
            max_loss = round(total_premium, 2)
            max_loss_label = f"{max_loss:,.2f}"
        else:
            # Short Put: Max profit is premium received, Max loss at S = 0 is (K - P) * Q * M
            max_profit = round(total_premium, 2)
            max_profit_label = f"{max_profit:,.2f}"
            max_loss_val = max(0.0, (strike_price - premium) * quantity * multiplier)
            max_loss = round(max_loss_val, 2)
            max_loss_label = f"{max_loss:,.2f}"

    return max_profit, max_profit_label, max_loss, max_loss_label


def calculate_option_payoff_single(
    s: float,
    strike_price: float,
    premium: float,
    quantity: float,
    multiplier: float,
    option_type: OptionType,
    position: PositionType,
) -> Dict[str, float]:
    """
    Compute intrinsic value, payoff, profit/loss, and return_pct for a single terminal price S.
    
    Formulas:
    - Call intrinsic value = max(S - K, 0)
    - Put intrinsic value = max(K - S, 0)
    - Long call P/L = (intrinsic value - premium) * quantity * multiplier
    - Long put P/L = (intrinsic value - premium) * quantity * multiplier
    - Short-position P/L = negative of the corresponding long-position P/L.
    """
    if option_type == OptionType.CALL:
        intrinsic = max(s - strike_price, 0.0)
    else:
        intrinsic = max(strike_price - s, 0.0)

    contract_size = quantity * multiplier
    total_premium = premium * contract_size

    if position == PositionType.LONG:
        payoff = intrinsic * contract_size
        profit_loss = (intrinsic - premium) * contract_size
    else:
        payoff = -intrinsic * contract_size
        profit_loss = (premium - intrinsic) * contract_size

    if total_premium > 0:
        return_pct = (profit_loss / total_premium) * 100.0
    else:
        return_pct = 0.0

    return {
        "intrinsic_value": round(intrinsic, 4),
        "payoff": round(payoff, 2),
        "profit_loss": round(profit_loss, 2),
        "return_pct": round(return_pct, 2),
    }


def determine_moneyness(s: float, k: float, option_type: OptionType) -> str:
    eps = 1e-4
    if abs(s - k) <= eps:
        return "ATM (At-The-Money)"
    if option_type == OptionType.CALL:
        return "ITM (In-The-Money)" if s > k else "OTM (Out-of-The-Money)"
    else:
        return "ITM (In-The-Money)" if s < k else "OTM (Out-of-The-Money)"


def generate_scenarios(
    underlying_price: float,
    strike_price: float,
    premium: float,
    quantity: float,
    multiplier: float,
    option_type: OptionType,
    position: PositionType,
    custom_scenarios: Optional[List[float]] = None,
    custom_shocks_pct: Optional[List[float]] = None,
) -> List[OptionScenarioItem]:
    """Generate scenario results for selected underlying prices."""
    break_even = calculate_break_even(strike_price, premium, option_type)

    prices_set = set()

    if custom_scenarios:
        for p in custom_scenarios:
            if p > 0:
                prices_set.add(round(float(p), 2))
    elif custom_shocks_pct:
        for sh in custom_shocks_pct:
            p = underlying_price * (1.0 + sh / 100.0)
            if p > 0:
                prices_set.add(round(float(p), 2))
    else:
        # Default standard shocks
        default_shocks = [-30.0, -20.0, -10.0, -5.0, 0.0, 5.0, 10.0, 20.0, 30.0]
        for sh in default_shocks:
            p = underlying_price * (1.0 + sh / 100.0)
            if p > 0:
                prices_set.add(round(float(p), 2))

    # Always ensure Strike, Break-Even (if > 0), and Spot are included
    prices_set.add(round(strike_price, 2))
    prices_set.add(round(underlying_price, 2))
    if break_even > 0:
        prices_set.add(round(break_even, 2))

    sorted_prices = sorted(list(prices_set))
    items: List[OptionScenarioItem] = []

    for s in sorted_prices:
        calc = calculate_option_payoff_single(
            s=s,
            strike_price=strike_price,
            premium=premium,
            quantity=quantity,
            multiplier=multiplier,
            option_type=option_type,
            position=position,
        )
        shock_pct = ((s - underlying_price) / underlying_price) * 100.0
        label = determine_moneyness(s, strike_price, option_type)

        items.append(
            OptionScenarioItem(
                underlying_price=round(s, 2),
                shock_pct=round(shock_pct, 2),
                intrinsic_value=calc["intrinsic_value"],
                payoff=calc["payoff"],
                profit_loss=calc["profit_loss"],
                return_pct=calc["return_pct"],
                outcome_label=label,
            )
        )

    return items


def generate_curve(
    underlying_price: float,
    strike_price: float,
    premium: float,
    quantity: float,
    multiplier: float,
    option_type: OptionType,
    position: PositionType,
    points_count: int = 80,
) -> List[OptionCurvePoint]:
    """Generate dense curve data points for smooth chart rendering."""
    break_even = calculate_break_even(strike_price, premium, option_type)
    
    # Range bounds
    ref_min = min(underlying_price, strike_price, break_even if break_even > 0 else strike_price)
    ref_max = max(underlying_price, strike_price, break_even if break_even > 0 else strike_price)

    min_s = max(0.01, ref_min * 0.6)
    max_s = ref_max * 1.4

    step = (max_s - min_s) / max(1, points_count - 1)
    prices = [min_s + i * step for i in range(points_count)]

    # Add critical anchor points
    anchors = [underlying_price, strike_price]
    if break_even > 0:
        anchors.append(break_even)
    prices.extend(anchors)
    prices = sorted(list(set(round(p, 2) for p in prices if p > 0)))

    curve: List[OptionCurvePoint] = []
    for s in prices:
        calc = calculate_option_payoff_single(
            s=s,
            strike_price=strike_price,
            premium=premium,
            quantity=quantity,
            multiplier=multiplier,
            option_type=option_type,
            position=position,
        )
        u_ret = ((s - underlying_price) / underlying_price) * 100.0
        curve.append(
            OptionCurvePoint(
                underlying_price=round(s, 2),
                underlying_return_pct=round(u_ret, 2),
                payoff=calc["payoff"],
                profit_loss=calc["profit_loss"],
                return_pct=calc["return_pct"],
            )
        )

    return curve


def simulate_options(req: OptionsSimulationRequest) -> OptionsSimulationResponse:
    """Execute complete options simulation from request."""
    opt_type, pos_type = validate_option_inputs(
        underlying_price=req.underlying_price,
        strike_price=req.strike_price,
        premium=req.premium,
        quantity=req.quantity,
        multiplier=req.multiplier,
        option_type=req.option_type,
        position=req.position,
    )

    total_premium = round(req.premium * req.quantity * req.multiplier, 2)
    break_even = calculate_break_even(req.strike_price, req.premium, opt_type)
    max_p, max_p_label, max_l, max_l_label = calculate_max_profit_loss(
        strike_price=req.strike_price,
        premium=req.premium,
        quantity=req.quantity,
        multiplier=req.multiplier,
        option_type=opt_type,
        position=pos_type,
    )

    scenarios = generate_scenarios(
        underlying_price=req.underlying_price,
        strike_price=req.strike_price,
        premium=req.premium,
        quantity=req.quantity,
        multiplier=req.multiplier,
        option_type=opt_type,
        position=pos_type,
        custom_scenarios=req.custom_scenarios,
        custom_shocks_pct=req.custom_shocks_pct,
    )

    curve = generate_curve(
        underlying_price=req.underlying_price,
        strike_price=req.strike_price,
        premium=req.premium,
        quantity=req.quantity,
        multiplier=req.multiplier,
        option_type=opt_type,
        position=pos_type,
    )

    if opt_type == OptionType.CALL:
        formula = (
            f"Call Intrinsic = max(S - {req.strike_price}, 0). "
            f"{'Long' if pos_type == PositionType.LONG else 'Short'} P/L = "
            f"{'(Intrinsic - ' if pos_type == PositionType.LONG else '('}"
            f"{req.premium}{' - Intrinsic)' if pos_type == PositionType.SHORT else ')'} * {req.quantity} * {req.multiplier}. "
            f"Break-even: S = {break_even}."
        )
    else:
        formula = (
            f"Put Intrinsic = max({req.strike_price} - S, 0). "
            f"{'Long' if pos_type == PositionType.LONG else 'Short'} P/L = "
            f"{'(Intrinsic - ' if pos_type == PositionType.LONG else '('}"
            f"{req.premium}{' - Intrinsic)' if pos_type == PositionType.SHORT else ')'} * {req.quantity} * {req.multiplier}. "
            f"Break-even: S = {break_even}."
        )

    return OptionsSimulationResponse(
        underlying_price=req.underlying_price,
        strike_price=req.strike_price,
        premium=req.premium,
        quantity=req.quantity,
        multiplier=req.multiplier,
        total_premium=total_premium,
        expiry_date=req.expiry_date,
        option_type=opt_type.value,
        position=pos_type.value,
        break_even_price=break_even,
        max_profit=max_p,
        max_profit_label=max_p_label,
        max_loss=max_l,
        max_loss_label=max_l_label,
        at_the_money_price=req.strike_price,
        scenarios=scenarios,
        curve=curve,
        assumptions_and_warnings=ASSUMPTIONS_AND_WARNINGS,
        formula_explanation=formula,
    )
