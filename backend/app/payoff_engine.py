"""
Payoff engine for Equity-Linked Notes (ELN).

All functions are pure (no I/O, no side effects) and are designed
to be easily unit-tested.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models import ProductInput


# ---------------------------------------------------------------------------
# Core payoff computation
# ---------------------------------------------------------------------------

def compute_payoff(product: "ProductInput", final_ratio: float, min_ratio: float) -> dict:
    """
    Compute the ELN payoff for a single price path outcome.

    Parameters
    ----------
    product : ProductInput
        Validated product configuration.
    final_ratio : float
        S_T / S0 — the final price as a fraction of the reference price.
    min_ratio : float
        The minimum price ratio observed over the path (S_min / S0).
        For daily monitoring, this is the minimum of all daily ratios.
        For maturity monitoring, this equals final_ratio.

    Returns
    -------
    dict
        Keys: redemption, coupon_amount, final_amount, profit_loss,
              return_pct, barrier_breached.

    Notes
    -----
    Payoff formula:
        coupon_amount = investment * (coupon_pct_pa / 100) * tenor_years
        barrier_breached:
          - daily:    min_ratio <= barrier_pct / 100
          - maturity: final_ratio <= barrier_pct / 100
        if NOT breached:
            redemption = investment
        elif breached and final_ratio >= strike_pct / 100:
            redemption = investment          # recovered thanks to final level
        else:
            redemption = investment * (final_ratio / (strike_pct / 100))
        final_amount = redemption + coupon_amount
    """
    inv = product.investment
    strike_level = product.strike_pct / 100.0
    barrier_level = product.barrier_pct / 100.0

    coupon_amount = inv * (product.coupon_pct_pa / 100.0) * product.tenor_years

    # Determine barrier breach
    if product.barrier_monitoring == "daily":
        barrier_breached = min_ratio <= barrier_level
    else:  # "maturity"
        barrier_breached = final_ratio <= barrier_level

    # Redemption logic
    if not barrier_breached:
        redemption = inv
    elif final_ratio >= strike_level:
        # Breached during path but recovered at maturity above strike
        redemption = inv
    else:
        # Capital loss proportional to how far below strike the final ratio is
        redemption = inv * (final_ratio / strike_level)

    final_amount = redemption + coupon_amount
    profit_loss = final_amount - inv
    return_pct = profit_loss / inv * 100.0

    return {
        "redemption": round(redemption, 2),
        "coupon_amount": round(coupon_amount, 2),
        "final_amount": round(final_amount, 2),
        "profit_loss": round(profit_loss, 2),
        "return_pct": round(return_pct, 4),
        "barrier_breached": barrier_breached,
    }


# ---------------------------------------------------------------------------
# Payoff curve builder
# ---------------------------------------------------------------------------

def build_payoff_curve(product: "ProductInput", ratios: list[float]) -> list[dict]:
    """
    Build an x-y payoff curve for a range of final price ratios.

    Parameters
    ----------
    product : ProductInput
        Validated product configuration.
    ratios : list[float]
        List of final_ratio values (S_T / S0) to evaluate.

    Returns
    -------
    list[dict]
        Each element: {underlying_return_pct, investor_return_pct}.

    Notes
    -----
    Assumption for the curve (documented):
        min_ratio = min(1.0, final_ratio)
        This means: if the underlying ends above its starting level (>= S0),
        we assume it never went below S0 during the path (no breach from above).
        If it ends below S0, we assume the minimum equals the final value
        (worst-case single-path assumption for illustration purposes).
        This is a simplification for a 2-D curve display and does NOT model
        the actual path-dependent barrier.
    """
    curve = []
    for r in ratios:
        # Simplification: min_ratio = min(1, final_ratio)
        min_r = min(1.0, r)
        result = compute_payoff(product, final_ratio=r, min_ratio=min_r)
        underlying_return_pct = (r - 1.0) * 100.0
        curve.append({
            "underlying_return_pct": round(underlying_return_pct, 2),
            "investor_return_pct": round(result["return_pct"], 4),
        })
    return curve


# ---------------------------------------------------------------------------
# Scenario runner
# ---------------------------------------------------------------------------

DEFAULT_SHOCKS = [20, 10, 0, -10, -20, -25, -40]


def run_scenarios(product: "ProductInput", shocks: list[float] | None = None) -> list[dict]:
    """
    Run payoff computation for a set of shock scenarios.

    Parameters
    ----------
    product : ProductInput
        Validated product configuration.
    shocks : list[float], optional
        List of shocks in % (e.g. [20, 10, 0, -10, -20, -25, -40]).
        Defaults to DEFAULT_SHOCKS.

    Returns
    -------
    list[dict]
        Each element contains: shock_pct, underlying_return_pct, plus
        all keys from compute_payoff.

    Notes
    -----
    Assumption for scenarios (documented):
        final_ratio = 1 + shock / 100
        min_ratio = min(1.0, final_ratio)
        Same simplification as build_payoff_curve — the path minimum equals
        the final value when below S0, and S0 when above S0.
    """
    if shocks is None:
        shocks = DEFAULT_SHOCKS

    results = []
    for shock in shocks:
        final_ratio = 1.0 + shock / 100.0
        # Simplification: min_ratio = min(1, 1 + shock/100)
        min_ratio = min(1.0, final_ratio)
        result = compute_payoff(product, final_ratio=final_ratio, min_ratio=min_ratio)
        results.append({
            "shock_pct": shock,
            "underlying_return_pct": round((final_ratio - 1.0) * 100.0, 2),
            **result,
        })
    return results


# ---------------------------------------------------------------------------
# Formula text generator
# ---------------------------------------------------------------------------

def get_formula_text(product: "ProductInput") -> str:
    """Return a human-readable description of the ELN payoff formula."""
    monitoring_desc = (
        "the minimum daily price ratio ≤ barrier level"
        if product.barrier_monitoring == "daily"
        else "the final price ratio ≤ barrier level (only checked at maturity)"
    )
    return (
        f"ELN Payoff Formula:\n"
        f"  r = S_T / S₀  (final price ratio)\n"
        f"  Coupon = Investment × {product.coupon_pct_pa}% × {product.tenor_years} yr"
        f" = {product.investment * product.coupon_pct_pa / 100 * product.tenor_years:,.0f} INR (always paid)\n"
        f"  Barrier breached if: {monitoring_desc}\n"
        f"  If NOT breached → Redemption = Investment (full capital return)\n"
        f"  If breached AND r ≥ {product.strike_pct/100:.0%} → Redemption = Investment\n"
        f"  If breached AND r < {product.strike_pct/100:.0%} → Redemption = Investment × (r / {product.strike_pct/100:.0%})\n"
        f"  Final Amount = Redemption + Coupon\n"
        f"  Coupon is always paid regardless of barrier or strike."
    )


def build_eln_two_curves(product: "ProductInput", ratios: list[float]) -> dict:
    """
    Build two distinct payoff curves for ELN:
    1. curve_not_breached: assumes the barrier was never touched (full principal + coupon).
    2. curve_breached: assumes the barrier was touched during the path.
       - If final ratio >= strike, recovered at maturity.
       - If final ratio < strike, proportional loss.
    
    The breached curve is mathematically always <= the not-breached curve.
    """
    inv = product.investment
    strike_level = product.strike_pct / 100.0
    coupon_amount = inv * (product.coupon_pct_pa / 100.0) * product.tenor_years
    coupon_ret = (coupon_amount / inv) * 100.0

    not_breached = []
    breached = []

    for r in ratios:
        underlying_return_pct = round((r - 1.0) * 100.0, 2)

        # 1. Not breached curve: always 100% redemption + coupon
        not_breached.append({
            "underlying_return_pct": underlying_return_pct,
            "investor_return_pct": round(coupon_ret, 4),
        })

        # 2. Breached curve:
        if r >= strike_level:
            # Recovered at maturity above strike
            breached_ret = coupon_ret
        else:
            redemption = inv * (r / strike_level)
            final_amt = redemption + coupon_amount
            pnl = final_amt - inv
            breached_ret = (pnl / inv) * 100.0

        breached.append({
            "underlying_return_pct": underlying_return_pct,
            "investor_return_pct": round(breached_ret, 4),
        })

    return {
        "curve_not_breached": not_breached,
        "curve_breached": breached,
    }

