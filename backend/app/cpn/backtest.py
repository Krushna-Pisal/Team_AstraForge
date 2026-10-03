from __future__ import annotations

from typing import Optional, Dict, Any, List
from datetime import datetime
import numpy as np
import pandas as pd
from fastapi import HTTPException

from app.cpn.schemas import (
    CpnProductInput,
    CpnBacktestResponse,
    CpnHistogramBucket,
    CPN_RISK_NOTES,
)
from app.cpn.payoff import calculate_cpn_payoff_core
from app.market_data import _load_csv


def run_cpn_backtest(
    product: CpnProductInput,
    df: Optional[pd.DataFrame] = None,
) -> CpnBacktestResponse:
    """
    Run rolling-window historical backtest for CPN on real cached daily closes.
    
    Window definition:
    - Start one window on every trading day i
    - The window end is the start date plus the tenor in calendar time, using the nearest following trading day
    - Skip windows that run past the end of the data
    - Never use synthetic data or fake fallbacks
    """
    if df is None:
        try:
            df = _load_csv(product.underlying)
        except KeyError:
            raise HTTPException(
                status_code=404,
                detail=f"Underlying '{product.underlying}' not found in cached market data."
            )
        except FileNotFoundError:
            raise HTTPException(
                status_code=404,
                detail=f"Cached market data CSV for '{product.underlying}' was not found."
            )
        except Exception as e:
            raise HTTPException(
                status_code=422,
                detail=f"Error loading price history for '{product.underlying}': {str(e)}"
            )

    if df is None or df.empty or len(df) < 2:
        raise HTTPException(
            status_code=422,
            detail=f"Insufficient price history for underlying '{product.underlying}'."
        )

    # Normalize columns
    df = df.copy()
    if "date" not in df.columns or "close" not in df.columns:
        raise HTTPException(
            status_code=422,
            detail="Market data format error: missing 'date' or 'close' column."
        )

    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)

    # Calendar duration based on tenor
    months = int(round(product.tenor_years * 12))
    tenor_offset = pd.DateOffset(months=months)

    dates = df["date"].values
    closes = df["close"].values
    n = len(df)

    window_results: List[Dict[str, Any]] = []

    # Using searchsorted for efficient nearest-following trading day lookup
    for i in range(n):
        start_date = pd.Timestamp(dates[i])
        s0 = float(closes[i])
        target_end_date = start_date + tenor_offset

        # Find the earliest trading day on or after target_end_date
        # np.searchsorted finds first index where dates[j] >= target_end_date
        target_ts = np.datetime64(target_end_date)
        j = int(np.searchsorted(dates, target_ts, side="left"))

        if j >= n:
            # Runs past end of data
            continue

        end_date = pd.Timestamp(dates[j])
        st = float(closes[j])
        
        if s0 <= 0:
            continue

        r = (st - s0) / s0

        payoff = calculate_cpn_payoff_core(
            investment=product.investment,
            tenor_years=product.tenor_years,
            protection_pct=product.protection_pct,
            participation_pct=product.participation_pct,
            r=r,
            cap_pct=product.cap_pct,
            coupon_pct_pa=product.coupon_pct_pa,
        )

        # Annualised return: (1 + R)^(1/tenor) - 1
        ret_dec = payoff["return_pct"] / 100.0
        # Guard against base <= 0 for fractional power
        ann_ret_pct = ((max(1.0 + ret_dec, 0.0) ** (1.0 / product.tenor_years)) - 1.0) * 100.0

        window_results.append({
            "start_date": start_date,
            "end_date": end_date,
            "underlying_r": r,
            "final_amount": payoff["final_amount"],
            "return_pct": payoff["return_pct"],
            "ann_ret_pct": ann_ret_pct,
        })

    total_windows = len(window_results)
    if total_windows == 0:
        raise HTTPException(
            status_code=422,
            detail=f"Price history for '{product.underlying}' is too short for tenor of {product.tenor_years} years."
        )

    final_amounts = [w["final_amount"] for w in window_results]
    return_pcts = [w["return_pct"] for w in window_results]
    ann_rets = [w["ann_ret_pct"] for w in window_results]
    underlying_rs = [w["underlying_r"] for w in window_results]

    min_date = min(w["start_date"] for w in window_results)
    max_date = max(w["end_date"] for w in window_results)
    data_start_date = min_date.strftime("%Y-%m-%d")
    data_end_date = max_date.strftime("%Y-%m-%d")

    best_final_amount = round(float(np.max(final_amounts)), 2)
    best_return_pct = round(float(np.max(return_pcts)), 4)
    median_final_amount = round(float(np.median(final_amounts)), 2)
    median_return_pct = round(float(np.median(return_pcts)), 4)
    worst_final_amount = round(float(np.min(final_amounts)), 2)
    worst_return_pct = round(float(np.min(return_pcts)), 4)

    average_annualised_return_pct = round(float(np.mean(ann_rets)), 4)

    no_upside_count = sum(1 for r in underlying_rs if r <= 0)
    no_upside_windows_pct = round((no_upside_count / total_windows) * 100.0, 2)

    loss_count = sum(1 for ret in return_pcts if ret < 0)
    loss_windows_pct = round((loss_count / total_windows) * 100.0, 2)

    # 10-bucket histogram of return_pct
    min_ret = float(np.min(return_pcts))
    max_ret = float(np.max(return_pcts))
    if min_ret == max_ret:
        bin_edges = np.linspace(min_ret - 1.0, max_ret + 1.0, 11)
    else:
        bin_edges = np.linspace(min_ret, max_ret, 11)

    counts, _ = np.histogram(return_pcts, bins=bin_edges)
    histogram: List[CpnHistogramBucket] = []
    for k in range(10):
        histogram.append(
            CpnHistogramBucket(
                bin_start=round(float(bin_edges[k]), 2),
                bin_end=round(float(bin_edges[k+1]), 2),
                count=int(counts[k]),
                frequency_pct=round((int(counts[k]) / total_windows) * 100.0, 2),
            )
        )

    # Fixed Deposit comparison if fd_rate_pct_pa is given
    fd_comparison: Optional[Dict[str, Any]] = None
    if product.fd_rate_pct_pa is not None:
        fd_rate = float(product.fd_rate_pct_pa)
        fd_final = product.investment * ((1.0 + fd_rate / 100.0) ** product.tenor_years)
        beat_count = sum(1 for fa in final_amounts if fa > fd_final)
        beat_pct = round((beat_count / total_windows) * 100.0, 2)
        fd_comparison = {
            "fd_rate_pct_pa": fd_rate,
            "fd_final_amount": round(fd_final, 2),
            "beat_fd_pct": beat_pct,
            "disclaimer": "Assumed fixed-deposit rate (user-entered, not market data)"
        }

    num_years = round((max_date - min_date).days / 365.25, 1)
    data_note = f"{num_years} years of data, {total_windows} windows. Windows overlap, so independent periods are fewer than windows"

    return CpnBacktestResponse(
        total_windows=total_windows,
        data_start_date=data_start_date,
        data_end_date=data_end_date,
        best_final_amount=best_final_amount,
        best_return_pct=best_return_pct,
        median_final_amount=median_final_amount,
        median_return_pct=median_return_pct,
        worst_final_amount=worst_final_amount,
        worst_return_pct=worst_return_pct,
        average_annualised_return_pct=average_annualised_return_pct,
        no_upside_windows_pct=no_upside_windows_pct,
        loss_windows_pct=loss_windows_pct,
        histogram=histogram,
        fd_comparison=fd_comparison,
        data_note=data_note,
        source="Yahoo Finance via yfinance, daily adjusted closes",
        risk_notes=CPN_RISK_NOTES,
    )
