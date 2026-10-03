"""Refresh the bundled NIFTY snapshot explicitly; never synthesize fallback prices."""
from pathlib import Path
import sys
import pandas as pd
import yfinance as yf

CSV_PATH = Path(__file__).resolve().parents[1] / "data" / "NIFTY50.csv"


def fetch_data():
    df = yf.Ticker("^NSEI").history(period="10y", auto_adjust=True, timeout=15)
    if df is None or df.empty or "Close" not in df:
        raise RuntimeError("Provider returned no data; the existing snapshot was preserved.")
    frame = pd.DataFrame({"date": pd.to_datetime(df.index).strftime("%Y-%m-%d"), "close": df["Close"].to_numpy()})
    frame = frame.dropna().sort_values("date").drop_duplicates("date")
    if len(frame) < 100 or (frame["close"] <= 0).any():
        raise RuntimeError("Provider data failed validation; the existing snapshot was preserved.")
    CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary = CSV_PATH.with_suffix(".download.tmp")
    frame.to_csv(temporary, index=False)
    temporary.replace(CSV_PATH)
    print(f"Saved {len(frame)} actual provider observations through {frame['date'].iloc[-1]}.")


if __name__ == "__main__":
    try:
        fetch_data()
    except Exception as exc:
        print(f"Refresh failed: {exc}", file=sys.stderr)
        sys.exit(1)
