from app.phase2_models import (
    ElnPayoffRequest, ElnPayoffResponse,
    DcdPayoffRequest, DcdPayoffResponse,
    CpnPayoffRequest, CpnPayoffResponse
)

def calculate_eln_payoff(req: ElnPayoffRequest) -> ElnPayoffResponse:
    strike_price = req.initial_price * (req.strike_pct / 100.0)
    barrier_price = req.initial_price * (req.barrier_pct / 100.0)
    
    coupon = req.investment * (req.coupon_pct_pa / 100.0) * req.tenor_years

    if not req.barrier_breached and req.final_price >= strike_price:
        principal_repayment = req.investment
        coupon_earned = coupon
        explanation = "Barrier never breached and final price >= strike. Full principal returned + coupon."
    elif not req.barrier_breached and req.final_price < strike_price:
        principal_repayment = req.investment
        coupon_earned = 0.0
        explanation = "Barrier never breached and final price < strike. Full principal returned, but no coupon."
    else:
        # Barrier breached
        principal_repayment = req.investment * (req.final_price / req.initial_price)
        coupon_earned = 0.0
        explanation = "Barrier was breached. Principal reduced proportionally to underlying performance, no coupon."

    total_value = principal_repayment + coupon_earned
    pnl = total_value - req.investment
    ret_pct = (pnl / req.investment) * 100.0

    assumptions = "Illustrative ELN contract. Coupon is contingent on no barrier breach in scenario B/C (diverges from unconditional coupon). Barrier monitoring and settlement methods are accepted but only barrier_breached status drives the payout logic."

    return ElnPayoffResponse(
        initial_price=req.initial_price,
        final_price=req.final_price,
        strike_price=strike_price,
        barrier_price=barrier_price,
        barrier_breached=req.barrier_breached,
        principal_repayment=principal_repayment,
        coupon_earned=coupon_earned,
        total_maturity_value=total_value,
        absolute_profit_loss=pnl,
        return_pct=ret_pct,
        payoff_explanation=explanation,
        contract_assumptions=assumptions
    )

def calculate_dcd_payoff(req: DcdPayoffRequest) -> DcdPayoffResponse:
    coupon = req.deposit_amount * (req.coupon_rate / 100.0) * req.tenor_years
    
    conversion_occurred = False
    if req.conversion_condition == "FX_AT_OR_ABOVE_STRIKE" and req.maturity_fx_rate >= req.conversion_strike_rate:
        conversion_occurred = True
    elif req.conversion_condition == "FX_AT_OR_BELOW_STRIKE" and req.maturity_fx_rate <= req.conversion_strike_rate:
        conversion_occurred = True

    if conversion_occurred:
        principal_repayment = req.deposit_amount * req.conversion_strike_rate
        repayment_currency = req.alternate_currency.upper()
        explanation = f"Conversion condition satisfied ({req.conversion_condition}). Principal converted to {repayment_currency} at strike {req.conversion_strike_rate}."
        
        # Effective return needs to be calculated in base currency terms to be meaningful.
        # Equivalent base currency value of the repaid alternate currency = principal_repayment / maturity_fx_rate
        base_value_of_principal = principal_repayment / req.maturity_fx_rate
        total_maturity_repayment = principal_repayment # Numerical value in alternate currency
        base_pnl = (base_value_of_principal + coupon) - req.deposit_amount
        effective_ret_pct = (base_pnl / req.deposit_amount) * 100.0
    else:
        principal_repayment = req.deposit_amount
        repayment_currency = req.deposit_currency.upper()
        explanation = f"Conversion condition not satisfied ({req.conversion_condition}). Principal returned in {repayment_currency}."
        total_maturity_repayment = principal_repayment + coupon
        effective_ret_pct = (coupon / req.deposit_amount) * 100.0

    assumptions = "Simplified DCD model. 1 unit of deposit currency = X units of alternate currency. Coupon is always paid in the original deposit currency. Total maturity repayment is numerical principal (in repayment currency). Effective return is calculated by translating alternate currency back to deposit currency at maturity FX rate."

    return DcdPayoffResponse(
        deposit_currency=req.deposit_currency.upper(),
        alternate_currency=req.alternate_currency.upper(),
        maturity_fx_rate=req.maturity_fx_rate,
        conversion_strike=req.conversion_strike_rate,
        conversion_occurred=conversion_occurred,
        principal_repayment_amount=principal_repayment,
        repayment_currency=repayment_currency,
        coupon_amount=coupon,
        coupon_currency=req.deposit_currency.upper(),
        total_maturity_repayment=total_maturity_repayment,
        effective_return_pct=effective_ret_pct,
        explanation=explanation,
        contract_assumptions=assumptions
    )

def calculate_cpn_payoff(req: CpnPayoffRequest) -> CpnPayoffResponse:
    underlying_ret = (req.final_price - req.initial_price) / req.initial_price
    
    participation_gain = 0.0
    if underlying_ret > 0:
        participation_gain = req.investment * (req.participation_rate / 100.0) * underlying_ret
        if req.upside_cap_pct is not None:
            max_gain = req.investment * (req.participation_rate / 100.0) * (req.upside_cap_pct / 100.0)
            participation_gain = min(participation_gain, max_gain)

    protected_principal = req.investment * (req.protection_pct / 100.0)
    
    coupon = 0.0
    if req.coupon_rate is not None:
        coupon = req.investment * (req.coupon_rate / 100.0) * req.tenor_years

    total_value = protected_principal + participation_gain + coupon
    pnl = total_value - req.investment
    ret_pct = (pnl / req.investment) * 100.0

    explanation = f"CPN Payoff. Protected principal: {req.protection_pct}%. Underlying return: {underlying_ret*100:.2f}%. Participation gain earned based on participation rate."
    if req.upside_cap_pct is not None and underlying_ret * 100 > req.upside_cap_pct:
        explanation += " Upside cap was applied."

    assumptions = "Simplified CPN model. Issuer default risk, liquidity risk, inflation, and opportunity cost are not eliminated by principal protection. Participation gain is strictly applied to positive underlying returns."

    return CpnPayoffResponse(
        investment_amount=req.investment,
        initial_price=req.initial_price,
        final_price=req.final_price,
        underlying_return=underlying_ret,
        protected_principal=protected_principal,
        participation_gain=participation_gain,
        coupon=coupon,
        total_maturity_value=total_value,
        absolute_profit_loss=pnl,
        return_pct=ret_pct,
        explanation=explanation,
        contract_assumptions=assumptions
    )
