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
    cpn_cfg = CpnPayoffRequest(
        investment=100_000, initial_price=100, final_price=100,
        protection_pct=100, participation_rate=80, upside_cap_pct=15,
        coupon_rate=None, tenor_years=1
    )
    req = ScenarioRequest(
        product_type="CPN",
        cpn_config=cpn_cfg,
        custom_scenarios=[-20, 20]
    )
    res = simulate_scenarios(req)
    
    res_neg = res.results[0]
    assert res_neg.scenario_shock_pct == -20
    assert res_neg.maturity_value == 100_000 # Fully protected
    
    res_pos = res.results[1]
    assert res_pos.scenario_shock_pct == 20
    assert res_pos.maturity_value == 115_000 # Capped at 15%

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
    
    # 252 trading intervals require 253 observations: 504 - 252 = 252 windows.
    assert res.metrics.total_windows == 252
    # Check that there are barrier breaches
    assert res.metrics.barrier_breaches > 0
    assert 0 <= res.metrics.barrier_breach_freq_pct <= 100
