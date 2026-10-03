"""
Market data loader for the Payoff Simulator.

Reads a cached CSV file and returns price metadata.
This module NEVER calls yfinance at runtime — data must be pre-fetched
by running scripts/fetch_data.py.
"""

from __future__ import annotations

import os
import functools
from pathlib import Path

import pandas as pd

# Path: backend/data/NIFTY50.csv (relative to this file's parent's parent)
_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_CSV_PATHS: dict[str, Path] = {
    "NIFTY50": _DATA_DIR / "NIFTY50.csv",
}


@functools.lru_cache(maxsize=8)
def _load_csv(underlying: str) -> pd.DataFrame:
    """
    Load and cache the CSV for a given underlying.

    Parameters
    ----------
    underlying : str
        The ticker key, e.g. "NIFTY50".

    Returns
    -------
    pd.DataFrame
        DataFrame with columns ['date', 'close'], sorted ascending by date.

    Raises
    ------
    FileNotFoundError
        If the CSV file does not exist (run scripts/fetch_data.py first).
    ValueError
        If the CSV is empty or malformed.
    """
    csv_path = _CSV_PATHS.get(underlying)
    if csv_path is None:
        raise KeyError(f"Unknown underlying: {underlying!r}. Valid: {list(_CSV_PATHS)}")

    if not csv_path.exists():
        raise FileNotFoundError(
            f"Market data CSV not found at {csv_path}. "
            "Run `python backend/scripts/fetch_data.py` first."
        )

    df = pd.read_csv(csv_path, parse_dates=["date"])
    if df.empty or "close" not in df.columns:
        raise ValueError(f"CSV at {csv_path} is empty or missing 'close' column.")

    df = df.sort_values("date").reset_index(drop=True)
    df["close"] = df["close"].astype(float)
    return df


def get_price_info(underlying: str) -> dict:
    """
    Return summary price information for the given underlying.

    Parameters
    ----------
    underlying : str
        The ticker key, e.g. "NIFTY50".

    Returns
    -------
    dict
        Keys: s0 (latest close), start_date, end_date, count.
    """
    df = _load_csv(underlying)
    return {
        "s0": float(df["close"].iloc[-1]),
        "start_date": df["date"].iloc[0].strftime("%Y-%m-%d"),
        "end_date": df["date"].iloc[-1].strftime("%Y-%m-%d"),
        "count": len(df),
    }


def get_daily_closes(underlying: str) -> list[float]:
    """
    Return all daily closes as a list (ascending date order).

    Parameters
    ----------
    underlying : str
        The ticker key, e.g. "NIFTY50".

    Returns
    -------
    list[float]
        Daily closing prices, oldest first.
    """
    df = _load_csv(underlying)
    return df["close"].tolist()


def get_s0(underlying: str) -> float:
    """Return the latest (reference) closing price S0."""
    df = _load_csv(underlying)
    return float(df["close"].iloc[-1])
