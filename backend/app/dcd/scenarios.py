"""
Hypothetical FX shock scenario engine for DCD.
Uses the identical single source-of-truth payoff engine.
"""

from typing import List, Optional
from app.dcd.schemas import DcdProductInput, DcdScenarioItem, DcdScenariosResponse
from app.dcd.payoff import calculate_dcd_payoff_core, DCD_RISK_NOTES


DEFAULT_DCD_SHOCKS = [-20.0, -10.0, -5.0, -2.0, 0.0, 2.0, 5.0, 10.0, 20.0]


def run_dcd_scenarios(product: DcdProductInput, custom_shocks: Optional[List[float]] = None) -> DcdScenariosResponse:
    """
    Run predefined or custom FX market shock scenarios.
    Returns conversion status, repayment currency, and final return in deposit currency terms.
    """
    shocks = custom_shocks if custom_shocks is not None and len(custom_shocks) > 0 else DEFAULT_DCD_SHOCKS

    # Determine reference spot S0
    s0 = product.initial_fx_rate
    if s0 is None or s0 <= 0:
        try:
            from app.phase3_market_data import get_market_data
            s0 = get_market_data(product.pair, "1mo").latest_price
        except Exception:
            s0 = float(product.conversion_strike_rate)

    items: List[DcdScenarioItem] = []
    for shock in shocks:
        rate = s0 * (1.0 + shock / 100.0)
        if rate <= 0:
            continue
        outcome = calculate_dcd_payoff_core(product, rate)
        items.append(
            DcdScenarioItem(
                fx_shock_pct=float(shock),
                maturity_fx_rate=round(rate, 4),
                conversion_occurred=outcome.conversion_occurred,
                repayment_currency=outcome.repayment_currency,
                principal_repayment=outcome.principal_repayment_amount,
                coupon_amount=outcome.coupon_amount,
                total_value_deposit=outcome.total_value_deposit_currency,
                profit_loss_deposit=outcome.profit_loss_deposit_currency,
                return_pct=outcome.return_pct,
            )
        )

    return DcdScenariosResponse(
        pair=product.pair,
        deposit_currency=product.deposit_currency,
        alternate_currency=product.alternate_currency,
        scenarios=items,
        risk_notes=DCD_RISK_NOTES,
    )
