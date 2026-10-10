from __future__ import annotations

from enum import IntEnum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class CouponFrequency(IntEnum):
    ANNUAL = 1
    SEMI_ANNUAL = 2
    QUARTERLY = 4
    MONTHLY = 12


class DebentureRequest(BaseModel):
    face_value: float = Field(..., gt=0, description="Debenture face value / par value (> 0)")
    purchase_price: float = Field(..., gt=0, description="Purchase price (> 0)")
    coupon_rate_pct: float = Field(..., ge=0, description="Annual coupon rate as percentage (>= 0)")
    frequency: int = Field(default=2, description="Payments per year: 1=Annual, 2=Semi-Annual, 4=Quarterly, 12=Monthly")
    years_to_maturity: float = Field(..., gt=0, description="Years until debenture maturity (> 0)")
    redemption_value: Optional[float] = Field(default=None, description="Redemption / maturity proceeds (> 0, defaults to face_value)")
    market_yield_pct: float = Field(default=8.0, ge=0, description="Prevailing market yield to maturity in percent (>= 0)")
    currency: Optional[str] = Field(default="INR", description="Currency symbol / ISO code")
    custom_yield_shocks_bps: Optional[List[float]] = Field(default=None, description="Optional custom yield shocks in basis points")

    @field_validator("frequency")
    @classmethod
    def validate_frequency(cls, v: int) -> int:
        if v not in (1, 2, 4, 12):
            raise ValueError(f"Invalid payment frequency: {v}. Must be 1 (Annual), 2 (Semi-Annual), 4 (Quarterly), or 12 (Monthly).")
        return v

    @field_validator("redemption_value")
    @classmethod
    def validate_redemption(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("Redemption value must be strictly positive (> 0).")
        return v


class CashFlowItem(BaseModel):
    period: int
    time_years: float
    coupon_payment: float
    redemption_payment: float
    total_cash_flow: float
    discounted_cash_flow: float


class YieldScenarioItem(BaseModel):
    yield_pct: float
    shock_bps: float
    present_value: float
    price_change_vs_pv: float
    price_change_pct: float
    price_status: str


class DebentureCurvePoint(BaseModel):
    yield_pct: float
    present_value: float


class DebentureResponse(BaseModel):
    face_value: float
    purchase_price: float
    coupon_rate_pct: float
    frequency: int
    frequency_label: str
    years_to_maturity: float
    total_periods: int
    redemption_value: float
    market_yield_pct: float

    # Key cash flows & yields
    periodic_coupon: float
    total_coupons: float
    total_cash_flows: float
    current_yield_pct: float
    ytm_purchase_price_pct: float
    effective_annual_ytm_pct: float

    # Valuation & Pricing
    present_value_market_yield: float
    premium_discount_amount: float
    premium_discount_pct: float
    pricing_status: str

    # Duration & Risk
    macaulay_duration_years: float
    modified_duration: float

    # Cash flows, Scenarios & Curve
    cash_flows: List[CashFlowItem]
    scenarios: List[YieldScenarioItem]
    curve: List[DebentureCurvePoint]

    assumptions_and_disclaimers: str
