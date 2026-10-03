"""Shared simulation contracts with bounded inputs."""
from datetime import date
from typing import Annotated
from pydantic import Field, model_validator
from app.domain import DomainModel, ProductType
from app.phase2_models import ElnPayoffRequest, DcdPayoffRequest, CpnPayoffRequest

class ProductConfiguration(DomainModel):
    product_type: ProductType
    eln_config: ElnPayoffRequest | None = None
    dcd_config: DcdPayoffRequest | None = None
    cpn_config: CpnPayoffRequest | None = None

    @model_validator(mode="after")
    def matching_config(self):
        configs = {"ELN": self.eln_config, "DCD": self.dcd_config, "CPN": self.cpn_config}
        if configs[self.product_type] is None or sum(v is not None for v in configs.values()) != 1:
            raise ValueError("Supply exactly one configuration matching product_type.")
        return self

    @property
    def config(self):
        return getattr(self, self.product_type.lower() + "_config")


class ScenarioRequest(ProductConfiguration):
    custom_scenarios: list[Annotated[float, Field(ge=-100, le=1000)]] | None = Field(None, min_length=1, max_length=301)

    @model_validator(mode="after")
    def valid_fx_shocks(self):
        if self.product_type == "DCD" and self.custom_scenarios and min(self.custom_scenarios) <= -100:
            raise ValueError("DCD shocks must be greater than -100% to keep FX positive.")
        return self


class BacktestRequest(ProductConfiguration):
    ticker: str = "^NSEI"
    start_date: date | None = None
    end_date: date | None = None

    @model_validator(mode="after")
    def dates_ordered(self):
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValueError("start_date must not be after end_date.")
        return self


class ScenarioResult(DomainModel):
    scenario_shock_pct: float
    initial_price: float
    underlying_final_level: float
    underlying_return_pct: float
    maturity_value: float
    profit_loss: float
    return_pct: float
    principal_repayment: float
    coupon_earned: float
    participation_gain: float = 0
    value_currency: str
    explanation: str
    barrier_breached: bool | None = None
    strike_touched_or_below: bool | None = None
    conversion_occurred: bool | None = None
    protection_active: bool | None = None
    cap_applied: bool | None = None
    repayment_currency: str | None = None
    settlement_principal: float | None = None


class ScenarioResponse(DomainModel):
    product_type: ProductType
    results: list[ScenarioResult]
    assumptions: str


class BacktestWindowResult(DomainModel):
    start_date: str
    maturity_date: str
    initial_price: float
    final_price: float
    min_observed_price: float
    barrier_breached: bool | None = None
    conversion_occurred: bool | None = None
    protection_active: bool | None = None
    principal_repayment: float
    coupon_earned: float
    total_maturity_value: float
    absolute_profit_loss: float
    return_pct: float


class RiskMetrics(DomainModel):
    total_windows: int
    average_return: float
    median_return: float
    best_return: float
    worst_return: float
    loss_frequency_pct: float
    win_frequency_pct: float
    zero_return_frequency_pct: float
    barrier_breaches: int | None = None
    barrier_breach_freq_pct: float | None = None
    conversion_frequency_pct: float | None = None


class BacktestResponse(DomainModel):
    ticker: str
    product_type: ProductType
    windows: list[BacktestWindowResult]
    metrics: RiskMetrics
    data_source: str
    data_as_of: str
    value_currency: str
    assumptions: str
