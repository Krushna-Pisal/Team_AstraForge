"""Deterministic simulations. Services consume these functions directly."""
from math import ceil
import numpy as np
from app.domain import DomainError
from app.phase3_sim_models import (
    ScenarioRequest, ScenarioResponse, ScenarioResult, BacktestRequest,
    BacktestResponse, BacktestWindowResult, RiskMetrics,
)
from app.phase2_engines import calculate_eln_payoff, calculate_dcd_payoff, calculate_cpn_payoff
from app.phase3_market_data import get_historical_market_data, clean_prices, get_instrument

DEFAULT_SCENARIOS = [-50, -40, -30, -20, -10, 0, 10, 20, 30]


def outcome(product_type, cfg, initial, final, path):
    shock = (final / initial - 1) * 100
    if product_type == "ELN":
        data = cfg.model_dump()
        data.update(initial_price=initial, final_price=final, observed_prices=path, barrier_breached=None)
        res = calculate_eln_payoff(type(cfg).model_validate(data))
        return ScenarioResult(scenario_shock_pct=shock, initial_price=initial, underlying_final_level=final,
            underlying_return_pct=shock, maturity_value=res.total_maturity_value, profit_loss=res.absolute_profit_loss,
            return_pct=res.return_pct, principal_repayment=res.principal_repayment, coupon_earned=res.coupon_earned,
            value_currency=cfg.investment_currency, explanation=res.payoff_explanation, barrier_breached=res.barrier_breached,
            strike_touched_or_below=final <= res.strike_price)
    if product_type == "DCD":
        # Preserve contractual strike/initial ratio when repricing each historical window.
        strike = initial * cfg.conversion_strike_rate / cfg.initial_fx_rate
        data = cfg.model_dump()
        data.update(initial_fx_rate=initial, maturity_fx_rate=final, conversion_strike_rate=strike)
        res = calculate_dcd_payoff(type(cfg).model_validate(data))
        return ScenarioResult(scenario_shock_pct=shock, initial_price=initial, underlying_final_level=final,
            underlying_return_pct=shock, maturity_value=res.total_value_deposit_currency, profit_loss=res.absolute_profit_loss,
            return_pct=res.effective_return_pct, principal_repayment=res.principal_value_deposit_currency,
            coupon_earned=res.coupon_amount, value_currency=cfg.deposit_currency, explanation=res.explanation,
            conversion_occurred=res.conversion_occurred, repayment_currency=res.repayment_currency,
            settlement_principal=res.principal_repayment_amount)
    data = cfg.model_dump()
    data.update(initial_price=initial, final_price=final)
    res = calculate_cpn_payoff(type(cfg).model_validate(data))
    return ScenarioResult(scenario_shock_pct=shock, initial_price=initial, underlying_final_level=final,
        underlying_return_pct=shock, maturity_value=res.total_maturity_value, profit_loss=res.absolute_profit_loss,
        return_pct=res.return_pct, principal_repayment=res.protected_principal, coupon_earned=res.coupon,
        value_currency=cfg.investment_currency, explanation=res.explanation, protection_active=res.protection_active, cap_applied=res.cap_applied,
        participation_gain=res.participation_gain)


def simulate_scenarios(req: ScenarioRequest) -> ScenarioResponse:
    cfg = req.config
    initial = cfg.initial_fx_rate if req.product_type == "DCD" else cfg.initial_price
    results = []
    for shock in req.custom_scenarios if req.custom_scenarios is not None else DEFAULT_SCENARIOS:
        final = initial * (1 + shock / 100)
        row = outcome(req.product_type, cfg, initial, final, [initial, final])
        row.scenario_shock_pct = shock
        results.append(row)
    return ScenarioResponse(product_type=req.product_type, results=results,
        assumptions="Hypothetical shocks, not probabilities. Daily ELN scenarios assume a monotonic path between endpoints; intraperiod recovery/breach is not modeled here. All monetary totals and P/L use value_currency; DCD settlement legs can differ.")


def run_backtest(req: BacktestRequest) -> BacktestResponse:
    market = get_instrument(req.ticker).model_dump()
    cfg = req.config
    if req.product_type == "DCD":
        if market.get("deposit") != cfg.deposit_currency or market.get("alternate") != cfg.alternate_currency:
            raise DomainError("FX_PAIR_MISMATCH", "Historical FX quote must be alternate units per deposit currency unit.")
    elif market["kind"] != "equity":
        raise DomainError("UNDERLYING_MISMATCH", "ELN and CPN require an equity underlying.")
    df = clean_prices(get_historical_market_data(req.ticker))
    source = df.attrs.get("source", "Provided historical observations")
    if req.start_date:
        df = df[df["date"] >= req.start_date.isoformat()]
    if req.end_date:
        df = df[df["date"] <= req.end_date.isoformat()]
    df = df.reset_index(drop=True)
    intervals = max(1, ceil(cfg.tenor_years * 252))
    if len(df) <= intervals:
        raise DomainError("INSUFFICIENT_HISTORY", f"Need {intervals + 1} observations for this tenor; only {len(df)} are available.")
    windows = []
    for i in range(len(df) - intervals):
        path = df["close"].iloc[i:i + intervals + 1].tolist()
        row = outcome(req.product_type, cfg, path[0], path[-1], path)
        windows.append(BacktestWindowResult(start_date=df["date"].iloc[i], maturity_date=df["date"].iloc[i + intervals],
            initial_price=path[0], final_price=path[-1], min_observed_price=min(path),
            barrier_breached=row.barrier_breached, conversion_occurred=row.conversion_occurred,
            protection_active=row.protection_active, principal_repayment=row.principal_repayment,
            coupon_earned=row.coupon_earned, total_maturity_value=row.maturity_value,
            absolute_profit_loss=row.profit_loss, return_pct=row.return_pct))
    returns = np.array([w.return_pct for w in windows])
    total = len(windows)
    breaches = sum(w.barrier_breached is True for w in windows)
    metrics = RiskMetrics(total_windows=total, average_return=float(returns.mean()), median_return=float(np.median(returns)),
        best_return=float(returns.max()), worst_return=float(returns.min()),
        loss_frequency_pct=float(np.mean(returns < -1e-9) * 100), win_frequency_pct=float(np.mean(returns > 1e-9) * 100),
        zero_return_frequency_pct=float(np.mean(np.abs(returns) <= 1e-9) * 100),
        barrier_breaches=breaches if req.product_type == "ELN" else None,
        barrier_breach_freq_pct=breaches / total * 100 if req.product_type == "ELN" else None,
        conversion_frequency_pct=sum(w.conversion_occurred is True for w in windows) / total * 100 if req.product_type == "DCD" else None)
    return BacktestResponse(ticker=req.ticker, product_type=req.product_type, windows=windows, metrics=metrics,
        data_source=source, data_as_of=df["date"].iloc[-1], value_currency=cfg.deposit_currency if req.product_type == "DCD" else cfg.investment_currency,
        assumptions=f"Historical simulation using {intervals} trading intervals ({intervals + 1} closing observations) per window; 252 intervals/year approximates tenor. Daily barriers use only each window's full path. DCD strike/initial ratio is held constant. Overlapping windows are not independent. Not a prediction; no fees, taxes, issuer default or intraday lows.")
