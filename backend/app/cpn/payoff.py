from __future__ import annotations

from typing import Optional, Dict, Any


def calculate_cpn_payoff_core(
    investment: float,
    tenor_years: float,
    protection_pct: float,
    participation_pct: float,
    r: float,
    cap_pct: Optional[float] = None,
    coupon_pct_pa: float = 0.0,
) -> Dict[str, float]:
    """
    Deterministic Capital-Protected Note (CPN) payoff at maturity.
    
    Formula:
    - r = (S_T - S_0) / S_0 (point-to-point decimal return)
    - protected_amount = investment * (protection_pct / 100)
    - participation_gain = investment * (participation_pct / 100) * min(max(r, 0), cap_pct / 100) [or max(r, 0) if no cap]
    - coupon_amount = investment * (coupon_pct_pa / 100) * tenor_years
    - final_amount = protected_amount + participation_gain + coupon_amount
    - profit_loss = final_amount - investment
    - return_pct = (profit_loss / investment) * 100
    - If r <= 0, investor receives protected_amount + coupon_amount only.
    - Principal at risk = investment * (1 - protection_pct / 100).
    """
    protected_amount = investment * (protection_pct / 100.0)

    # Positive upside return subject to cap if given
    effective_r = max(r, 0.0)
    if cap_pct is not None:
        effective_r = min(effective_r, cap_pct / 100.0)

    participation_gain = investment * (participation_pct / 100.0) * effective_r
    coupon_amount = investment * (coupon_pct_pa / 100.0) * tenor_years

    final_amount = protected_amount + participation_gain + coupon_amount
    profit_loss = final_amount - investment
    return_pct = (profit_loss / investment) * 100.0
    principal_at_risk = investment * (1.0 - protection_pct / 100.0)

    return {
        "protected_amount": round(protected_amount, 2),
        "participation_gain": round(participation_gain, 2),
        "coupon_amount": round(coupon_amount, 2),
        "final_amount": round(final_amount, 2),
        "profit_loss": round(profit_loss, 2),
        "return_pct": round(return_pct, 4),
        "principal_at_risk": round(principal_at_risk, 2),
    }
