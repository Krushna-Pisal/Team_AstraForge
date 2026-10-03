"""Session-template API and Yahoo discovery tests. External provider is mocked."""
from unittest.mock import patch
from collections import UserDict
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.domain import DomainError
from app.phase3_market_data import _resolve_instrument, _search_yahoo, search_underlyings, get_instrument, get_market_data
from app.phase4_suitability import evaluate_concentration
from tests.test_foundation import profile

http = TestClient(app, raise_server_exceptions=False)

@pytest.fixture(autouse=True)
def clear_metadata_cache():
    _resolve_instrument.cache_clear()
    _search_yahoo.cache_clear()
    yield
    _resolve_instrument.cache_clear()
    _search_yahoo.cache_clear()

def template(kind="CPN", ticker="^NSEI", currency="INR"):
    terms = {
        "ELN": dict(tenor_years=1, coupon_pct_pa=8, strike_pct=100, barrier_pct=70),
        "CPN": dict(tenor_years=1, protection_pct=100, participation_rate=80),
        "DCD": dict(tenor_years=1, coupon_pct_pa=6, conversion_strike_rate=85),
    }
    return dict(name="Saved " + kind, product_type=kind, ticker=ticker, currency=currency,
                **{kind.lower()+"_terms": terms[kind]})

def test_search_returns_provider_matches_not_just_catalog():
    with patch("app.phase3_market_data.yf.Search") as provider:
        provider.return_value.quotes = [
            {"symbol":"AAPL","shortname":"Apple","quoteType":"EQUITY"},
            {"symbol":"RELIANCE.NS","shortname":"Reliance","quoteType":"EQUITY"},
            {"symbol":"BTC-USD","quoteType":"CRYPTOCURRENCY"},
            {"symbol":"JPY=X","quoteType":"CURRENCY"},
        ]
        result = http.get("/api/market-data/search",params={"q":"stock","kind":"equity"})
        assert result.status_code == 200
        assert {r["ticker"] for r in result.json()["results"]} == {"AAPL","RELIANCE.NS"}
        assert provider.call_args.kwargs["max_results"] == 30
        assert [r.ticker for r in search_underlyings("yen","fx").results] == ["JPY=X"]

def test_search_empty_failure_and_validation():
    with patch("app.phase3_market_data._search_yahoo",return_value=[]):
        assert search_underlyings("not-a-company").results == []
    with patch("app.phase3_market_data._search_yahoo",side_effect=DomainError("SEARCH_UNAVAILABLE","Unavailable",503)):
        response=http.get("/api/market-data/search?q=Apple")
        assert response.status_code==503
        fallback=search_underlyings("NIFTY")
        assert fallback.warning and fallback.results[0].ticker=="^NSEI"
    assert http.get("/api/market-data/search?kind=crypto").status_code==422
    assert http.get("/api/market-data/search",params={"q":"x"*81}).status_code==422

@pytest.mark.parametrize("symbol,metadata,currency,kind",[
    ("AAPL",dict(instrumentType="EQUITY",currency="USD"),"USD","equity"),
    ("RELIANCE.NS",dict(instrumentType="EQUITY",currency="INR"),"INR","equity"),
    ("JPY=X",dict(instrumentType="CURRENCY",currency="JPY"),"JPY","fx"),
])
def test_resolve_dynamic_underlying(symbol,metadata,currency,kind):
    with patch("app.phase3_market_data.yf.Ticker") as provider:
        provider.return_value.get_history_metadata.return_value=UserDict(metadata)
        result=get_instrument(symbol)
        assert result.currency==currency and result.kind==kind

@pytest.mark.parametrize("metadata",[
    {},dict(instrumentType="CRYPTOCURRENCY",currency="USD"),dict(instrumentType="EQUITY",currency="GBp")
])
def test_reject_unknown_asset_or_quote_unit(metadata):
    with patch("app.phase3_market_data.yf.Ticker") as provider:
        provider.return_value.get_history_metadata.return_value=metadata
        assert http.post("/api/products/validate",json=template(ticker="OTHER",currency="USD")).status_code==422

@pytest.mark.parametrize("kind",["ELN","CPN","DCD"])
def test_template_validation_no_customer_or_amount(kind):
    data=template(kind,"USDINR=X" if kind=="DCD" else "^NSEI","USD" if kind=="DCD" else "INR")
    result=http.post("/api/products/validate",json=data)
    assert result.status_code==200, result.text
    assert result.json()["template"]["name"]==data["name"]
    data["investment_amount"]=100
    assert http.post("/api/products/validate",json=data).status_code==422

def test_validation_currency_terms_and_blank_name():
    for data in [template(currency="USD"),template()|{"name":" "},template()|{"eln_terms":template("ELN")["eln_terms"]},
                 template("ELN")|{"eln_terms":template("ELN")["eln_terms"]|{"barrier_pct":100}}]:
        assert http.post("/api/products/validate",json=data).status_code==422

@pytest.mark.parametrize("kind",["ELN","CPN","DCD"])
def test_reuse_refreshes_price_and_amount_but_preserves_terms(kind):
    data=template(kind,"USDINR=X" if kind=="DCD" else "^NSEI","USD" if kind=="DCD" else "INR")
    snapshot=get_market_data("^NSEI")
    with patch("app.products.get_market_data",side_effect=[
        snapshot.model_copy(update={"latest_price":100}),snapshot.model_copy(update={"latest_price":120})
    ]):
        first=http.post("/api/products/prepare",json={"template":data,"investment_amount":1000})
        second=http.post("/api/products/prepare",json={"template":data,"investment_amount":2500})
    assert first.status_code==second.status_code==200, second.text
    key=kind.lower()+"_config"
    a,b=first.json()["configuration"][key],second.json()["configuration"][key]
    assert a["deposit_amount" if kind=="DCD" else "investment"]==1000
    assert b["deposit_amount" if kind=="DCD" else "investment"]==2500
    assert a["initial_fx_rate" if kind=="DCD" else "initial_price"]==100
    assert b["initial_fx_rate" if kind=="DCD" else "initial_price"]==120
    if kind=="DCD":
        assert a["conversion_strike_rate"]==b["conversion_strike_rate"]==85
    else:
        assert b["investment_currency"]=="INR"
    assert http.post("/api/products/prepare",json={"template":data,"investment_amount":0}).status_code==422

def test_dynamic_equity_currency_flows_through_simulation():
    frame=pd.DataFrame({"date":["2020-01-01","2020-01-02"],"close":[100.,110.]})
    frame.attrs={"source":"Provider fixture","fetched_at":"2020-01-02"}
    with patch("app.phase3_market_data.yf.Ticker") as provider, patch("app.phase3_market_data._fetch_fx",return_value=frame):
        provider.return_value.get_history_metadata.return_value={"instrumentType":"EQUITY","currency":"USD"}
        result=http.post("/api/products/prepare",json={"template":template(ticker="AAPL",currency="USD"),"investment_amount":1000})
        assert result.status_code==200,result.text
        config=result.json()["configuration"]|{"include_history":False}
        response=http.post("/api/simulation/run",json=config)
        assert response.status_code==200,response.text
        assert {r["value_currency"] for r in response.json()["scenarios"]["results"]}=={"USD"}

def test_missing_exposures_are_not_assumed_zero():
    assert evaluate_concentration(profile(exposure_details_provided=False)).status=="INSUFFICIENT_DATA"
    assert evaluate_concentration(profile(exposure_details_provided=True)).status=="PASS"
