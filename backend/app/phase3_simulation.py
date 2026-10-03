from typing import List
import numpy as np
from app.phase3_sim_models import (
    ScenarioRequest, ScenarioResponse, ScenarioResult,
    BacktestRequest, BacktestResponse, BacktestWindowResult, RiskMetrics
)
from app.phase2_engines import (
    calculate_eln_payoff, calculate_dcd_payoff, calculate_cpn_payoff
)
from app.phase3_market_data import get_historical_market_data

DEFAULT_SCENARIOS = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40]

def simulate_scenarios(req: ScenarioRequest) -> ScenarioResponse:
    shocks = req.custom_scenarios if req.custom_scenarios else DEFAULT_SCENARIOS
    results = []

    if req.product_type == "ELN" and req.eln_config:
        cfg = req.eln_config
        barrier_price = cfg.initial_price * (cfg.barrier_pct / 100.0)
        for shock in shocks:
            final_p = cfg.initial_price * (1 + shock / 100.0)
            # Assumption: if final < barrier, breached. Else not breached (hypothetical proxy)
            breached = final_p <= barrier_price
            
            sim_req = cfg.model_copy(update={
                "final_price": final_p,
                "barrier_breached": breached
            })
            res = calculate_eln_payoff(sim_req)
            
            results.append(ScenarioResult(
                scenario_shock_pct=shock,
                underlying_final_level=final_p,
                maturity_value=res.total_maturity_value,
                profit_loss=res.absolute_profit_loss,
                return_pct=res.return_pct,
                explanation=res.payoff_explanation + " (Assumes barrier breach is proxy determined solely by final price for hypothetical scenario)."
            ))
            
    elif req.product_type == "DCD" and req.dcd_config:
        cfg = req.dcd_config
        for shock in shocks:
            final_fx = cfg.initial_fx_rate * (1 + shock / 100.0)
            sim_req = cfg.model_copy(update={
                "maturity_fx_rate": final_fx
            })
            res = calculate_dcd_payoff(sim_req)
            
            results.append(ScenarioResult(
                scenario_shock_pct=shock,
                underlying_final_level=final_fx,
                maturity_value=res.total_maturity_repayment,
                profit_loss=0.0, # Handled via return_pct
                return_pct=res.effective_return_pct,
                explanation=res.explanation,
                conversion_occurred=res.conversion_occurred
            ))

    elif req.product_type == "CPN" and req.cpn_config:
        cfg = req.cpn_config
        for shock in shocks:
            final_p = cfg.initial_price * (1 + shock / 100.0)
            sim_req = cfg.model_copy(update={
                "final_price": final_p
            })
            res = calculate_cpn_payoff(sim_req)
            
            results.append(ScenarioResult(
                scenario_shock_pct=shock,
                underlying_final_level=final_p,
                maturity_value=res.total_maturity_value,
                profit_loss=res.absolute_profit_loss,
                return_pct=res.return_pct,
                explanation=res.explanation
            ))
            
    else:
        raise ValueError("Invalid product configuration for the selected product_type.")

    return ScenarioResponse(
        product_type=req.product_type,
        results=results
    )


def run_backtest(req: BacktestRequest) -> BacktestResponse:
    if req.product_type != "ELN" or not req.eln_config:
        raise ValueError("Historical backtesting currently only supports ELN.")

    df = get_historical_market_data(req.ticker)
    
    # Filter by date if provided
    if req.start_date:
        df = df[df["date"] >= req.start_date]
    if req.end_date:
        df = df[df["date"] <= req.end_date]
        
    df = df.reset_index(drop=True)
    
    cfg = req.eln_config
    # 1 year ~ 252 trading days
    window_size = int(cfg.tenor_years * 252)
    
    if len(df) < window_size:
        raise ValueError(f"Insufficient historical data. Have {len(df)} days, need {window_size} days for tenor.")

    windows = []
    
    # Loop over rolling windows
    for i in range(len(df) - window_size + 1):
        start_date = df["date"].iloc[i]
        end_date = df["date"].iloc[i + window_size - 1]
        
        initial_price = float(df["close"].iloc[i])
        final_price = float(df["close"].iloc[i + window_size - 1])
        
        # Path for the window
        path = df["close"].iloc[i : i + window_size]
        min_observed_price = float(path.min())
        
        barrier_price = initial_price * (cfg.barrier_pct / 100.0)
        
        if cfg.barrier_monitoring == "daily":
            breached = min_observed_price <= barrier_price
        else: # maturity
            breached = final_price <= barrier_price
            
        sim_req = cfg.model_copy(update={
            "initial_price": initial_price,
            "final_price": final_price,
            "barrier_breached": breached
        })
        
        res = calculate_eln_payoff(sim_req)
        
        windows.append(BacktestWindowResult(
            start_date=start_date,
            maturity_date=end_date,
            initial_price=initial_price,
            final_price=final_price,
            min_observed_price=min_observed_price,
            barrier_breached=breached,
            principal_repayment=res.principal_repayment,
            coupon_earned=res.coupon_earned,
            total_maturity_value=res.total_maturity_value,
            absolute_profit_loss=res.absolute_profit_loss,
            return_pct=res.return_pct
        ))

    # Calculate metrics
    returns = [w.return_pct for w in windows]
    breaches = sum(1 for w in windows if w.barrier_breached)
    wins = sum(1 for r in returns if r > 0)
    losses = sum(1 for r in returns if r < 0)
    total = len(windows)
    
    metrics = RiskMetrics(
        total_windows=total,
        average_return=float(np.mean(returns)),
        median_return=float(np.median(returns)),
        best_return=float(np.max(returns)),
        worst_return=float(np.min(returns)),
        loss_frequency_pct=(losses / total) * 100.0,
        win_frequency_pct=(wins / total) * 100.0,
        barrier_breaches=breaches,
        barrier_breach_freq_pct=(breaches / total) * 100.0
    )

    return BacktestResponse(
        ticker=req.ticker,
        product_type=req.product_type,
        windows=windows,
        metrics=metrics,
        data_source="yfinance (Historical Adjusted Closing Prices)",
        assumptions="Uses rolling historical windows evaluating actual daily paths. Does not guarantee future performance."
    )
