"""
Pure deterministic payoff calculation engine for Dual Currency Deposit (DCD).

Payoff Specification at Maturity:
--------------------------------
1 unit of deposit_currency = X units of alternate_currency (quote convention: e.g. USD/INR = 85.0).
- deposit_amount: Amount deposited in deposit_currency.
- conversion_strike_rate K: Agreed conversion rate.
- coupon_pct_pa: Annualized fixed coupon rate.
- tenor_years: Deposit duration in years.
- maturity_fx_rate S_T: Spot exchange rate observed at maturity.
- conversion_condition:
  - "FX_AT_OR_ABOVE_STRIKE": Conversion triggers if S_T >= K.
  - "FX_AT_OR_BELOW_STRIKE": Conversion triggers if S_T <= K.

Coupon (paid in original deposit currency):
  coupon_amount = deposit_amount * (coupon_pct_pa / 100) * tenor_years

If conversion occurs:
  principal_repayment = deposit_amount * K (in alternate_currency)
  repayment_currency = alternate_currency
  principal_value_deposit_currency = (deposit_amount * K) / S_T
  total_value_deposit_currency = principal_value_deposit_currency + coupon_amount
  profit_loss = total_value_deposit_currency - deposit_amount
  return_pct = (profit_loss / deposit_amount) * 100

If conversion does NOT occur:
  principal_repayment = deposit_amount (in deposit_currency)
  repayment_currency = deposit_currency
  principal_value_deposit_currency = deposit_amount
  total_value_deposit_currency = deposit_amount + coupon_amount
  profit_loss = coupon_amount
  return_pct = (coupon_amount / deposit_amount) * 100

NO FAKE / SYNTHETIC NUMBERS:
All results are mathematically derived from contract terms and S_T.
"""

from typing import List
from app.dcd.schemas import DcdProductInput, DcdPayoffOutcome


DCD_RISK_NOTES: List[str] = [
    "DCD is a structured currency deposit and not a capital-protected fixed deposit.",
    "If conversion triggers, principal is returned in the alternate currency which has weakened against the deposit currency.",
    "Translating alternate currency back to the deposit currency at maturity spot may result in a substantial capital loss.",
    "The higher coupon rate compensates for the underlying currency conversion risk.",
    "Early withdrawal prior to maturity is subject to market break costs and issuer terms.",
    "Taxes and conversion transaction fees are excluded.",
]


def calculate_dcd_payoff_core(product: DcdProductInput, maturity_fx_rate: float) -> DcdPayoffOutcome:
    """
    Pure deterministic DCD payoff function for a single maturity exchange rate S_T.
    Used consistently by payoff, curve, scenarios, and historical backtest.
    """
    if maturity_fx_rate <= 0:
        raise ValueError(f"Maturity FX rate must be strictly positive (got {maturity_fx_rate}).")

    deposit = float(product.deposit_amount)
    strike = float(product.conversion_strike_rate)
    coupon_pa = float(product.coupon_pct_pa)
    tenor = float(product.tenor_years)
    cond = product.conversion_condition
    dep_curr = product.deposit_currency.upper()
    alt_curr = product.alternate_currency.upper()

    # Fixed coupon earned in deposit currency
    coupon_amount = deposit * (coupon_pa / 100.0) * tenor

    # Evaluate conversion condition
    conversion_occurred = False
    if cond == "FX_AT_OR_ABOVE_STRIKE" and maturity_fx_rate >= strike:
        conversion_occurred = True
    elif cond == "FX_AT_OR_BELOW_STRIKE" and maturity_fx_rate <= strike:
        conversion_occurred = True

    if conversion_occurred:
        # Principal converted to alternate currency at strike K
        principal_repay = deposit * strike
        repayment_curr = alt_curr
        # Value of repaid alternate currency in deposit currency terms at maturity FX rate S_T
        principal_val_dep = principal_repay / maturity_fx_rate
        total_val_dep = principal_val_dep + coupon_amount
        pnl = total_val_dep - deposit
        ret_pct = (pnl / deposit) * 100.0
        explanation = (
            f"Conversion condition satisfied ({cond}). "
            f"Maturity rate {maturity_fx_rate:.4f} crossed strike {strike:.4f}. "
            f"Principal converted to {principal_repay:,.2f} {repayment_curr} at strike rate. "
            f"Equivalent deposit value is {principal_val_dep:,.2f} {dep_curr} plus {coupon_amount:,.2f} {dep_curr} coupon."
        )
    else:
        # Principal returned 100% in deposit currency
        principal_repay = deposit
        repayment_curr = dep_curr
        principal_val_dep = deposit
        total_val_dep = deposit + coupon_amount
        pnl = coupon_amount
        ret_pct = (pnl / deposit) * 100.0
        explanation = (
            f"Conversion condition not satisfied ({cond}). "
            f"Maturity rate {maturity_fx_rate:.4f} did not trigger conversion against strike {strike:.4f}. "
            f"Principal returned in full ({deposit:,.2f} {dep_curr}) plus {coupon_amount:,.2f} {dep_curr} coupon."
        )

    cash_flows = [
        {"type": "principal", "currency": repayment_curr, "amount": round(principal_repay, 2)},
        {"type": "coupon", "currency": dep_curr, "amount": round(coupon_amount, 2)},
    ]

    return DcdPayoffOutcome(
        deposit_currency=dep_curr,
        alternate_currency=alt_curr,
        deposit_amount=deposit,
        maturity_fx_rate=round(maturity_fx_rate, 4),
        conversion_strike_rate=strike,
        conversion_condition=cond,
        conversion_occurred=conversion_occurred,
        repayment_currency=repayment_curr,
        principal_repayment_amount=round(principal_repay, 2),
        coupon_amount=round(coupon_amount, 2),
        coupon_currency=dep_curr,
        principal_value_deposit_currency=round(principal_val_dep, 2),
        total_value_deposit_currency=round(total_val_dep, 2),
        profit_loss_deposit_currency=round(pnl, 2),
        return_pct=round(ret_pct, 4),
        cash_flows=cash_flows,
        explanation=explanation,
        risk_notes=DCD_RISK_NOTES,
    )
