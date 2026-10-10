from __future__ import annotations

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class OptionType(str, Enum):
    CALL = "CALL"
    PUT = "PUT"


class PositionType(str, Enum):
    LONG = "LONG"
    SHORT = "SHORT"


class OptionsSimulationRequest(BaseModel):
    underlying_price: float = Field(..., gt=0, description="Current underlying asset price S0 (> 0)")
    strike_price: float = Field(..., gt=0, description="Option strike price K (> 0)")
    premium: float = Field(..., ge=0, description="Option premium per share (>= 0)")
    quantity: float = Field(default=1.0, gt=0, description="Number of contracts (> 0)")
    multiplier: float = Field(default=100.0, gt=0, description="Contract multiplier (> 0, e.g. 100 shares per contract)")
    expiry_date: str = Field(..., description="Option expiry date string (YYYY-MM-DD or formatted)")
    option_type: OptionType = Field(default=OptionType.CALL, description="CALL or PUT")
    position: PositionType = Field(default=PositionType.LONG, description="LONG or SHORT")
    custom_scenarios: Optional[List[float]] = Field(default=None, description="Optional custom underlying prices")
    custom_shocks_pct: Optional[List[float]] = Field(default=None, description="Optional custom shock percentages")
    ticker: Optional[str] = Field(default="CUSTOM", description="Ticker symbol or identifier")

    @field_validator("expiry_date")
    @classmethod
    def validate_expiry_date(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Expiry date cannot be empty.")
        return s

    @field_validator("option_type", mode="before")
    @classmethod
    def parse_option_type(cls, v: str | OptionType) -> OptionType:
        if isinstance(v, str):
            v_upper = v.strip().upper()
            if v_upper in (OptionType.CALL.value, OptionType.PUT.value):
                return OptionType(v_upper)
            raise ValueError(f"Invalid option_type: {v!r}. Must be 'CALL' or 'PUT'.")
        return v

    @field_validator("position", mode="before")
    @classmethod
    def parse_position(cls, v: str | PositionType) -> PositionType:
        if isinstance(v, str):
            v_upper = v.strip().upper()
            if v_upper in (PositionType.LONG.value, PositionType.SHORT.value):
                return PositionType(v_upper)
            raise ValueError(f"Invalid position: {v!r}. Must be 'LONG' or 'SHORT'.")
        return v


class OptionScenarioItem(BaseModel):
    underlying_price: float
    shock_pct: float
    intrinsic_value: float
    payoff: float
    profit_loss: float
    return_pct: float
    outcome_label: str


class OptionCurvePoint(BaseModel):
    underlying_price: float
    underlying_return_pct: float
    payoff: float
    profit_loss: float
    return_pct: float


class OptionsSimulationResponse(BaseModel):
    underlying_price: float
    strike_price: float
    premium: float
    quantity: float
    multiplier: float
    total_premium: float
    expiry_date: str
    option_type: str
    position: str
    break_even_price: float
    max_profit: Optional[float]
    max_profit_label: str
    max_loss: Optional[float]
    max_loss_label: str
    at_the_money_price: float
    scenarios: List[OptionScenarioItem]
    curve: List[OptionCurvePoint]
    assumptions_and_warnings: str
    formula_explanation: str
