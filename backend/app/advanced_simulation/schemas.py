from __future__ import annotations

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class ProductSimulationSpec(BaseModel):
    product_id: str = Field(..., description="Unique ID or slug for this product instance (e.g. 'eln-1')")
    product_name: str = Field(..., description="Display title (e.g. 'Standard ELN 90/70')")
    product_type: str = Field(..., description="Product type: 'ELN', 'CPN', 'DCD', or 'OPTION'")
    
    # Common / Equity parameters
    initial_price: float = Field(default=22000.0, gt=0, description="Reference underlying price S0")
    investment: float = Field(default=100000.0, gt=0, description="Total investment amount / notional")
    investment_currency: str = Field(default="INR", description="Investment currency code")
    tenor_years: float = Field(default=1.0, gt=0, description="Tenor in years")
    coupon_pct_pa: float = Field(default=10.0, ge=0, description="Annual coupon rate in percent")

    # ELN specific
    strike_pct: Optional[float] = Field(default=90.0, gt=0, description="Strike as percentage of initial price")
    barrier_pct: Optional[float] = Field(default=70.0, gt=0, description="Downside barrier as percentage of initial price")
    barrier_monitoring: Optional[str] = Field(default="daily", description="'daily' or 'maturity'")
    contract_variant: Optional[str] = Field(default="standard", description="'standard' or 'unconditional_strike'")

    # CPN specific
    protection_pct: Optional[float] = Field(default=100.0, ge=0, description="Principal protection percentage")
    participation_pct: Optional[float] = Field(default=100.0, ge=0, description="Participation rate percentage")
    cap_pct: Optional[float] = Field(default=None, description="Optional upside participation cap percentage")

    # DCD specific
    deposit_currency: Optional[str] = Field(default="USD", description="Base deposit currency")
    alternate_currency: Optional[str] = Field(default="INR", description="Alternate currency")
    initial_fx_rate: Optional[float] = Field(default=83.5, gt=0, description="Initial FX rate")
    conversion_strike_rate: Optional[float] = Field(default=85.0, gt=0, description="Conversion strike FX rate")
    conversion_condition: Optional[str] = Field(default="FX_AT_OR_ABOVE_STRIKE")

    # Option specific
    strike_price: Optional[float] = Field(default=22000.0, gt=0, description="Option strike price")
    option_premium: Optional[float] = Field(default=250.0, ge=0, description="Premium per share")
    quantity: Optional[float] = Field(default=2.0, gt=0, description="Number of contracts")
    multiplier: Optional[float] = Field(default=50.0, gt=0, description="Contract multiplier")
    option_type: Optional[str] = Field(default="CALL", description="'CALL' or 'PUT'")
    position: Optional[str] = Field(default="LONG", description="'LONG' or 'SHORT'")

    @field_validator("product_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        v_upper = v.strip().upper()
        if v_upper not in ("ELN", "CPN", "DCD", "OPTION"):
            raise ValueError(f"Unsupported product type: {v}. Must be ELN, CPN, DCD, or OPTION.")
        return v_upper


class ShockOutcomeItem(BaseModel):
    product_id: str
    product_name: str
    product_type: str
    final_underlying_price: float
    gross_payoff: float
    net_profit_loss: float
    return_pct: float
    explanation: str
    is_protected_or_barrier_safe: Optional[bool] = None


class ShockComparisonRow(BaseModel):
    shock_pct: float
    outcomes: Dict[str, ShockOutcomeItem]  # keyed by product_id


class ProductBestWorst(BaseModel):
    product_id: str
    product_name: str
    best_shock_pct: float
    best_return_pct: float
    best_profit_loss: float
    worst_shock_pct: float
    worst_return_pct: float
    worst_profit_loss: float


class MarketShockRequest(BaseModel):
    products: List[ProductSimulationSpec] = Field(..., min_length=1, description="List of products to evaluate/compare")
    custom_shocks_pct: Optional[List[float]] = Field(default=None, description="Optional custom shock percentages")


class MarketShockResponse(BaseModel):
    shocks: List[float]
    products: List[Dict[str, Any]]
    rows: List[ShockComparisonRow]
    summary_best_worst: List[ProductBestWorst]
    assumptions_and_risks: str


class ThresholdItem(BaseModel):
    label: str
    price_level: float
    shock_pct: float
    color: str
    description: str


class SensitivityPoint(BaseModel):
    underlying_price: float
    shock_pct: float
    gross_payoff: float
    net_profit_loss: float
    return_pct: float


class SensitivityRequest(BaseModel):
    product: ProductSimulationSpec
    range_min_shock_pct: float = Field(default=-50.0)
    range_max_shock_pct: float = Field(default=50.0)
    points_count: int = Field(default=60, ge=10, le=200)


class SensitivityResponse(BaseModel):
    product_id: str
    product_name: str
    product_type: str
    curve: List[SensitivityPoint]
    thresholds: List[ThresholdItem]
    assumptions: str


class HistoricalScenarioWindowItem(BaseModel):
    start_date: str
    end_date: str
    initial_price: float
    final_price: float
    price_change_pct: float
    min_observed_price: float
    gross_payoff: float
    net_profit_loss: float
    return_pct: float
    key_event: str


class HistoricalScenarioRequest(BaseModel):
    product: ProductSimulationSpec
    ticker: str = Field(default="^NSEI")
    lookback_observations: int = Field(default=252, gt=10, le=5000)
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    source: str = Field(default="snapshot", description="'snapshot' or 'online'")


class HistoricalScenarioResponse(BaseModel):
    ticker: str
    product_id: str
    product_name: str
    data_source: str
    is_verified_live: bool
    date_range: str
    observations_available: int
    observations_used: int
    windows_evaluated: int
    average_return_pct: float
    best_return_pct: float
    worst_return_pct: float
    loss_frequency_pct: float
    win_frequency_pct: float
    windows: List[HistoricalScenarioWindowItem]
    warnings: List[str]
    methodology_disclosure: str
