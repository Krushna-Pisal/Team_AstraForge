import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.advanced_simulation.schemas import (
    ProductSimulationSpec,
    MarketShockRequest,
    SensitivityRequest,
    HistoricalScenarioRequest,
)
from app.advanced_simulation.service import (
    evaluate_market_shocks,
    evaluate_sensitivity,
    evaluate_historical_scenarios,
)

client = TestClient(app)


# -------------------------------------------------------------
# 1. MARKET SHOCKS & SIDE-BY-SIDE COMPARISON
# -------------------------------------------------------------

def test_market_shocks_default_and_custom():
    eln = ProductSimulationSpec(
        product_id="eln-test",
        product_name="ELN 90/70",
        product_type="ELN",
        initial_price=100.0,
        strike_pct=90.0,
        barrier_pct=70.0,
        coupon_pct_pa=10.0,
        tenor_years=1.0,
        investment=100000.0,
    )
    cpn = ProductSimulationSpec(
        product_id="cpn-test",
        product_name="CPN 100%",
        product_type="CPN",
        initial_price=100.0,
        protection_pct=100.0,
        participation_pct=80.0,
        coupon_pct_pa=2.0,
        tenor_years=1.0,
        investment=100000.0,
    )

    req = MarketShockRequest(
        products=[eln, cpn],
        custom_shocks_pct=[-40.0, -20.0, -10.0, 0.0, 10.0, 20.0, 30.0],
    )
    res = evaluate_market_shocks(req)

    assert len(res.rows) == 7
    assert res.shocks == [-40.0, -20.0, -10.0, 0.0, 10.0, 20.0, 30.0]

    # At -40% (severe drop):
    # ELN breaches 70% barrier: Final=60, repayment = 100k * 60/100 = 60k, return = -40%
    row_neg40 = next(r for r in res.rows if r.shock_pct == -40.0)
    eln_neg40 = row_neg40.outcomes["eln-test"]
    assert eln_neg40.gross_payoff == 60000.0
    assert eln_neg40.net_profit_loss == -40000.0
    assert eln_neg40.return_pct == -40.0

    # CPN at -40%: Protected principal (100k) + coupon (2k) = 102k gross, +2k net P/L, +2% return
    cpn_neg40 = row_neg40.outcomes["cpn-test"]
    assert cpn_neg40.gross_payoff == 102000.0
    assert cpn_neg40.net_profit_loss == 2000.0
    assert cpn_neg40.return_pct == 2.0

    # Check best and worst summaries
    assert len(res.summary_best_worst) == 2
    eln_bw = next(b for b in res.summary_best_worst if b.product_id == "eln-test")
    assert eln_bw.worst_shock_pct == -40.0


def test_gross_payoff_vs_net_pl_distinction():
    """Gross payoff is terminal distribution; Net P/L deducts initial outlay."""
    opt = ProductSimulationSpec(
        product_id="opt-call",
        product_name="Long Call",
        product_type="OPTION",
        initial_price=100.0,
        strike_price=100.0,
        option_premium=5.0,
        quantity=2.0,
        multiplier=100.0,
        option_type="CALL",
        position="LONG",
    )
    req = MarketShockRequest(products=[opt], custom_shocks_pct=[0.0, 20.0])
    res = evaluate_market_shocks(req)

    # At +20% (Final=120):
    # Intrinsic = 20, Gross Payoff = 20 * 200 = 4,000
    # Net P/L = Payoff - Premium (1,000) = +3,000
    row_up = next(r for r in res.rows if r.shock_pct == 20.0)
    outcome = row_up.outcomes["opt-call"]
    assert outcome.gross_payoff == 4000.0
    assert outcome.net_profit_loss == 3000.0
    assert outcome.gross_payoff != outcome.net_profit_loss


# -------------------------------------------------------------
# 2. SENSITIVITY ANALYSIS & THRESHOLDS
# -------------------------------------------------------------

def test_sensitivity_curve_and_thresholds():
    eln = ProductSimulationSpec(
        product_id="eln-sens",
        product_name="ELN Sensitivity",
        product_type="ELN",
        initial_price=1000.0,
        strike_pct=95.0,
        barrier_pct=75.0,
        coupon_pct_pa=8.0,
        tenor_years=1.0,
        investment=50000.0,
    )
    req = SensitivityRequest(product=eln, range_min_shock_pct=-50.0, range_max_shock_pct=50.0, points_count=40)
    res = evaluate_sensitivity(req)

    assert len(res.curve) >= 40
    assert len(res.thresholds) >= 2

    # Check strike and barrier thresholds
    strike_th = next(t for t in res.thresholds if "Strike" in t.label)
    barrier_th = next(t for t in res.thresholds if "Barrier" in t.label)
    assert strike_th.price_level == 950.0
    assert barrier_th.price_level == 750.0


# -------------------------------------------------------------
# 3. HISTORICAL SCENARIO REPLAY & OBSERVATION HANDLING
# -------------------------------------------------------------

def test_historical_scenario_replay_nifty():
    cpn = ProductSimulationSpec(
        product_id="cpn-replay",
        product_name="CPN 100%",
        product_type="CPN",
        initial_price=22000.0,
        protection_pct=100.0,
        participation_pct=100.0,
        coupon_pct_pa=0.0,
        tenor_years=1.0,
        investment=100000.0,
    )
    req = HistoricalScenarioRequest(
        product=cpn,
        ticker="^NSEI",
        lookback_observations=252,
        source="snapshot",
    )
    res = evaluate_historical_scenarios(req)

    assert res.ticker == "^NSEI"
    assert res.observations_used == 252
    assert len(res.windows) > 0
    assert "snapshot" in res.data_source.lower()
    assert res.is_verified_live is False
    assert any("bundled snapshot" in w.lower() for w in res.warnings)
    assert "Historical Scenario Replay Notice" in res.methodology_disclosure


def test_historical_missing_data_warning():
    """Requesting more observations than available records warnings without failing."""
    eln = ProductSimulationSpec(
        product_id="eln-replay",
        product_name="ELN 90/70",
        product_type="ELN",
        initial_price=22000.0,
        strike_pct=90.0,
        barrier_pct=70.0,
        coupon_pct_pa=8.0,
        tenor_years=1.0,
        investment=100000.0,
    )
    req = HistoricalScenarioRequest(
        product=eln,
        ticker="^NSEI",
        lookback_observations=5000,  # exceeds observations
        source="snapshot",
    )
    res = evaluate_historical_scenarios(req)
    assert any("available" in w.lower() for w in res.warnings)


# -------------------------------------------------------------
# 4. API ENDPOINTS INTEGRATION
# -------------------------------------------------------------

def test_advanced_simulation_api_endpoints():
    # Market shocks endpoint
    prod = {
        "product_id": "eln-api",
        "product_name": "ELN Test",
        "product_type": "ELN",
        "initial_price": 100.0,
        "strike_pct": 90.0,
        "barrier_pct": 70.0,
        "coupon_pct_pa": 10.0,
        "tenor_years": 1.0,
        "investment": 100000.0,
    }
    res_shocks = client.post("/api/advanced-simulation/market-shocks", json={
        "products": [prod],
        "custom_shocks_pct": [-20.0, 0.0, 20.0]
    })
    assert res_shocks.status_code == 200
    assert len(res_shocks.json()["rows"]) == 3

    # Sensitivity endpoint
    res_sens = client.post("/api/advanced-simulation/sensitivity", json={
        "product": prod,
        "range_min_shock_pct": -30.0,
        "range_max_shock_pct": 30.0,
        "points_count": 25,
    })
    assert res_sens.status_code == 200
    assert len(res_sens.json()["curve"]) >= 25

    # Historical scenarios endpoint
    res_hist = client.post("/api/advanced-simulation/historical-scenarios", json={
        "product": prod,
        "ticker": "^NSEI",
        "lookback_observations": 252,
        "source": "snapshot",
    })
    assert res_hist.status_code == 200
    data = res_hist.json()
    assert data["observations_used"] == 252
    assert "Historical Scenario Replay Notice" in data["methodology_disclosure"]


def test_dcd_market_shocks_and_conversion():
    dcd = ProductSimulationSpec(
        product_id="dcd-1",
        product_name="DCD USD/INR",
        product_type="DCD",
        initial_fx_rate=83.0,
        conversion_strike_rate=85.0,
        coupon_pct_pa=12.0,
        tenor_years=0.25,
        investment=50000.0,
        deposit_currency="USD",
        alternate_currency="INR",
        conversion_condition="FX_AT_OR_ABOVE_STRIKE",
    )
    req = MarketShockRequest(products=[dcd], custom_shocks_pct=[-5.0, 0.0, 5.0])
    res = evaluate_market_shocks(req)
    assert len(res.rows) == 3

    # At +5% FX shock (Final FX = 87.15 > Strike 85.0): conversion occurs
    row_up = next(r for r in res.rows if r.shock_pct == 5.0)
    outcome = row_up.outcomes["dcd-1"]
    assert outcome.gross_payoff > 0
    assert outcome.is_protected_or_barrier_safe is False  # converted to alternate


def test_empty_products_validation_error():
    res = client.post("/api/advanced-simulation/market-shocks", json={
        "products": [],
    })
    assert res.status_code == 422

