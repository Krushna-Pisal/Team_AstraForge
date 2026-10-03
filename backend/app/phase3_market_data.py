"""Yahoo symbol discovery, supported asset validation and explicit provenance."""
from collections.abc import Mapping
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, get_args
import re
import functools
import numpy as np
import pandas as pd
import yfinance as yf
from app.domain import DomainError, DomainModel, Currency

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "NIFTY50.csv"
MARKETS = {
    "^NSEI": {"label": "NIFTY 50", "currency": "INR", "kind": "equity"},
    "USDINR=X": {"label": "USD / INR", "currency": "INR", "kind": "fx", "deposit": "USD", "alternate": "INR"},
    "EURUSD=X": {"label": "EUR / USD", "currency": "USD", "kind": "fx", "deposit": "EUR", "alternate": "USD"},
    "GBPUSD=X": {"label": "GBP / USD", "currency": "USD", "kind": "fx", "deposit": "GBP", "alternate": "USD"},
}
PERIODS = {"1mo": 31, "1y": 366, "5y": 1830, "10y": 3660}


class MarketInstrument(DomainModel):
    ticker: str
    label: str
    currency: Currency
    kind: Literal["equity", "fx"]
    deposit: Currency | None = None
    alternate: Currency | None = None


class PricePoint(DomainModel):
    date: str
    close: float


class MarketHistory(DomainModel):
    ticker: str
    source: str
    as_of: str
    fetched_at: str
    count: int
    latest_price: float
    currency: str
    warnings: list[str]
    prices: list[PricePoint]
    instrument: MarketInstrument | None = None
    cache_status: Literal["fresh", "cached", "stale", "snapshot"] = "snapshot"


class SearchResult(DomainModel):
    ticker: str
    label: str
    kind: Literal["equity", "fx"]
    exchange: str = ""


class SearchResponse(DomainModel):
    results: list[SearchResult]
    warning: str | None = None


def validate_ticker(ticker: str) -> str:
    ticker = ticker.strip().upper()
    if not re.fullmatch(r"[A-Z0-9^][A-Z0-9.^=\-]{0,31}", ticker):
        raise DomainError("UNSUPPORTED_TICKER", "Choose a valid symbol from the underlying search.")
    return ticker


def fx_currencies(ticker: str):
    if not ticker.endswith("=X"):
        return None
    pair = ticker[:-2]
    if len(pair) == 3:
        pair = "USD" + pair  # Yahoo shorthand, e.g. INR=X means USD/INR.
    if len(pair) != 6 or pair[:3] == pair[3:]:
        return None
    codes = get_args(Currency)
    return (pair[:3], pair[3:]) if pair[:3] in codes and pair[3:] in codes else None


@functools.lru_cache(maxsize=128)
def _search_yahoo(query: str, cache_hour: int):
    try:
        return yf.Search(query, max_results=30, news_count=0, timeout=10).quotes
    except Exception as exc:
        raise DomainError("SEARCH_UNAVAILABLE", "Yahoo Finance search is unavailable. Try again shortly.", 503) from exc


def search_underlyings(query: str = "", kind: str = "equity") -> SearchResponse:
    if kind not in ("equity", "fx"):
        raise DomainError("INVALID_MARKET_TYPE", "Choose equities or currency pairs.")
    query = query.strip()
    if len(query) > 80:
        raise DomainError("INVALID_SEARCH", "Use a shorter company name or symbol.")
    results = {}
    # The bundled catalog is explicitly a starting list, not Yahoo's full universe.
    for ticker, entry in MARKETS.items():
        if entry["kind"] == kind and (not query or query.lower() in (ticker + entry["label"]).lower()):
            results[ticker] = SearchResult(ticker=ticker, label=entry["label"], kind=kind)
    warning = None
    if query:
        try:
            quotes = _search_yahoo(query, int(datetime.now(timezone.utc).timestamp() // 3600))
            for quote in quotes:
                ticker = str(quote.get("symbol", "")).upper()
                quote_type = quote.get("quoteType")
                if not re.fullmatch(r"[A-Z0-9^][A-Z0-9.^=\-]{0,31}", ticker):
                    continue
                allowed = quote_type in ("EQUITY", "INDEX", "ETF") if kind == "equity" else quote_type == "CURRENCY" and fx_currencies(ticker) is not None
                if allowed:
                    results[ticker] = SearchResult(ticker=ticker, label=quote.get("shortname") or quote.get("longname") or ticker,
                        kind=kind, exchange=quote.get("exchDisp") or quote.get("exchange") or "")
        except DomainError:
            if not results:
                raise
            warning = "Yahoo Finance search is unavailable. Only matching saved catalog entries are shown."
    return SearchResponse(results=list(results.values()), warning=warning)


@functools.lru_cache(maxsize=128)
def _resolve_instrument(ticker: str, cache_hour: int) -> MarketInstrument:
    try:
        metadata = yf.Ticker(ticker).get_history_metadata()
    except Exception as exc:
        raise DomainError("MARKET_DATA_UNAVAILABLE", "Could not verify this underlying with Yahoo Finance. Please retry.", 503) from exc
    if not isinstance(metadata, Mapping) or not metadata:
        raise DomainError("UNSUPPORTED_TICKER", "Yahoo Finance could not find this underlying.")
    kind = metadata.get("instrumentType")
    if kind in ("EQUITY", "INDEX", "ETF"):
        currency = metadata.get("currency")
        if currency not in get_args(Currency):
            raise DomainError("UNSUPPORTED_CURRENCY", "This underlying uses a currency or quote unit not supported by the simulator.")
        return MarketInstrument(ticker=ticker, label=metadata.get("longName") or metadata.get("shortName") or ticker,
            currency=currency, kind="equity")
    pair = fx_currencies(ticker)
    if kind == "CURRENCY" and pair:
        return MarketInstrument(ticker=ticker, label=" / ".join(pair), currency=pair[1], kind="fx", deposit=pair[0], alternate=pair[1])
    raise DomainError("UNSUPPORTED_TICKER", "Choose a stock, index, ETF or supported currency pair. Other asset types are not supported.")


def get_instrument(ticker: str) -> MarketInstrument:
    ticker = validate_ticker(ticker)
    if ticker in MARKETS:
        return MarketInstrument(ticker=ticker, **MARKETS[ticker])
    return _resolve_instrument(ticker, int(datetime.now(timezone.utc).timestamp() // 3600))


def clean_prices(df: pd.DataFrame) -> pd.DataFrame:
    if df is None or df.empty:
        raise DomainError("EMPTY_MARKET_DATA", "No historical observations are available.", 503)
    if not {"date", "close"}.issubset(df.columns):
        raise DomainError("INVALID_MARKET_DATA", "Historical data is missing date or close columns.", 503)
    result = df[["date", "close"]].copy()
    dates = pd.to_datetime(result["date"], errors="coerce", utc=True)
    prices = pd.to_numeric(result["close"], errors="coerce")
    if dates.isna().any() or (~np.isfinite(prices)).any() or (prices <= 0).any():
        raise DomainError("INVALID_MARKET_DATA", "Historical data contains invalid dates or non-positive prices.", 503)
    result["date"] = dates.dt.strftime("%Y-%m-%d")
    result["close"] = prices.astype(float)
    # Future observations cannot enter a current historical analysis.
    result = result[result["date"] <= datetime.now(timezone.utc).date().isoformat()]
    result = result.drop_duplicates("date", keep="last").sort_values("date").reset_index(drop=True)
    if result.empty:
        raise DomainError("EMPTY_MARKET_DATA", "No historical observations are available.", 503)
    result.attrs = dict(df.attrs)
    return result


@functools.lru_cache(maxsize=16)
def _fetch_fx(ticker: str, period: str, cache_hour: int) -> pd.DataFrame:
    try:
        df = yf.Ticker(ticker).history(period=period, auto_adjust=True, timeout=15)
        if df.empty:
            raise DomainError("EMPTY_MARKET_DATA", "Yahoo Finance returned no price history for this underlying. Try another symbol.", 503)
        df = df.reset_index()
        date_col = "Date" if "Date" in df.columns else df.columns[0]
        result = pd.DataFrame({"date": df[date_col], "close": df["Close"]})
        result.attrs = {"source": "Yahoo Finance via yfinance (daily closes)", "fetched_at": datetime.now(timezone.utc).isoformat()}
        return clean_prices(result)
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("MARKET_DATA_UNAVAILABLE", "The market-data provider is unavailable. Retry later.", 503) from exc


def get_historical_market_data(ticker: str = "^NSEI", period: str = "10y", source: str = "snapshot", refresh: bool = False) -> pd.DataFrame:
    ticker = validate_ticker(ticker)
    get_instrument(ticker)
    if period not in PERIODS:
        raise DomainError("INVALID_PERIOD", "Supported periods are 1mo, 1y, 5y and 10y.")
    if source not in ("online", "snapshot"):
        raise DomainError("INVALID_SOURCE", "Choose online or snapshot market data.")
    effective_source = source
    if effective_source == "snapshot" and ticker != "^NSEI":
        effective_source = "online"
    if effective_source == "snapshot":
        try:
            result = clean_prices(pd.read_csv(DATA_PATH))
        except DomainError:
            raise
        except (OSError, ValueError) as exc:
            raise DomainError("MARKET_DATA_UNAVAILABLE", "The bundled NIFTY snapshot cannot be loaded.", 503) from exc
        result.attrs = {"source": "Bundled NIFTY50.csv snapshot (provenance not independently verified)", "fetched_at": datetime.now(timezone.utc).isoformat()}
        cutoff = pd.Timestamp(result["date"].iloc[-1]) - pd.Timedelta(days=PERIODS[period])
        result = result[result["date"] >= cutoff.strftime("%Y-%m-%d")].copy()
    else:
        from app.online_market import online_prices
        result = online_prices(ticker, period, refresh)
    return result


def get_market_data(ticker: str = "^NSEI", period: str = "10y", source: str = "snapshot", refresh: bool = False) -> MarketHistory:
    ticker = validate_ticker(ticker)
    instrument = get_instrument(ticker)
    if source not in ("online", "snapshot"):
        raise DomainError("INVALID_SOURCE", "Choose online or snapshot market data.")
    effective_source = source
    if effective_source == "snapshot" and ticker != "^NSEI":
        effective_source = "online"
    df = get_historical_market_data(ticker, period, effective_source, refresh)
    warnings = ["Daily close observations only; prices are not live executable quotes."]
    status = df.attrs.get("cache_status", "snapshot")
    if status == "stale":
        warnings.append("Live market data unavailable. Showing cached data from " + df["date"].iloc[-1] + ".")
    elif status == "cached":
        warnings.append("Showing cached Yahoo observations; use Refresh market data to request an update.")
    if effective_source == "snapshot":
        warnings.append("Bundled snapshot; original provenance is unverified. Do not treat it as a live market feed.")
    return MarketHistory(ticker=ticker, source=df.attrs["source"], as_of=df["date"].iloc[-1],
        fetched_at=df.attrs["fetched_at"], count=len(df), latest_price=float(df["close"].iloc[-1]),
        currency=instrument.currency, instrument=instrument, warnings=warnings, prices=df.to_dict("records"), cache_status=status)


def get_latest_price(ticker: str = "^NSEI") -> float:
    return get_market_data(ticker, "1mo").latest_price
