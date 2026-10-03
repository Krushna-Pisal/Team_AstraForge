"""
Pydantic models for the Structured Investment Product Payoff Simulator.
"""

from __future__ import annotations

from typing import Literal
from pydantic import Field, model_validator
from app.domain import DomainModel as BaseModel


VALID_UNDERLYINGS = ["NIFTY50"]


class ProductInput(BaseModel):
    """Input model for an Equity-Linked Note (ELN) product."""

    underlying: Literal["NIFTY50"] = Field(default="NIFTY50", description="Underlying index")
    investment: float = Field(default=1_000_000, gt=0, description="Investment amount in INR")
    tenor_years: float = Field(default=1.0, description="Tenor in years (0.5, 1, or 2)")
    strike_pct: float = Field(default=90.0, ge=1, le=100, description="Strike as % of S0 (70–100)")
    barrier_pct: float = Field(default=70.0, ge=1, le=99, description="Barrier as % of S0 (40–85)")
    barrier_monitoring: Literal["daily", "maturity"] = Field(
        default="daily", description="Barrier observation: daily or at maturity"
    )
    coupon_pct_pa: float = Field(default=12.0, gt=0, le=30, description="Annual coupon in % (1–30)")

    @model_validator(mode="after")
    def check_barrier_lt_strike(self) -> "ProductInput":
        if self.barrier_pct >= self.strike_pct:
            raise ValueError(
                f"barrier_pct ({self.barrier_pct}) must be strictly less than strike_pct ({self.strike_pct})"
            )
        if self.tenor_years not in (0.5, 1.0, 2.0):
            raise ValueError("tenor_years must be one of 0.5, 1, or 2")
        if not (40 <= self.barrier_pct <= 85):
            raise ValueError("barrier_pct must be between 40 and 85")
        if not (70 <= self.strike_pct <= 100):
            raise ValueError("strike_pct must be between 70 and 100")
        return self


class PayoffResult(BaseModel):
    """Single payoff computation result."""

    redemption: float
    coupon_amount: float
    final_amount: float
    profit_loss: float
    return_pct: float
    barrier_breached: bool


class CurvePoint(BaseModel):
    """A single point on the payoff curve."""

    underlying_return_pct: float
    investor_return_pct: float


class ScenarioResult(BaseModel):
    """Scenario result for a given shock."""

    shock_pct: float
    underlying_return_pct: float
    redemption: float
    coupon_amount: float
    final_amount: float
    profit_loss: float
    return_pct: float
    barrier_breached: bool


class PayoffResponse(BaseModel):
    """Full API response for POST /payoff."""

    s0: float
    barrier_price: float
    strike_price: float
    curve: list[CurvePoint]
    scenarios: list[ScenarioResult]
    formula_text: str


class PriceInfo(BaseModel):
    """Response for GET /prices/{underlying}."""

    s0: float
    start_date: str
    end_date: str
    count: int
