from __future__ import annotations

from typing import Optional, Dict, Any
import numpy as np
import pandas as pd

from app.cpn.schemas import (
    CpnProductInput,
    CpnLossMeasuresResponse,
)
from app.cpn.backtest import run_cpn_backtest


def calculate_cpn_loss_measures(
    product: CpnProductInput,
    df: Optional[pd.DataFrame] = None,
) -> CpnLossMeasuresResponse:
    """
    Compute CPN loss measures:
    1. max_principal_loss_pct = 100 - protection_pct
    2. worst_historical_loss_pct from CPN backtest
    3. p5_loss_pct from CPN backtest
    
    The strictest (highest) loss drives the loss flag and driving_measure.
    """
    max_principal_loss_pct = round(100.0 - float(product.protection_pct), 2)
    worst_historical_loss_pct: Optional[float] = None
    p5_loss_pct: Optional[float] = None
    data_note: Optional[str] = None

    try:
        bt_res = run_cpn_backtest(product, df=df)
        data_note = bt_res.data_note
        # worst_return_pct is a return (e.g. -10 for -10% loss)
        worst_ret = bt_res.worst_return_pct
        worst_historical_loss_pct = round(max(0.0, -worst_ret), 2)

        # For p5, we can re-evaluate or use histogram/windows
        # To get exact p5, run backtest on the same df
        # Let's extract window returns if needed
        # We can calculate p5 directly from the df if available
        # or calculate p5 from window evaluations
    except Exception:
        # If market data cannot be loaded, keep historical metrics None
        pass

    # If backtest ran, let's also compute exact p5_loss_pct
    if worst_historical_loss_pct is not None and df is not None:
        try:
            # Quick recalculation of p5 from df
            from app.cpn.payoff import calculate_cpn_payoff_core
            n = len(df)
            months = int(round(product.tenor_years * 12))
            tenor_offset = pd.DateOffset(months=months)
            dates = pd.to_datetime(df["date"]).values
            closes = df["close"].values
            returns = []
            for i in range(n):
                start_date = pd.Timestamp(dates[i])
                target_end_date = start_date + tenor_offset
                j = int(np.searchsorted(dates, np.datetime64(target_end_date), side="left"))
                if j < n and closes[i] > 0:
                    r = (closes[j] - closes[i]) / closes[i]
                    p = calculate_cpn_payoff_core(
                        investment=product.investment,
                        tenor_years=product.tenor_years,
                        protection_pct=product.protection_pct,
                        participation_pct=product.participation_pct,
                        r=r,
                        cap_pct=product.cap_pct,
                        coupon_pct_pa=product.coupon_pct_pa,
                    )
                    returns.append(p["return_pct"])
            if returns:
                p5_ret = float(np.percentile(returns, 5))
                p5_loss_pct = round(max(0.0, -p5_ret), 2)
        except Exception:
            pass
    elif worst_historical_loss_pct is not None:
        # Load from loader to calculate p5
        try:
            from app.market_data import _load_csv
            from app.cpn.payoff import calculate_cpn_payoff_core
            mdf = _load_csv(product.underlying)
            n = len(mdf)
            months = int(round(product.tenor_years * 12))
            tenor_offset = pd.DateOffset(months=months)
            dates = pd.to_datetime(mdf["date"]).values
            closes = mdf["close"].values
            returns = []
            for i in range(n):
                start_date = pd.Timestamp(dates[i])
                target_end_date = start_date + tenor_offset
                j = int(np.searchsorted(dates, np.datetime64(target_end_date), side="left"))
                if j < n and closes[i] > 0:
                    r = (closes[j] - closes[i]) / closes[i]
                    p = calculate_cpn_payoff_core(
                        investment=product.investment,
                        tenor_years=product.tenor_years,
                        protection_pct=product.protection_pct,
                        participation_pct=product.participation_pct,
                        r=r,
                        cap_pct=product.cap_pct,
                        coupon_pct_pa=product.coupon_pct_pa,
                    )
                    returns.append(p["return_pct"])
            if returns:
                p5_ret = float(np.percentile(returns, 5))
                p5_loss_pct = round(max(0.0, -p5_ret), 2)
        except Exception:
            pass

    # Collect available candidates
    candidates: Dict[str, float] = {
        "max_principal_loss_pct": max_principal_loss_pct
    }
    if worst_historical_loss_pct is not None:
        candidates["worst_historical_loss_pct"] = worst_historical_loss_pct
    if p5_loss_pct is not None:
        candidates["p5_loss_pct"] = p5_loss_pct

    driving_measure = max(candidates, key=candidates.get)
    strictest_loss_pct = candidates[driving_measure]

    return CpnLossMeasuresResponse(
        max_principal_loss_pct=max_principal_loss_pct,
        worst_historical_loss_pct=worst_historical_loss_pct,
        p5_loss_pct=p5_loss_pct,
        strictest_loss_pct=strictest_loss_pct,
        driving_measure=driving_measure,
        data_note=data_note,
    )
