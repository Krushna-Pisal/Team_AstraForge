import pytest
from app.phase3_sim_models import ScenarioRequest, BacktestRequest
from app.phase2_models import ElnPayoffRequest, CpnPayoffRequest
from app.phase3_simulation import simulate_scenarios, run_backtest
import pandas as pd
from unittest.mock import patch

def test_simulate_scenarios_eln():
    eln_cfg = ElnPayoffRequest(
        investment=1_000_000, initial_price=100, final_price=100,
        strike_pct=90, barrier_pct=70, coupon_pct_pa=10, tenor_years=1,
        barrier_breached=False, barrier_monitoring="daily", settlement_method="cash"
    )
    req = ScenarioRequest(
        product_type="ELN",
        eln_config=eln_cfg,
        custom_scenarios=[-50, 0, 50]
    )
    res = simulate_scenarios(req)
    assert res.product_type == "ELN"
    assert len(res.results) == 3
    
    # -50% shock: final 50, breached (50 <= 70)
    res_neg = res.results[0]
    assert res_neg.scenario_shock_pct == -50
    assert res_neg.underlying_final_level == 50
    assert res_neg.maturity_value == 500_000 # 1M * (50/100)
    
    # 0% shock: final 100, not breached (100 > 70)
    res_zero = res.results[1]
    assert res_zero.scenario_shock_pct == 0
    assert res_zero.underlying_final_level == 100
    assert res_zero.maturity_value == 1_100_000 # 1M + 10% coupon

def test_simulate_scenarios_cpn():
    # Base Config
    cpn_cfg = CpnPayoffRequest(
        investment=100_000, initial_price=100, final_price=100,
        protection_pct=100, participation_rate=80, upside_cap_pct=15,
        coupon_rate=None, tenor_years=1
    )
    req = ScenarioRequest(
        product_type="CPN",
        cpn_config=cpn_cfg,
        custom_scenarios=[-20, 10, 20]
    )
    res = simulate_scenarios(req)
    
    # 1. Negative underlying return with full principal protection
    res_neg = res.results[0]
    assert res_neg.scenario_shock_pct == -20
    assert res_neg.maturity_value == 100_000 # Fully protected
    
    # 2. Positive underlying return below the cap
    # 10% * 80% = 8% gain = 8000
    res_below_cap = res.results[1]
    assert res_below_cap.scenario_shock_pct == 10
    assert res_below_cap.maturity_value == pytest.approx(108_000)
    
    # 3. Positive return exceeding the cap
    # 20% * 80% = 16% gain -> capped at 15% = 15000
    res_pos = res.results[2]
    assert res_pos.scenario_shock_pct == 20
    assert res_pos.maturity_value == pytest.approx(115_000)

def test_simulate_scenarios_cpn_partial_protection():
    # 4. Partial principal protection
    cpn_cfg = CpnPayoffRequest(
        investment=100_000, initial_price=100, final_price=100,
        protection_pct=90, participation_rate=100, upside_cap_pct=None,
        coupon_rate=None, tenor_years=1
    )
    req = ScenarioRequest(
        product_type="CPN",
        cpn_config=cpn_cfg,
        custom_scenarios=[-20]
    )
    res = simulate_scenarios(req)
    assert res.results[0].maturity_value == 90_000

def test_simulate_scenarios_cpn_optional_coupon():
    # 5. Optional coupon behavior
    cpn_cfg = CpnPayoffRequest(
        investment=100_000, initial_price=100, final_price=100,
        protection_pct=100, participation_rate=50, upside_cap_pct=None,
        coupon_rate=5.0, tenor_years=1
    )
    req = ScenarioRequest(
        product_type="CPN",
        cpn_config=cpn_cfg,
        custom_scenarios=[-10, 10]
    )
    res = simulate_scenarios(req)
    # Negative scenario: 100_000 protection + 5000 coupon
    assert res.results[0].maturity_value == 105_000
    # Positive scenario: 100_000 protection + 5000 coupon + (10% * 50% = 5000) = 110_000
    assert res.results[1].maturity_value == 110_000

@patch("app.phase3_simulation.get_historical_market_data")
def test_run_backtest(mock_get_data):
    # Mock dataframe with 504 rows (2 years of trading days)
    # Price starts at 100, drops to 60 (breach), goes back to 100
    dates = pd.date_range("2020-01-01", periods=504, freq="B").strftime("%Y-%m-%d").tolist()
    closes = [100.0] * 200 + [60.0] * 100 + [100.0] * 204
    df = pd.DataFrame({"date": dates, "close": closes})
    mock_get_data.return_value = df
    
    eln_cfg = ElnPayoffRequest(
        investment=1_000_000, initial_price=100, final_price=100,
        strike_pct=90, barrier_pct=70, coupon_pct_pa=10, tenor_years=1,
        barrier_breached=False, barrier_monitoring="daily", settlement_method="cash"
    )
    req = BacktestRequest(
        product_type="ELN",
        eln_config=eln_cfg,
        ticker="^NSEI"
    )
    
    res = run_backtest(req)
    
    # 504 days - 252 days window + 1 = 253 windows
    assert res.metrics.total_windows == 253
    # Check that there are barrier breaches
    assert res.metrics.barrier_breaches > 0
    assert 0 <= res.metrics.barrier_breach_freq_pct <= 100
