"""Financial boundary, historical integrity and public contract regression tests."""
from datetime import datetime
from unittest.mock import patch
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from app.main import app
from app.domain import DomainError
from app.phase2_models import ElnPayoffRequest, DcdPayoffRequest, CpnPayoffRequest
from app.phase2_engines import calculate_eln_payoff, calculate_dcd_payoff, calculate_cpn_payoff
from app.phase3_sim_models import ScenarioRequest, BacktestRequest
from app.phase3_simulation import simulate_scenarios, run_backtest
from app.phase3_market_data import clean_prices
from app.phase4_models import ClientProfile, ProductRiskCharacteristics, SuitabilityRequest
from app.phase4_suitability import run_suitability_assessment

http = TestClient(app, raise_server_exceptions=False)

def eln(**changes):
    data = dict(investment=100000, initial_price=100, final_price=100, strike_pct=90, barrier_pct=70,
        coupon_pct_pa=12, tenor_years=1, barrier_monitoring="maturity", settlement_method="cash",
        contract_variant="unconditional_strike")
    return ElnPayoffRequest(**(data | changes))

def dcd(**changes):
    data = dict(deposit_currency="USD", alternate_currency="INR", deposit_amount=100000,
        initial_fx_rate=80, conversion_strike_rate=84, maturity_fx_rate=80, coupon_pct_pa=6,
        tenor_years=0.25, conversion_condition="FX_AT_OR_ABOVE_STRIKE")
    return DcdPayoffRequest(**(data | changes))

def cpn(**changes):
    data = dict(investment=100000, initial_price=100, final_price=100, protection_pct=100,
        participation_rate=80, upside_cap_pct=15, coupon_pct_pa=0, tenor_years=1)
    return CpnPayoffRequest(**(data | changes))

def prices(values):
    return pd.DataFrame({"date": pd.date_range("2020-01-01", periods=len(values), freq="B").strftime("%Y-%m-%d"), "close": values})

def profile(**changes):
    data = dict(client_id="C1", client_name="Test Client", risk_appetite="AGGRESSIVE",
        investment_horizon_months=24, max_acceptable_loss_pct=100, total_portfolio_value=1000000,
        proposed_investment_amount=100000, liquidity_requirement_months=24, investment_objective="INCOME")
    return ClientProfile(**(data | changes))

def risk(**changes):
    data = dict(product_type="ELN", product_reference="ELN-1", tenor_years=1, underlying_asset="^NSEI",
        issuer="Illustrative", max_contractual_loss_pct=100, principal_protection_pct=0,
        coupon_pct_pa=12, upside_participation=False, stress_loss_pct=30,
        assessed_loss_pct=30)
    return ProductRiskCharacteristics(**(data | changes))


@pytest.mark.parametrize("final,breached,principal", [(110,False,100000),(100,False,100000),(90,False,100000),(80,False,100000),(70,True,100000*70/90),(60,True,100000*60/90),(0,True,0)])
def test_eln_boundaries(final, breached, principal):
    result = calculate_eln_payoff(eln(final_price=final))
    assert result.barrier_breached is breached
    assert result.principal_repayment == pytest.approx(principal)
    assert result.coupon_earned == 12000
    assert result.total_maturity_value == pytest.approx(principal + 12000)
    assert result.absolute_profit_loss == pytest.approx(principal - 88000)
    assert result.return_pct == pytest.approx((principal - 88000) / 1000)


@pytest.mark.parametrize("variant,expected", [("unconditional_strike",112000),("phase2_contingent",100000)])
def test_daily_touch_then_recovery(variant, expected):
    result = calculate_eln_payoff(eln(barrier_monitoring="daily", observed_prices=[100,70,100], contract_variant=variant))
    assert result.barrier_breached
    assert result.total_maturity_value == expected


def test_maturity_ignores_earlier_breach_and_flag():
    result = calculate_eln_payoff(eln(observed_prices=[100,1,100], barrier_breached=True))
    assert not result.barrier_breached
    assert result.principal_repayment == 100000


def test_daily_does_not_trust_false_flag_below_barrier():
    assert calculate_eln_payoff(eln(barrier_monitoring="daily", barrier_breached=False, final_price=60)).barrier_breached


@pytest.mark.parametrize("changes", [
    {"investment":0},{"strike_pct":0},{"barrier_pct":90},{"coupon_pct_pa":-1},
    {"barrier_monitoring":"weekly"},{"settlement_method":"physical"},{"tenor_years":0},
    {"final_price":-1},{"investment":float("inf")},{"observed_prices":[100,80]},
    {"barrier_monitoring":"daily"},{"observed_prices":[100,float("nan"),100]},
])
def test_invalid_eln(changes):
    with pytest.raises(ValidationError): eln(**changes)


@pytest.mark.parametrize("years", [1/12,0.25,0.5,2])
def test_coupon_tenor(years):
    assert calculate_eln_payoff(eln(tenor_years=years)).coupon_earned == pytest.approx(12000*years)


@pytest.mark.parametrize("condition,final,converted", [
    ("FX_AT_OR_ABOVE_STRIKE",83,False),("FX_AT_OR_ABOVE_STRIKE",84,True),("FX_AT_OR_ABOVE_STRIKE",90,True),
    ("FX_AT_OR_BELOW_STRIKE",83,True),("FX_AT_OR_BELOW_STRIKE",84,True),("FX_AT_OR_BELOW_STRIKE",90,False)])
def test_dcd_fx_boundaries(condition, final, converted):
    result = calculate_dcd_payoff(dcd(conversion_condition=condition, maturity_fx_rate=final))
    assert result.conversion_occurred is converted
    assert result.coupon_amount == 1500
    principal = 100000*84/final if converted else 100000
    assert result.principal_value_deposit_currency == pytest.approx(principal)
    assert result.total_value_deposit_currency == pytest.approx(principal+1500)
    assert result.absolute_profit_loss == pytest.approx(principal+1500-100000)
    assert result.effective_return_pct == pytest.approx(result.absolute_profit_loss/1000)
    assert result.cash_flows[1].currency == "USD"
    assert result.cash_flows[0].currency == ("INR" if converted else "USD")


@pytest.mark.parametrize("changes", [{"deposit_currency":"XYZ"},{"alternate_currency":"usd"},{"conversion_strike_rate":0},{"maturity_fx_rate":0},{"deposit_amount":-1}])
def test_invalid_dcd(changes):
    with pytest.raises(ValidationError): dcd(**changes)


@pytest.mark.parametrize("changes,expected", [
    ({"final_price":120},115000),({"final_price":100},100000),({"final_price":20},100000),
    ({"protection_pct":90,"final_price":100},90000),
    ({"protection_pct":90,"final_price":0},90000),
    ({"final_price":120,"upside_cap_pct":None},116000),
    ({"final_price":120,"cap_basis":"underlying_return"},112000),
    ({"final_price":120,"participation_rate":0},100000),
    ({"final_price":120,"upside_cap_pct":0},100000),
])
def test_cpn_contract_variants(changes, expected):
    assert calculate_cpn_payoff(cpn(**changes)).total_maturity_value == expected


@pytest.mark.parametrize("protection", [-1,101])
def test_invalid_cpn_protection(protection):
    with pytest.raises(ValidationError): cpn(protection_pct=protection)


def test_scenario_default_shocks_and_dcd_values():
    result = simulate_scenarios(ScenarioRequest(product_type="DCD",dcd_config=dcd()))
    assert [r.scenario_shock_pct for r in result.results] == [-50,-40,-30,-20,-10,0,10,20,30]
    for r in result.results:
        assert r.profit_loss == pytest.approx(r.maturity_value-100000)
        assert r.value_currency == "USD"


@pytest.mark.parametrize("payload", [
    {"product_type":"BOGUS"}, {"product_type":"ELN"}, {"product_type":"CPN","eln_config":eln().model_dump()},
    {"product_type":"ELN","eln_config":eln().model_dump(),"cpn_config":cpn().model_dump()},
    {"product_type":"DCD","dcd_config":dcd().model_dump(),"custom_scenarios":[-100]},
    {"product_type":"ELN","eln_config":eln().model_dump(),"custom_scenarios":[]},
    {"product_type":"ELN","eln_config":eln().model_dump(),"custom_scenarios":[-101]},
])
def test_invalid_scenario_contract(payload):
    with pytest.raises(ValidationError): ScenarioRequest(**payload)


def test_historical_window_boundaries_and_full_path():
    df = prices([100,60,95,100,105])
    cfg = eln(tenor_years=3/252, barrier_monitoring="daily", barrier_breached=False)
    with patch("app.phase3_simulation.get_historical_market_data", return_value=df):
        result = run_backtest(BacktestRequest(product_type="ELN",eln_config=cfg))
    assert result.metrics.total_windows == 2
    row = result.windows[0]
    assert row.initial_price == 100 and row.final_price == 100
    assert row.maturity_date == df["date"].iloc[3]
    assert row.min_observed_price == 60 and row.barrier_breached
    assert row.total_maturity_value == pytest.approx(100000+12000*3/252)


def test_no_lookahead_leakage():
    cfg = eln(tenor_years=2/252, barrier_monitoring="daily", barrier_breached=False)
    req = BacktestRequest(product_type="ELN",eln_config=cfg)
    with patch("app.phase3_simulation.get_historical_market_data", return_value=prices([100,95,110,120,1])):
        before = run_backtest(req)
    with patch("app.phase3_simulation.get_historical_market_data", return_value=prices([100,95,110,2,999])):
        after = run_backtest(req)
    assert before.windows[0] == after.windows[0]


def test_historical_maturity_vs_daily():
    df = prices([100,60,100])
    for monitoring, breached in [("daily",True),("maturity",False)]:
        cfg = eln(tenor_years=2/252, barrier_monitoring=monitoring, barrier_breached=False)
        with patch("app.phase3_simulation.get_historical_market_data", return_value=df):
            result = run_backtest(BacktestRequest(product_type="ELN",eln_config=cfg))
        assert result.windows[0].barrier_breached is breached


def test_insufficient_history_and_date_bounds():
    df = prices([100]*4)
    cfg = eln(tenor_years=3/252)
    with patch("app.phase3_simulation.get_historical_market_data", return_value=df):
        with pytest.raises(DomainError, match="Need 4"):
            run_backtest(BacktestRequest(product_type="ELN",eln_config=cfg,end_date=df["date"].iloc[2]))
        result = run_backtest(BacktestRequest(product_type="ELN",eln_config=cfg,end_date=df["date"].iloc[3]))
        assert result.metrics.total_windows == 1
    with pytest.raises(ValidationError):
        BacktestRequest(product_type="ELN",eln_config=cfg,start_date="2024-01-01",end_date="2023-01-01")


@pytest.mark.parametrize("type_,cfg,ticker", [("CPN",cpn(tenor_years=2/252),"^NSEI"),("DCD",dcd(tenor_years=2/252),"USDINR=X")])
def test_all_products_historical(type_,cfg,ticker):
    with patch("app.phase3_simulation.get_historical_market_data",return_value=prices([100,101,102,103])):
        result = run_backtest(BacktestRequest(product_type=type_,ticker=ticker,**{type_.lower()+"_config":cfg}))
    assert len(result.windows) == 2
    assert result.metrics.barrier_breach_freq_pct is None
    assert result.metrics.loss_frequency_pct + result.metrics.win_frequency_pct + result.metrics.zero_return_frequency_pct == pytest.approx(100)


def test_dcd_window_rebases_strike_ratio():
    cfg = dcd(tenor_years=1/252)
    with patch("app.phase3_simulation.get_historical_market_data",return_value=prices([100,110])):
        result = run_backtest(BacktestRequest(product_type="DCD",ticker="USDINR=X",dcd_config=cfg))
    # Original strike/initial = 84/80 = 1.05, so historical strike = 105.
    assert result.windows[0].principal_repayment == pytest.approx(100000*105/110)


@pytest.mark.parametrize("values", [[],[0],[float("nan")],[-1],[float("inf")]])
def test_bad_market_prices(values):
    with pytest.raises(DomainError): clean_prices(prices(values))


def test_market_sort_deduplicate_and_future_filter():
    df = pd.DataFrame({"date":["2020-01-02","2020-01-01","2020-01-01","2999-01-01"],"close":[2,1,3,999]})
    # Future observations must never enter current historical analysis.
    assert clean_prices(df)["close"].tolist() == [3,2]
    assert clean_prices(df.iloc[:3])["close"].tolist() == [3,2]


@pytest.mark.parametrize("changes,code", [
    ({"risk_appetite":"CONSERVATIVE"},"RISK_EXCEEDS_APPETITE"),
    ({"investment_horizon_months":6},"TENOR_EXCEEDS_HORIZON"),
    ({"max_acceptable_loss_pct":10},"LOSS_EXCEEDS_TOLERANCE"),
    ({"total_portfolio_value":400000},"CONCENTRATION_WARNING"),
    ({"liquidity_requirement_months":6},"LIQUIDITY_MISMATCH"),
    ({"investment_objective":"CAPITAL_PRESERVATION"},"OBJECTIVE_MISMATCH"),
    ({"investment_objective":None},"MISSING_INVESTMENT_OBJECTIVE"),
])
def test_suitability_reason_codes(changes,code):
    result = run_suitability_assessment(SuitabilityRequest(client=profile(**changes),product_risk=risk()))
    assert code in [c.reason_code for c in result.checks]
    assert all(c.status in ["PASS","WARNING","MISMATCH"] for c in result.checks)
    assert datetime.fromisoformat(result.timestamp).tzinfo is not None


def test_suitability_pass_warning_mismatch():
    for changes,status in [({}, "suitable"),({"total_portfolio_value":400000},"suitable_with_warnings"),
            ({"risk_appetite":"CONSERVATIVE","liquidity_requirement_months":1},"review_required")]:
        result = run_suitability_assessment(SuitabilityRequest(client=profile(**changes),product_risk=risk()))
        assert result.overall_status == status


@pytest.mark.parametrize("changes", [{"max_acceptable_loss_pct":101},{"risk_appetite":"unknown"},{"total_portfolio_value":1},{"existing_structured_product_exposure":1000001},{"investment_horizon_months":0}])
def test_client_invalid(changes):
    with pytest.raises(ValidationError): profile(**changes)


@pytest.mark.parametrize("type_,cfg,ticker", [("ELN",eln(),"^NSEI"),("CPN",cpn(),"^NSEI"),("DCD",dcd(),"USDINR=X")])
def test_full_api_flow(type_, cfg, ticker):
    payload = {"product_type":type_,type_.lower()+"_config":cfg.model_dump(),"ticker":ticker}
    with patch("app.phase3_simulation.get_historical_market_data",return_value=prices([100+(i%30) for i in range(510)])):
        payoff = http.post("/api/payoff/"+type_.lower(),json=cfg.model_dump())
        assert payoff.status_code == 200, payoff.text
        simulation = http.post("/api/simulation/run",json=payload)
        assert simulation.status_code == 200, simulation.text
        result = simulation.json()
        assert len(result["scenarios"]["results"]) == 9
        assert result["backtest"]["metrics"]["total_windows"] > 0
        client = profile(portfolio_currency="USD" if type_ == "DCD" else "INR")
        assessment = http.post("/api/suitability/evaluate",json=payload | {"client":client.model_dump()})
        assert assessment.status_code == 200, assessment.text
        assert len(assessment.json()["assessment"]["checks"]) == 6


def test_api_safe_error_envelope():
    bad = http.post("/api/payoff/eln",json={"investment":-1})
    assert bad.status_code == 422
    assert bad.json()["error"]["code"] == "VALIDATION_ERROR"
    assert bad.json()["error"]["details"]
    assert "Traceback" not in bad.text
    with patch("app.phase3_market_data.yf.Ticker") as provider:
        provider.return_value.get_history_metadata.return_value = {}
        unsupported = http.get("/api/market-data/history?ticker=FAKE")
    assert unsupported.json()["error"]["code"] == "UNSUPPORTED_TICKER"
    notfound = http.get("/api/not-a-route")
    assert notfound.status_code == 404 and "error" in notfound.json()
    with patch("app.main.get_market_data",side_effect=RuntimeError("secret traceback")):
        response = http.get("/api/market-data/history")
    assert response.status_code == 500
    assert "secret" not in response.text


def test_api_partial_history_and_input_consistency():
    payload = {"product_type":"ELN","eln_config":eln().model_dump(),"ticker":"^NSEI"}
    with patch("app.phase3_simulation.get_historical_market_data",side_effect=DomainError("MARKET_DATA_UNAVAILABLE","Provider unavailable",503)):
        response = http.post("/api/simulation/run",json=payload)
    assert response.status_code == 200
    assert response.json()["historical_error"]["code"] == "MARKET_DATA_UNAVAILABLE"
    assert response.json()["backtest"] is None
    response = http.post("/api/suitability/evaluate",json=payload | {"client":profile(proposed_investment_amount=200000).model_dump()})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVESTMENT_MISMATCH"


def test_openapi_and_real_bundled_market():
    schema = http.get("/openapi.json").json()
    assert schema["info"]["version"] == "1.0.0"
    assert "SuitabilityCheck" in schema["components"]["schemas"]
    response = http.get("/api/market-data/history")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == len(data["prices"]) > 500
    assert "snapshot" in data["source"]
    assert data["latest_price"] > 0
    assert http.get("/health").json() == {"status":"ok"}


def test_legacy_payoff_still_works():
    response = http.post("/payoff",json={})
    assert response.status_code == 200
    assert len(response.json()["curve"]) > 10


@pytest.mark.parametrize("exposure_key", ["existing_underlying_exposure", "existing_issuer_exposure", "existing_structured_product_exposure"])
def test_concentration_evaluates_each_bucket(exposure_key):
    client = profile(**{exposure_key: 150000})
    result = run_suitability_assessment(SuitabilityRequest(client=client, product_risk=risk()))
    check = next(c for c in result.checks if c.type == "portfolio_concentration")
    assert check.product_value == 25
    assert check.reason_code == "CONCENTRATION_WARNING"


def test_concentration_does_not_double_count_overlapping_exposures():
    client = profile(existing_underlying_exposure=90000, existing_issuer_exposure=90000,
                     existing_structured_product_exposure=90000)
    result = run_suitability_assessment(SuitabilityRequest(client=client, product_risk=risk()))
    check = next(c for c in result.checks if c.type == "portfolio_concentration")
    assert check.product_value == 19
    assert check.status == "PASS"


def test_api_rejects_fx_pair_and_portfolio_currency_mismatch():
    payload = {"product_type":"DCD","dcd_config":dcd().model_dump(),"ticker":"EURUSD=X","include_history":False}
    assert http.post("/api/simulation/run",json=payload).status_code == 422
    payload["ticker"] = "USDINR=X"
    response = http.post("/api/suitability/evaluate",json=payload | {"client":profile().model_dump()})
    assert response.json()["error"]["code"] == "CURRENCY_MISMATCH"


def test_market_provider_failures_are_explicit():
    from app.phase3_market_data import get_historical_market_data, _fetch_fx
    _fetch_fx.cache_clear()
    with patch("app.phase3_market_data.yf.Ticker") as provider:
        provider.return_value.history.return_value = pd.DataFrame()
        with pytest.raises(DomainError) as failure:
            get_historical_market_data("EURUSD=X")
        assert failure.value.code == "EMPTY_MARKET_DATA"
        provider.return_value.history.side_effect = RuntimeError("provider-secret")
        with pytest.raises(DomainError) as failure:
            get_historical_market_data("EURUSD=X")
        assert failure.value.code == "MARKET_DATA_UNAVAILABLE"
        assert "provider-secret" not in str(failure.value)
    _fetch_fx.cache_clear()
