from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from app.phase2_models import ElnPayoffRequest, DcdPayoffRequest, CpnPayoffRequest

class ScenarioRequest(BaseModel):
    product_type: str = Field(..., description="ELN, DCD, or CPN")
    eln_config: Optional[ElnPayoffRequest] = None
    dcd_config: Optional[DcdPayoffRequest] = None
    cpn_config: Optional[CpnPayoffRequest] = None
    custom_scenarios: Optional[List[float]] = Field(None, description="List of shock percentages (e.g., -10, 0, 10)")

class BacktestRequest(BaseModel):
    product_type: str = Field(..., description="Currently only ELN supported for full backtest")
    eln_config: Optional[ElnPayoffRequest] = None
    ticker: str = Field(default="^NSEI")
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class ScenarioResult(BaseModel):
    scenario_shock_pct: float
    underlying_final_level: float
    maturity_value: float
    profit_loss: float
    return_pct: float
    explanation: str
    # DCD specific fields
    conversion_occurred: Optional[bool] = None

class ScenarioResponse(BaseModel):
    product_type: str
    results: List[ScenarioResult]

class BacktestWindowResult(BaseModel):
    start_date: str
    maturity_date: str
    initial_price: float
    final_price: float
    min_observed_price: float
    barrier_breached: bool
    principal_repayment: float
    coupon_earned: float
    total_maturity_value: float
    absolute_profit_loss: float
    return_pct: float

class RiskMetrics(BaseModel):
    total_windows: int
    average_return: float
    median_return: float
    best_return: float
    worst_return: float
    loss_frequency_pct: float
    win_frequency_pct: float
    barrier_breaches: int
    barrier_breach_freq_pct: float

class BacktestResponse(BaseModel):
    ticker: str
    product_type: str
    windows: List[BacktestWindowResult]
    metrics: RiskMetrics
    data_source: str
    assumptions: str
