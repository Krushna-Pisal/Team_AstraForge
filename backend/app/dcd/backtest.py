"""
Real-data historical rolling backtest engine for Dual Currency Deposit (DCD).
Strictly uses cached real market prices or Yahoo Finance data. Zero fake data.
"""

from datetime import datetime, timedelta
from typing import List, Optional
import numpy as np
import pandas as pd
from fastapi import HTTPException
from app.dcd.schemas import (
    DcdProductInput,
    DcdBacktestResponse,
    DcdHistogramBucket,
)
from app.dcd.payoff import calculate_dcd_payoff_core


def run_dcd_backtest(product: DcdProductInput) -> DcdBacktestResponse:
    """
    Run rolling calendar-tenor historical backtest on real daily exchange rate data.
    """
    pair = product.pair
    tenor_years = float(product.tenor_years)
    tenor_days = int(round(tenor_years * 365.25))
    if tenor_days < 7:
        tenor_days = 7

    # Load historical daily closes
    try:
        from app.phase3_market_data import get_historical_market_data
        df = get_historical_market_data(pair, "10y")
    except Exception as exc:
        raise HTTPException(
            status_code=404,
            detail=f"Historical price data unavailable for currency pair {pair!r}: {exc}"
        )

    if df is None or len(df) < 30:
        raise HTTPException(
            status_code=422,
            detail=f"Insufficient historical data for {pair}. At least 30 trading days required (found {len(df) if df is not None else 0})."
        )

    dates = pd.to_datetime(df["date"], errors="coerce")
    closes = pd.to_numeric(df["close"], errors="coerce").values
    n = len(df)

    # Base reference strike moneyness ratio: K / S_0
    contract_s0 = product.initial_fx_rate if (product.initial_fx_rate and product.initial_fx_rate > 0) else closes[-1]
    strike_ratio = float(product.conversion_strike_rate) / float(contract_s0)

    window_returns: List[float] = []
    conversions: List[bool] = []
    fd_beats: List[bool] = []

    # Calculate fixed deposit benchmark return if requested
    has_fd = product.fd_rate_pct_pa is not None and product.fd_rate_pct_pa >= 0
    fd_ret = 0.0
    if has_fd:
        # Simple/compounded benchmark return over tenor
        fd_ret = ((1.0 + float(product.fd_rate_pct_pa) / 100.0) ** tenor_years - 1.0) * 100.0

    # Rolling window loop: start on every trading day
    j = 0
    for i in range(n):
        start_date = dates.iloc[i]
        target_date = start_date + timedelta(days=tenor_days)

        # Advance pointer j to find nearest trading day on or after target_date
        while j < n and dates.iloc[j] < target_date:
            j += 1

        if j >= n:
            # Reached end of available data
            break

        s_start = float(closes[i])
        s_end = float(closes[j])
        if s_start <= 0 or s_end <= 0:
            continue

        # Dynamic window strike holding contract moneyness constant
        window_strike = s_start * strike_ratio

        # Create window product config with window-specific strike and initial spot
        window_prod = DcdProductInput(
            pair=product.pair,
            deposit_currency=product.deposit_currency,
            alternate_currency=product.alternate_currency,
            deposit_amount=product.deposit_amount,
            tenor_years=product.tenor_years,
            conversion_strike_rate=window_strike,
            initial_fx_rate=s_start,
            conversion_condition=product.conversion_condition,
            coupon_pct_pa=product.coupon_pct_pa,
            fd_rate_pct_pa=product.fd_rate_pct_pa,
        )

        outcome = calculate_dcd_payoff_core(window_prod, s_end)
        ret = outcome.return_pct
        window_returns.append(ret)
        conversions.append(outcome.conversion_occurred)

        if has_fd:
            fd_beats.append(ret > fd_ret)

    total_windows = len(window_returns)
    if total_windows == 0:
        raise HTTPException(
            status_code=422,
            detail=f"Data span for {pair} is shorter than the requested tenor ({tenor_years} years). No complete historical windows could be evaluated."
        )

    returns_arr = np.array(window_returns, dtype=float)
    conversion_freq = (sum(conversions) / total_windows) * 100.0
    win_freq = (float(np.sum(returns_arr > 0)) / total_windows) * 100.0
    loss_freq = (float(np.sum(returns_arr < 0)) / total_windows) * 100.0

    best_ret = float(np.max(returns_arr))
    worst_ret = float(np.min(returns_arr))
    median_ret = float(np.median(returns_arr))
    avg_annualized = float(np.mean(returns_arr) / tenor_years)

    # 10-bucket histogram
    min_val = float(np.min(returns_arr))
    max_val = float(np.max(returns_arr))
    if np.isclose(min_val, max_val):
        max_val = min_val + 1.0

    bins = np.linspace(min_val, max_val, 11)
    counts, _ = np.histogram(returns_arr, bins=bins)
    histogram: List[DcdHistogramBucket] = []
    for k in range(10):
        b_count = int(counts[k])
        histogram.append(
            DcdHistogramBucket(
                bucket_min=round(float(bins[k]), 2),
                bucket_max=round(float(bins[k + 1]), 2),
                count=b_count,
                pct=round((b_count / total_windows) * 100.0, 2),
            )
        )

    fd_outperformed_pct = None
    if has_fd and len(fd_beats) > 0:
        fd_outperformed_pct = round((sum(fd_beats) / total_windows) * 100.0, 2)

    years_of_data = round((dates.iloc[-1] - dates.iloc[0]).days / 365.25, 1)
    data_note = f"{years_of_data} years of data, {total_windows:,} windows. Windows overlap, so independent periods are fewer than windows."
    source = df.attrs.get("source", "Yahoo Finance via yfinance (daily closes)")

    return DcdBacktestResponse(
        pair=product.pair,
        deposit_currency=product.deposit_currency,
        alternate_currency=product.alternate_currency,
        total_windows=total_windows,
        data_start_date=str(df["date"].iloc[0]),
        data_end_date=str(df["date"].iloc[-1]),
        conversion_frequency_pct=round(conversion_freq, 2),
        win_frequency_pct=round(win_freq, 2),
        loss_frequency_pct=round(loss_freq, 2),
        best_return_pct=round(best_ret, 2),
        median_return_pct=round(median_ret, 2),
        worst_return_pct=round(worst_ret, 2),
        average_annualized_return_pct=round(avg_annualized, 2),
        histogram=histogram,
        fd_outperformed_pct=fd_outperformed_pct,
        data_note=data_note,
        source=source,
    )
