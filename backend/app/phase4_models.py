from pydantic import BaseModel, Field, model_validator
from typing import List, Optional, Any, Dict

class ClientProfile(BaseModel):
    client_id: str
    client_name: Optional[str] = None
    risk_appetite: str = Field(..., description="CONSERVATIVE, MODERATE, AGGRESSIVE")
    investment_horizon_months: Optional[int] = None
    max_acceptable_loss_pct: Optional[float] = None
    total_portfolio_value: Optional[float] = None
    existing_underlying_exposure: float = 0.0
    existing_underlying_exposure_pct: float = Field(default=0.0, ge=0, le=100, description="% of total portfolio already in this underlying or tied to it")
    existing_issuer_exposure: float = 0.0
    existing_structured_product_exposure: float = 0.0
    proposed_investment_amount: float = Field(..., gt=0)
    liquidity_requirement_months: Optional[int] = None
    investment_objective: Optional[str] = None
    additional_constraints: Optional[str] = None

    @model_validator(mode="after")
    def validate_portfolio_value(self) -> "ClientProfile":
        if self.total_portfolio_value is not None:
            if self.total_portfolio_value < self.proposed_investment_amount:
                raise ValueError(
                    f"total_portfolio_value ({self.total_portfolio_value}) must be >= proposed_investment_amount ({self.proposed_investment_amount})"
                )
        return self

class ProductRiskCharacteristics(BaseModel):
    product_type: str = Field(..., description="ELN, DCD, CPN")
    product_reference: str
    tenor_years: float
    underlying_asset: str
    issuer: str
    principal_protection_pct: Optional[float] = None
    max_contractual_loss_pct: Optional[float] = None  # None means unknown/100% depending on product
    early_exit_available: bool = False
    # DCD specific
    currency_conversion_risk: bool = False
    # Metrics from Phase 3 backtest
    historical_worst_loss_pct: Optional[float] = None
    # ELN specific attributes if provided
    strike_pct: Optional[float] = None
    barrier_pct: Optional[float] = None
    coupon_pct_pa: Optional[float] = None
    barrier_monitoring: Optional[str] = "daily"

class BacktestSummaryInput(BaseModel):
    worst_historical_loss_pct: Optional[float] = None
    p5_loss_pct: Optional[float] = None
    loss_frequency_pct: Optional[float] = None
    barrier_breach_rate_pct: Optional[float] = None
    total_windows: Optional[int] = None
    num_years: Optional[float] = None
    data_note: Optional[str] = None

class DimensionResult(BaseModel):
    dimension: str
    status: str = Field(..., description="MATCH, REVIEW, MISMATCH, INSUFFICIENT_DATA (or PASS, WARNING)")
    relevant_input_values: dict
    rule_applied: str
    explanation: str
    data_source: Optional[str] = None

class FactorResult(BaseModel):
    factor: str
    status: str
    product_value: Any
    client_limit: Any
    threshold_used: Any

class LossMeasures(BaseModel):
    max_loss_at_barrier: Optional[float] = None
    worst_historical_loss_pct: Optional[float] = None
    p5_loss_pct: Optional[float] = None
    strictest_loss_pct: Optional[float] = None
    driving_measure: Optional[str] = None
    loss_frequency_pct: Optional[float] = None
    barrier_breach_rate_pct: Optional[float] = None
    data_note: Optional[str] = None

class AuditRecord(BaseModel):
    assessment_id: str
    timestamp: str
    rm_name: Optional[str] = None
    inputs: dict = Field(default_factory=dict)
    thresholds_used: dict = Field(default_factory=dict)
    per_factor_results: List[Any] = Field(default_factory=list)
    overall_verdict: str
    data_source: str = "Cached CSV / yfinance (^NSEI)"
    date_range: Optional[str] = None
    override: bool = False
    override_reason: Optional[str] = None
    # Legacy fields for backward compatibility with existing tests
    client_id: Optional[str] = None
    product_reference: Optional[str] = None
    rule_set_version: Optional[str] = "1.0.0"
    input_snapshot: Optional[dict] = None
    dimensions_status: Optional[dict] = None
    explanations: Optional[dict] = None

class SuitabilityRequest(BaseModel):
    client: ClientProfile
    product_risk: ProductRiskCharacteristics
    backtest: Optional[BacktestSummaryInput] = None
    rm_name: Optional[str] = None
    override: Optional[bool] = False
    override_reason: Optional[str] = None

class SuitabilityResponse(BaseModel):
    assessment_id: str
    client_reference: str
    product_reference: str
    timestamp: str
    completeness: str = Field(..., description="COMPLETE or INCOMPLETE")
    overall_verdict: str = Field(..., description="NOT_SUITABLE, SUITABLE_WITH_CAUTION, or SUITABLE")
    factors: List[FactorResult] = Field(default_factory=list)
    dimensions: List[DimensionResult]
    key_warnings_mismatches: List[str]
    rule_set_version: str
    loss_measures: Optional[LossMeasures] = None
    audit_record: Optional[AuditRecord] = None
    override_applied: bool = False
    override_reason: Optional[str] = None
