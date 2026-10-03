"""
Continuous payoff curve generator and analytical breakpoints for DCD.
Every point MUST be produced by calling the single source-of-truth payoff engine.
"""

from typing import List
from app.dcd.schemas import DcdProductInput, DcdCurvePoint, DcdBreakpoints, DcdCurveResponse
from app.dcd.payoff import calculate_dcd_payoff_core, DCD_RISK_NOTES


def generate_dcd_curve(product: DcdProductInput) -> DcdCurveResponse:
    """
    Generate DCD payoff curve across underlying FX rates from -25% to +25% around spot (or strike).
    Every curve point uses calculate_dcd_payoff_core.
    """
    strike = float(product.conversion_strike_rate)
    coupon_pa = float(product.coupon_pct_pa)
    tenor = float(product.tenor_years)
    cond = product.conversion_condition

    # Determine reference initial FX rate
    s0 = product.initial_fx_rate
    if s0 is None or s0 <= 0:
        try:
            from app.phase3_market_data import get_market_data
            s0 = get_market_data(product.pair, "1mo").latest_price
        except Exception:
            s0 = strike

    # Maximum return is achieved when no conversion occurs
    max_return_pct = round(coupon_pa * tenor, 4)

    # Analytical break-even FX rate S* where total return = 0
    coupon_ratio = (coupon_pa / 100.0) * tenor
    break_even_rate = None
    if coupon_ratio < 1.0:
        # 1 - coupon_ratio > 0
        break_even_rate = round(strike / (1.0 - coupon_ratio), 4)

    # Generate points across percentage shocks from -25% to +25% in steps of 1%
    points: List[DcdCurvePoint] = []
    shocks = range(-25, 26, 1)

    for shock in shocks:
        fx_rate = s0 * (1.0 + shock / 100.0)
        if fx_rate <= 0:
            continue
        outcome = calculate_dcd_payoff_core(product, fx_rate)
        points.append(
            DcdCurvePoint(
                fx_rate=round(fx_rate, 4),
                fx_change_pct=float(shock),
                investor_return_pct=outcome.return_pct,
                conversion_occurred=outcome.conversion_occurred,
                repayment_currency=outcome.repayment_currency,
                total_value_deposit_currency=outcome.total_value_deposit_currency,
            )
        )

    breakpoints = DcdBreakpoints(
        conversion_strike_rate=strike,
        break_even_fx_rate=break_even_rate,
        max_return_pct=max_return_pct,
        initial_fx_rate=round(s0, 4),
    )

    return DcdCurveResponse(
        pair=product.pair,
        deposit_currency=product.deposit_currency,
        alternate_currency=product.alternate_currency,
        points=points,
        breakpoints=breakpoints,
        risk_notes=DCD_RISK_NOTES,
    )
