from __future__ import annotations

import math
from typing import List, Optional, Tuple, Dict, Any
from app.debenture.schemas import (
    DebentureRequest,
    DebentureResponse,
    CashFlowItem,
    YieldScenarioItem,
    DebentureCurvePoint,
)

FREQUENCY_LABELS = {
    1: "Annual (1x / year)",
    2: "Semi-Annual (2x / year)",
    4: "Quarterly (4x / year)",
    12: "Monthly (12x / year)",
}

ASSUMPTIONS_AND_DISCLAIMERS = (
    "Standard Fixed-Rate Bullet Debenture Model: This calculator models fixed-rate periodic coupons "
    "and a bullet principal redemption at maturity. It strictly assumes all coupons are received on schedule "
    "and reinvested at the specified yield. It excludes credit/issuer default risk, rating migration, "
    "embedded options (call/put/early conversion features), taxes, brokerage fees, and liquidity discounts."
)


def validate_debenture_inputs(
    face_value: float,
    purchase_price: float,
    coupon_rate_pct: float,
    frequency: int,
    years_to_maturity: float,
    redemption_value: Optional[float] = None,
    market_yield_pct: float = 8.0,
) -> float:
    """Validate numeric inputs strictly, raising ValueError on invalid data."""
    if face_value is None or face_value <= 0:
        raise ValueError("Face value must be strictly positive (> 0).")
    if purchase_price is None or purchase_price <= 0:
        raise ValueError("Purchase price must be strictly positive (> 0).")
    if coupon_rate_pct is None or coupon_rate_pct < 0:
        raise ValueError("Coupon rate must be non-negative (>= 0).")
    if frequency not in (1, 2, 4, 12):
        raise ValueError(f"Frequency must be 1, 2, 4, or 12. Received {frequency}.")
    if years_to_maturity is None or years_to_maturity <= 0:
        raise ValueError("Years to maturity must be strictly positive (> 0).")
    if redemption_value is not None and redemption_value <= 0:
        raise ValueError("Redemption value must be strictly positive (> 0).")
    if market_yield_pct is None or market_yield_pct < 0:
        raise ValueError("Market yield must be non-negative (>= 0).")

    return redemption_value if redemption_value is not None else face_value


def calculate_pv(
    c: float,
    n: int,
    r_per: float,
    redemption: float,
) -> float:
    """
    Calculate Present Value of fixed coupon debenture cash flows:
    PV = sum_{t=1}^n [ C / (1 + r)^t ] + R / (1 + r)^n
    """
    if abs(r_per) < 1e-12:
        return n * c + redemption

    # Analytical annuity formula
    annuity_factor = (1.0 - (1.0 + r_per) ** (-n)) / r_per
    pv_coupons = c * annuity_factor
    pv_redemption = redemption * ((1.0 + r_per) ** (-n))
    return pv_coupons + pv_redemption


def calculate_ytm(
    purchase_price: float,
    c: float,
    n: int,
    m: int,
    redemption: float,
) -> Tuple[float, float]:
    """
    Numerically solve for periodic yield r_per such that calculate_pv(c, n, r_per, redemption) == purchase_price.
    Returns:
    - nominal_ytm_pct: r_per * m * 100.0 (Annualized Nominal YTM)
    - effective_ytm_pct: ((1 + r_per)^m - 1) * 100.0 (Effective Annual Rate)
    """
    # Zero-coupon edge case
    if c == 0:
        # P = R / (1 + r)^n => r = (R / P)^(1/n) - 1
        r_per = (redemption / purchase_price) ** (1.0 / n) - 1.0
        nominal = r_per * m * 100.0
        ear = (((1.0 + r_per) ** m) - 1.0) * 100.0
        return round(nominal, 4), round(ear, 4)

    # Monotonic decreasing function f(r) = PV(r) - P
    def f(r: float) -> float:
        return calculate_pv(c, n, r, redemption) - purchase_price

    # Robust root finder (bisection with interval expansion)
    low_r = -0.90 / m
    high_r = 0.50 / m

    # Expand interval if needed
    for _ in range(50):
        f_low = f(low_r)
        f_high = f(high_r)
        if f_low * f_high <= 0:
            break
        if f_high > 0:
            # PV at high_r is still > P => yield must be even higher
            high_r *= 2.0
        elif f_low < 0:
            # PV at low_r is < P => yield must be lower
            low_r = low_r - 0.5 / m

    # Bisection iterations
    a, b = low_r, high_r
    for _ in range(100):
        mid = (a + b) / 2.0
        f_mid = f(mid)
        if abs(f_mid) < 1e-8 or (b - a) < 1e-10:
            break
        if f(a) * f_mid <= 0:
            b = mid
        else:
            a = mid

    r_per = (a + b) / 2.0
    nominal = r_per * m * 100.0
    ear = (((1.0 + r_per) ** m) - 1.0) * 100.0
    return round(nominal, 4), round(ear, 4)


def calculate_duration(
    c: float,
    n: int,
    m: int,
    r_per: float,
    redemption: float,
    pv: float,
) -> Tuple[float, float]:
    """
    Calculate Macaulay duration (years) and Modified duration.
    """
    if pv <= 0:
        return 0.0, 0.0

    weighted_sum = 0.0
    for t in range(1, n + 1):
        cf = c if t < n else (c + redemption)
        discount = (1.0 + r_per) ** (-t)
        pv_cf = cf * discount
        time_years = t / m
        weighted_sum += time_years * pv_cf

    macaulay = weighted_sum / pv
    modified = macaulay / (1.0 + r_per) if (1.0 + r_per) > 0 else macaulay
    return round(macaulay, 4), round(modified, 4)


def generate_cash_flows(
    c: float,
    n: int,
    m: int,
    r_per: float,
    redemption: float,
) -> List[CashFlowItem]:
    """Generate detailed cash flow table for each payment period."""
    items: List[CashFlowItem] = []
    for t in range(1, n + 1):
        coupon_pmt = c
        redemption_pmt = redemption if t == n else 0.0
        total_cf = coupon_pmt + redemption_pmt
        dcf = total_cf * ((1.0 + r_per) ** (-t)) if (1.0 + r_per) > 0 else total_cf

        items.append(
            CashFlowItem(
                period=t,
                time_years=round(t / m, 3),
                coupon_payment=round(coupon_pmt, 2),
                redemption_payment=round(redemption_pmt, 2),
                total_cash_flow=round(total_cf, 2),
                discounted_cash_flow=round(dcf, 2),
            )
        )
    return items


def generate_scenarios(
    c: float,
    n: int,
    m: int,
    redemption: float,
    base_pv: float,
    market_yield_pct: float,
    face_value: float,
    custom_shocks_bps: Optional[List[float]] = None,
) -> List[YieldScenarioItem]:
    """Calculate debenture price sensitivity across yield changes."""
    shocks = custom_shocks_bps if custom_shocks_bps is not None else [-300.0, -200.0, -100.0, -50.0, 0.0, 50.0, 100.0, 200.0, 300.0]
    shocks = sorted(list(set(shocks)))

    items: List[YieldScenarioItem] = []
    for bps in shocks:
        scen_yield = max(0.0, market_yield_pct + bps / 100.0)
        r_scen = (scen_yield / 100.0) / m
        scen_pv = calculate_pv(c, n, r_scen, redemption)

        diff = scen_pv - base_pv
        diff_pct = (diff / base_pv) * 100.0 if base_pv > 0 else 0.0

        if scen_pv > face_value + 1e-4:
            status = "Premium"
        elif scen_pv < face_value - 1e-4:
            status = "Discount"
        else:
            status = "Par"

        items.append(
            YieldScenarioItem(
                yield_pct=round(scen_yield, 2),
                shock_bps=round(bps, 1),
                present_value=round(scen_pv, 2),
                price_change_vs_pv=round(diff, 2),
                price_change_pct=round(diff_pct, 2),
                price_status=status,
            )
        )
    return items


def generate_curve(
    c: float,
    n: int,
    m: int,
    redemption: float,
    market_yield_pct: float,
    ytm_pct: float,
    points_count: int = 60,
) -> List[DebentureCurvePoint]:
    """Generate dense curve data points for charting Debenture Price vs Market Yield."""
    min_yield = max(0.25, round(market_yield_pct - 6.0, 2))
    max_yield = max(min_yield + 4.0, round(market_yield_pct + 6.0, 2))

    step = (max_yield - min_yield) / max(1, points_count - 1)
    yields = [min_yield + i * step for i in range(points_count)]

    # Add critical anchor points
    anchors = [market_yield_pct]
    if 0.1 <= ytm_pct <= 50.0:
        anchors.append(ytm_pct)
    yields.extend(anchors)
    yields = sorted(list(set(round(y, 2) for y in yields if y >= 0)))

    points: List[DebentureCurvePoint] = []
    for y in yields:
        r_per = (y / 100.0) / m
        pv = calculate_pv(c, n, r_per, redemption)
        points.append(
            DebentureCurvePoint(
                yield_pct=round(y, 2),
                present_value=round(pv, 2),
            )
        )
    return points


def calculate_debenture(req: DebentureRequest) -> DebentureResponse:
    """Core calculation engine for Fixed-Rate Bullet Debenture."""
    redemption = validate_debenture_inputs(
        face_value=req.face_value,
        purchase_price=req.purchase_price,
        coupon_rate_pct=req.coupon_rate_pct,
        frequency=req.frequency,
        years_to_maturity=req.years_to_maturity,
        redemption_value=req.redemption_value,
        market_yield_pct=req.market_yield_pct,
    )

    m = req.frequency
    n = max(1, round(req.years_to_maturity * m))
    periodic_coupon = (req.face_value * (req.coupon_rate_pct / 100.0)) / m
    total_coupons = periodic_coupon * n
    total_cash_flows = total_coupons + redemption

    # Current Yield
    annual_coupon = req.face_value * (req.coupon_rate_pct / 100.0)
    current_yield_pct = (annual_coupon / req.purchase_price) * 100.0

    # Implied YTM from purchase price
    nominal_ytm, ear_ytm = calculate_ytm(
        purchase_price=req.purchase_price,
        c=periodic_coupon,
        n=n,
        m=m,
        redemption=redemption,
    )

    # Present Value at prevailing market yield
    r_market = (req.market_yield_pct / 100.0) / m
    pv_market = calculate_pv(periodic_coupon, n, r_market, redemption)

    # Premium / Discount of Purchase Price vs Face Value
    prem_disc_amount = req.purchase_price - req.face_value
    prem_disc_pct = (prem_disc_amount / req.face_value) * 100.0
    if req.purchase_price > req.face_value + 1e-4:
        pricing_status = "Premium"
    elif req.purchase_price < req.face_value - 1e-4:
        pricing_status = "Discount"
    else:
        pricing_status = "Par"

    # Duration metrics at market yield
    mac_dur, mod_dur = calculate_duration(
        c=periodic_coupon,
        n=n,
        m=m,
        r_per=r_market,
        redemption=redemption,
        pv=pv_market,
    )

    # Detailed Cash Flows table
    cash_flows = generate_cash_flows(
        c=periodic_coupon,
        n=n,
        m=m,
        r_per=r_market,
        redemption=redemption,
    )

    # Yield Sensitivity Scenarios
    scenarios = generate_scenarios(
        c=periodic_coupon,
        n=n,
        m=m,
        redemption=redemption,
        base_pv=pv_market,
        market_yield_pct=req.market_yield_pct,
        face_value=req.face_value,
        custom_shocks_bps=req.custom_yield_shocks_bps,
    )

    # Dense Curve
    curve = generate_curve(
        c=periodic_coupon,
        n=n,
        m=m,
        redemption=redemption,
        market_yield_pct=req.market_yield_pct,
        ytm_pct=nominal_ytm,
    )

    return DebentureResponse(
        face_value=round(req.face_value, 2),
        purchase_price=round(req.purchase_price, 2),
        coupon_rate_pct=round(req.coupon_rate_pct, 4),
        frequency=m,
        frequency_label=FREQUENCY_LABELS.get(m, f"{m}x / year"),
        years_to_maturity=round(req.years_to_maturity, 2),
        total_periods=n,
        redemption_value=round(redemption, 2),
        market_yield_pct=round(req.market_yield_pct, 4),
        periodic_coupon=round(periodic_coupon, 2),
        total_coupons=round(total_coupons, 2),
        total_cash_flows=round(total_cash_flows, 2),
        current_yield_pct=round(current_yield_pct, 4),
        ytm_purchase_price_pct=round(nominal_ytm, 4),
        effective_annual_ytm_pct=round(ear_ytm, 4),
        present_value_market_yield=round(pv_market, 2),
        premium_discount_amount=round(prem_disc_amount, 2),
        premium_discount_pct=round(prem_disc_pct, 2),
        pricing_status=pricing_status,
        macaulay_duration_years=round(mac_dur, 2),
        modified_duration=round(mod_dur, 2),
        cash_flows=cash_flows,
        scenarios=scenarios,
        curve=curve,
        assumptions_and_disclaimers=ASSUMPTIONS_AND_DISCLAIMERS,
    )
