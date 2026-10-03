from math import isclose
from typing import Annotated, Literal, Optional
from pydantic import AliasChoices, Field, field_validator, model_validator
from app.domain import DomainModel as BaseModel, Currency

class ElnPayoffRequest(BaseModel):
    investment_currency: Currency = "INR"
    investment: float = Field(..., gt=0)
    initial_price: float = Field(..., gt=0)
    final_price: float = Field(..., ge=0)
    strike_pct: float = Field(..., gt=0, le=100)
    barrier_pct: float = Field(..., gt=0, le=100)
    coupon_pct_pa: float = Field(..., ge=0, le=100)
    tenor_years: float = Field(..., gt=0, le=30)
    barrier_breached: bool | None = None
    barrier_monitoring: Literal["daily", "maturity"] = "maturity"
    settlement_method: Literal["cash"] = "cash"
    observed_prices: list[Annotated[float, Field(ge=0)]] | None = Field(None, min_length=2, max_length=20000)
    contract_variant: Literal["phase2_contingent", "unconditional_strike"] = "phase2_contingent"

    @model_validator(mode="after")
    def validate_barrier(self) -> "ElnPayoffRequest":
        if self.barrier_pct >= self.strike_pct:
            raise ValueError("ELN barrier percentage must be strictly lower than strike percentage.")
        if self.observed_prices is not None:
            if not isclose(self.observed_prices[0], self.initial_price) or not isclose(self.observed_prices[-1], self.final_price):
                raise ValueError("Observed path must start at initial_price and end at final_price.")
        elif self.barrier_monitoring == "daily" and self.barrier_breached is None:
            raise ValueError("Daily monitoring requires observed_prices or an explicit observed barrier_breached flag.")
        return self

class ElnPayoffResponse(BaseModel):
    contract_variant: str
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
    deposit_currency: Currency
    alternate_currency: Currency
    deposit_amount: float = Field(..., gt=0)
    initial_fx_rate: float = Field(..., gt=0)
    conversion_strike_rate: float = Field(..., gt=0)
    maturity_fx_rate: float = Field(..., gt=0)
    coupon_pct_pa: float = Field(..., ge=0, le=100, validation_alias=AliasChoices("coupon_pct_pa", "coupon_rate"))
    tenor_years: float = Field(..., gt=0, le=30)
    conversion_condition: Literal["FX_AT_OR_ABOVE_STRIKE", "FX_AT_OR_BELOW_STRIKE"]

    @property
    def coupon_rate(self):
        return self.coupon_pct_pa

    @field_validator("deposit_currency", "alternate_currency", mode="before")
    @classmethod
    def uppercase_currency(cls, value):
        return value.upper() if isinstance(value, str) else value

    @model_validator(mode="after")
    def validate_currencies(self) -> "DcdPayoffRequest":
        if self.deposit_currency.upper() == self.alternate_currency.upper():
            raise ValueError("DCD deposit currency and alternate currency must be different.")
        return self

class CashFlow(BaseModel):
    type: Literal["principal", "coupon"]
    currency: Currency
    amount: float


class DcdPayoffResponse(BaseModel):
    principal_value_deposit_currency: float
    total_value_deposit_currency: float
    absolute_profit_loss: float
    cash_flows: list[CashFlow]
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
    investment_currency: Currency = "INR"
    investment: float = Field(..., gt=0)
    initial_price: float = Field(..., gt=0)
    final_price: float = Field(..., ge=0)
    protection_pct: float = Field(..., ge=0, le=100)
    participation_rate: float = Field(..., ge=0, le=1000, description="Percentage points; 80 means 80%")
    upside_cap_pct: Optional[float] = Field(None, ge=0, le=1000)
    coupon_pct_pa: Optional[float] = Field(None, ge=0, le=100, validation_alias=AliasChoices("coupon_pct_pa", "coupon_rate"))
    tenor_years: float = Field(..., gt=0, le=30)
    cap_basis: Literal["investor_return", "underlying_return"] = "investor_return"

    @property
    def coupon_rate(self):
        return self.coupon_pct_pa

class CpnPayoffResponse(BaseModel):
    underlying_return_pct: float
    protection_active: bool
    cap_applied: bool
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
