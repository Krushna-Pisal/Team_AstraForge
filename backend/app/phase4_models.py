from pydantic import Field, model_validator
from typing import List, Optional, Any, Literal
from app.domain import DomainModel as BaseModel, ProductType, Currency
from datetime import datetime

class ClientProfile(BaseModel):
    exposure_details_provided: bool = True
    portfolio_currency: Currency = "INR"
    client_id: str = Field(min_length=1, max_length=100)
    client_name: Optional[str] = None
    risk_appetite: Literal["CONSERVATIVE", "MODERATE", "AGGRESSIVE"]
    investment_horizon_months: Optional[int] = Field(None, gt=0, le=600)
    max_acceptable_loss_pct: Optional[float] = Field(None, ge=0, le=100)
    total_portfolio_value: Optional[float] = Field(None, gt=0)
    existing_underlying_exposure: float = Field(0, ge=0)
    existing_issuer_exposure: float = Field(0, ge=0)
    existing_structured_product_exposure: float = Field(0, ge=0)
    proposed_investment_amount: float = Field(..., gt=0)
    liquidity_requirement_months: Optional[int] = Field(None, ge=0, le=600)
    investment_objective: Optional[Literal["INCOME", "GROWTH", "CAPITAL_PRESERVATION"]] = None
    additional_constraints: Optional[str] = None

    @model_validator(mode="after")
    def portfolio_consistency(self):
        if self.total_portfolio_value is not None:
            if self.proposed_investment_amount > self.total_portfolio_value:
                raise ValueError("Proposed investment exceeds total portfolio value.")
            for exposure in (self.existing_underlying_exposure, self.existing_issuer_exposure, self.existing_structured_product_exposure):
                if exposure + self.proposed_investment_amount > self.total_portfolio_value:
                    raise ValueError("Existing exposure plus proposed investment exceeds total portfolio value.")
        return self

class ProductRiskCharacteristics(BaseModel):
    product_type: ProductType
    product_reference: str
    tenor_years: float = Field(gt=0, le=30)
    underlying_asset: str
    issuer: str
    principal_protection_pct: Optional[float] = Field(None, ge=0, le=100)
    max_contractual_loss_pct: Optional[float] = Field(None, ge=0, le=100)
    coupon_pct_pa: float | None = Field(None, ge=0, le=100)
    upside_participation: bool | None = None
    risk_scope: str = "Modeled market payoff only; issuer default can lose all capital."
    early_exit_available: bool = False
    # DCD specific
    currency_conversion_risk: bool = False
    # Metrics from Phase 3 backtest
    stress_loss_pct: Optional[float] = Field(None, ge=0, le=100)
    historical_worst_loss_pct: Optional[float] = Field(None, ge=0, le=100)
    assessed_loss_pct: Optional[float] = Field(None, ge=0, le=100)
    
class DimensionResult(BaseModel):
    dimension: str
    status: str = Field(..., description="PASS, WARNING, MISMATCH, INSUFFICIENT_DATA")
    relevant_input_values: dict
    rule_applied: str
    explanation: str
    data_source: Optional[str] = None

class SuitabilityRequest(BaseModel):
    client: ClientProfile
    product_risk: ProductRiskCharacteristics

class SuitabilityResponse(BaseModel):
    overall_status: Literal["suitable", "suitable_with_warnings", "review_required"]
    checks: list["SuitabilityCheck"]
    assessment_id: str
    client_reference: str
    product_reference: str
    timestamp: str
    completeness: str = Field(..., description="COMPLETE or INCOMPLETE")
    dimensions: List[DimensionResult]
    key_warnings_mismatches: List[str]
    rule_set_version: str


class SuitabilityCheck(BaseModel):
    type: Literal["risk_appetite", "investment_horizon", "loss_tolerance", "portfolio_concentration", "liquidity", "investment_objective"]
    status: Literal["PASS", "WARNING", "MISMATCH"]
    client_value: Any
    product_value: Any
    reason_code: str
    reason: str

class AuditRecord(BaseModel):
    assessment_id: str
    client_id: str
    product_reference: str
    timestamp: str
    rule_set_version: str
    input_snapshot: dict
    dimensions_status: dict
    explanations: dict
