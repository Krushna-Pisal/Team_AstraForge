import yfinance as yf
import pandas as pd
from typing import List, Dict, Any
from datetime import datetime
import functools
import os

# Optional caching mechanism
@functools.lru_cache(maxsize=16)
def get_historical_market_data(ticker: str = "^NSEI", period: str = "10y") -> pd.DataFrame:
    """
    Fetch historical data from yfinance. Uses LRU cache to avoid repeated hits in same run.
    """
    try:
        tkr = yf.Ticker(ticker)
        df = tkr.history(period=period)
        
        if df.empty:
            raise ValueError(f"No data returned for ticker {ticker}")
            
        df = df.reset_index()
        # Rename columns to standard lowercase
        date_col = "Date" if "Date" in df.columns else df.columns[0]
        
        # Ensure we have required columns, handle missing
        required = ["Open", "High", "Low", "Close"]
        for col in required:
            if col not in df.columns:
                df[col] = df["Close"] if "Close" in df.columns else 0.0

        # Adjust column names
        df["date"] = pd.to_datetime(df[date_col]).dt.strftime("%Y-%m-%d")
        df["open"] = df["Open"].round(4)
        df["high"] = df["High"].round(4)
        df["low"] = df["Low"].round(4)
        df["close"] = df["Close"].round(4)
        
        df["adj_close"] = df["Adj Close"].round(4) if "Adj Close" in df.columns else df["close"]
        df["volume"] = df["Volume"] if "Volume" in df.columns else 0
        
        # Clean data
        clean_df = df[["date", "open", "high", "low", "close", "adj_close", "volume"]].dropna()
        clean_df = clean_df.drop_duplicates(subset=["date"])
        clean_df = clean_df.sort_values("date").reset_index(drop=True)
        
        return clean_df
    except Exception as e:
        raise RuntimeError(f"Error fetching data from yfinance: {str(e)}")

def get_latest_price(ticker: str = "^NSEI") -> float:
    df = get_historical_market_data(ticker, period="1mo")
    return float(df["close"].iloc[-1])
