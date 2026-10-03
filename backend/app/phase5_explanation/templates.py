from app.phase5_explanation.models import ExplanationContext

def get_product_summary(ctx: ExplanationContext) -> str:
    ptype = ctx.product.product_type
    inv = ctx.product.investment_amount
    asset = ctx.product.underlying_asset
    if ptype == "ELN":
        return f"You are proposing to invest ₹{inv:,.2f} in an Equity-Linked Note tied to {asset}."
    elif ptype == "DCD":
        return f"You are proposing to invest {inv:,.2f} in a Dual Currency Deposit involving {asset}."
    elif ptype == "CPN":
        return f"You are proposing to invest ₹{inv:,.2f} in a Capital-Protected Note tied to {asset}."
    return "Unknown product type."

def get_how_it_works(ctx: ExplanationContext) -> str:
    ptype = ctx.product.product_type
    if ptype == "ELN":
        return (
            f"This product tracks the performance of {ctx.product.underlying_asset}. "
            f"It offers a fixed interest (coupon) if market conditions are met. "
            f"It has a 'strike' price representing {ctx.product.strike_percentage}% of the initial level, "
            f"and a 'downside barrier' at {ctx.product.barrier_percentage}%. "
            f"If the market falls below this barrier, your initial investment is no longer protected."
        )
    elif ptype == "DCD":
        return (
            f"You deposit your money in one currency. At maturity, depending on the exchange rate ({ctx.product.underlying_asset}), "
            f"you receive your principal plus interest either in your original currency or an alternate currency at a pre-agreed conversion rate. "
            f"The interest is typically higher to compensate for this currency risk."
        )
    elif ptype == "CPN":
        return (
            f"This product is designed to protect {ctx.product.barrier_percentage or 100}% of your initial investment at maturity, "
            f"while giving you partial exposure to any gains in {ctx.product.underlying_asset}. "
            f"However, this protection is subject to the issuer's ability to pay (credit risk)."
        )
    return ""

def get_return_explanation(ctx: ExplanationContext) -> str:
    return (
        f"If conditions are favourable, you will receive your full investment of ₹{ctx.payoff.principal_repayment:,.2f} "
        f"plus earnings of ₹{ctx.payoff.coupon_earned:,.2f}. The total amount returned would be ₹{ctx.payoff.total_maturity_value:,.2f}, "
        f"representing a return of {ctx.payoff.return_percentage:.2f}%."
    )

def get_loss_explanation(ctx: ExplanationContext) -> str:
    ptype = ctx.product.product_type
    if ptype == "ELN":
        return (
            f"If {ctx.product.underlying_asset} drops below the downside barrier, you will lose a portion of your original investment "
            f"proportional to the market drop. In the worst-case scenario, if the asset value goes to zero, you could lose your entire investment."
        )
    elif ptype == "DCD":
        return (
            f"If the exchange rate triggers a conversion, you will be paid back in the alternate currency. If that currency has weakened, "
            f"its actual value in your home currency will be lower than what you started with, leading to a financial loss."
        )
    elif ptype == "CPN":
        return (
            f"Although your principal is protected at maturity, if the market falls, you will not earn any extra return. "
            f"You may also lose purchasing power due to inflation over the {ctx.product.tenor}-year term."
        )
    return ""

def get_scenarios(ctx: ExplanationContext) -> str:
    if not ctx.simulation or not ctx.simulation.scenarios:
        return "No specific scenarios were modeled."
        
    lines = ["Here is what would happen under different market shifts:"]
    for sc in ctx.simulation.scenarios:
        lines.append(
            f"• Market shift of {sc.scenario_shock_percentage}%: "
            f"Your total returned value would be ₹{sc.maturity_value:,.2f} "
            f"({sc.return_percentage:.2f}% return)."
        )
    return "\n".join(lines)

def get_historical(ctx: ExplanationContext) -> str:
    if not ctx.backtest or not ctx.backtest.available:
        return "Historical backtesting data is not available for this configuration."
        
    return (
        f"Looking at historical data from {ctx.backtest.data_source}, out of {ctx.backtest.windows_tested} past periods, "
        f"this strategy experienced losses {ctx.backtest.loss_frequency:.1f}% of the time. "
        f"The worst historical outcome was a drop of {ctx.backtest.worst_outcome:.1f}%. "
        f"Remember, past performance does not guarantee future results."
    )

def get_suitability(ctx: ExplanationContext) -> str:
    lines = ["This section explains how the product matches your profile:"]
    for d in ctx.suitability.dimensions:
        status = d.status
        if status == "PASS":
            lines.append(f"✓ {d.dimension}: Matches your profile. {d.existing_explanation}")
        elif status == "WARNING":
            lines.append(f"⚠️ {d.dimension}: Warning. {d.existing_explanation}")
        elif status == "MISMATCH":
            lines.append(f"❌ {d.dimension}: Mismatch! {d.existing_explanation}")
        else:
            lines.append(f"ℹ️ {d.dimension}: Not enough data. {d.existing_explanation}")
    return "\n".join(lines)
