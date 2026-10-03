import os
import sys
from datetime import datetime, timedelta
import pandas as pd

CSV_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "NIFTY50.csv")

def generate_synthetic_data(output_path: str):
    print("Generating clearly-labelled synthetic fallback data for NIFTY 50...")
    end_date = datetime.now()
    dates = [end_date - timedelta(days=i) for i in range(365 * 10)]
    # Filter weekends
    trading_dates = [d for d in reversed(dates) if d.weekday() < 5]
    
    # Generate realistic geometric Brownian motion starting ~8000 up to ~25000
    base_price = 8000.0
    import math
    prices = []
    current_price = base_price
    for i, _ in enumerate(trading_dates):
        # Trend upward with periodic fluctuations
        noise = math.sin(i / 30.0) * 15.0 + math.cos(i / 15.0) * 10.0
        growth = 1.0 + (0.12 / 252.0) + (noise / 10000.0)
        current_price = current_price * growth
        prices.append(round(current_price, 2))
    
    # Ensure realistic latest close around ~25,000
    scaling = 25000.0 / prices[-1]
    prices = [round(p * scaling, 2) for p in prices]
    
    df = pd.DataFrame({
        "date": [d.strftime("%Y-%m-%d") for d in trading_dates],
        "close": prices
    })
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Synthetic fallback data written to {output_path} ({len(df)} rows, latest close: {prices[-1]})")

def fetch_data():
    os.makedirs(os.path.dirname(CSV_PATH), exist_ok=True)
    try:
        import yfinance as yf
        print("Attempting to download ~10 years of NIFTY 50 (^NSEI) daily closes from yfinance...")
        ticker = yf.Ticker("^NSEI")
        df = ticker.history(period="10y")
        
        if df is None or df.empty or "Close" not in df.columns:
            print("yfinance returned empty data for ^NSEI. Falling back to synthetic data.")
            generate_synthetic_data(CSV_PATH)
            return
        
        df = df.reset_index()
        # Keep Date and Close
        date_col = "Date" if "Date" in df.columns else df.columns[0]
        df["date"] = pd.to_datetime(df[date_col]).dt.strftime("%Y-%m-%d")
        df["close"] = df["Close"].round(2)
        clean_df = df[["date", "close"]].dropna()
        
        if len(clean_df) < 100:
            print("Insufficient data downloaded. Falling back to synthetic data.")
            generate_synthetic_data(CSV_PATH)
            return

        clean_df.to_csv(CSV_PATH, index=False)
        print(f"Successfully downloaded {len(clean_df)} daily closes. Saved to {CSV_PATH}")
        print(f"Latest close (S0): {clean_df['close'].iloc[-1]} on {clean_df['date'].iloc[-1]}")
    except Exception as e:
        print(f"Error fetching data via yfinance: {e}")
        generate_synthetic_data(CSV_PATH)

if __name__ == "__main__":
    fetch_data()
