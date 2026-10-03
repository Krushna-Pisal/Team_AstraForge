from typing import Literal, Optional
from pydantic import BaseModel, Field, model_validator

class ElnPayoffRequest(BaseModel):
    investment: float = Field(..., gt=0)
    initial_price: float = Field(..., gt=0)
    final_price: float = Field(..., ge=0)
    strike_pct: float = Field(..., ge=0)
    barrier_pct: float = Field(..., ge=0)
    coupon_pct_pa: float = Field(..., ge=0)
    tenor_years: float = Field(..., gt=0)
    barrier_breached: bool
    barrier_monitoring: str
    settlement_method: str

    @model_validator(mode="after")
    def validate_barrier(self) -> "ElnPayoffRequest":
        if self.barrier_pct >= self.strike_pct:
            raise ValueError("ELN barrier percentage must be strictly lower than strike percentage.")
        return self

class ElnPayoffResponse(BaseModel):
    initial_price: float
    final_price: float
    strike_price: float
    barrier_price: float
    barrier_breached: bool
    principal_repayment: float
    coupon_earned: float
    total_maturity_value: float
    absolute_profit_loss: float
    return_pct: float
    payoff_explanation: str
    contract_assumptions: str


class DcdPayoffRequest(BaseModel):
    deposit_currency: str = Field(..., min_length=3, max_length=3)
    alternate_currency: str = Field(..., min_length=3, max_length=3)
    deposit_amount: float = Field(..., gt=0)
    initial_fx_rate: float = Field(..., gt=0)
    conversion_strike_rate: float = Field(..., gt=0)
    maturity_fx_rate: float = Field(..., gt=0)
    coupon_rate: float = Field(..., ge=0)
    tenor_years: float = Field(..., gt=0)
    conversion_condition: Literal["FX_AT_OR_ABOVE_STRIKE", "FX_AT_OR_BELOW_STRIKE"]

    @model_validator(mode="after")
    def validate_currencies(self) -> "DcdPayoffRequest":
        if self.deposit_currency.upper() == self.alternate_currency.upper():
            raise ValueError("DCD deposit currency and alternate currency must be different.")
        return self

class DcdPayoffResponse(BaseModel):
    deposit_currency: str
    alternate_currency: str
    maturity_fx_rate: float
    conversion_strike: float
    conversion_occurred: bool
    principal_repayment_amount: float
    repayment_currency: str
    coupon_amount: float
    coupon_currency: str
    total_maturity_repayment: float
    effective_return_pct: float
    explanation: str
    contract_assumptions: str


class CpnPayoffRequest(BaseModel):
    investment: float = Field(..., gt=0)
    initial_price: float = Field(..., gt=0)
    final_price: float = Field(..., ge=0)
    protection_pct: float = Field(..., ge=0, le=100)
    participation_rate: float = Field(..., ge=0)
    upside_cap_pct: Optional[float] = Field(None, ge=0)
    coupon_rate: Optional[float] = Field(None, ge=0)
    tenor_years: float = Field(..., gt=0)

class CpnPayoffResponse(BaseModel):
    investment_amount: float
    initial_price: float
    final_price: float
    underlying_return: float
    protected_principal: float
    participation_gain: float
    coupon: float
    total_maturity_value: float
    absolute_profit_loss: float
    return_pct: float
    explanation: str
    contract_assumptions: str
