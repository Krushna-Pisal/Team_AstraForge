from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime

class ClientProfile(BaseModel):
    client_id: str
    client_name: Optional[str] = None
    risk_appetite: str = Field(..., description="CONSERVATIVE, MODERATE, AGGRESSIVE")
    investment_horizon_months: Optional[int] = None
    max_acceptable_loss_pct: Optional[float] = None
    total_portfolio_value: Optional[float] = None
    existing_underlying_exposure: float = 0.0
    existing_issuer_exposure: float = 0.0
    existing_structured_product_exposure: float = 0.0
    proposed_investment_amount: float = Field(..., gt=0)
    liquidity_requirement_months: Optional[int] = None
    investment_objective: Optional[str] = None
    additional_constraints: Optional[str] = None

class ProductRiskCharacteristics(BaseModel):
    product_type: str = Field(..., description="ELN, DCD, CPN")
    product_reference: str
    tenor_years: float
    underlying_asset: str
    issuer: str
    principal_protection_pct: Optional[float] = None
    max_contractual_loss_pct: Optional[float] = None # None means unknown/100% depending on product
    early_exit_available: bool = False
    # DCD specific
    currency_conversion_risk: bool = False
    # Metrics from Phase 3 backtest
    historical_worst_loss_pct: Optional[float] = None
    
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
    assessment_id: str
    client_reference: str
    product_reference: str
    timestamp: str
    completeness: str = Field(..., description="COMPLETE or INCOMPLETE")
    dimensions: List[DimensionResult]
    key_warnings_mismatches: List[str]
    rule_set_version: str

class AuditRecord(BaseModel):
    assessment_id: str
    client_id: str
    product_reference: str
    timestamp: str
    rule_set_version: str
    input_snapshot: dict
    dimensions_status: dict
    explanations: dict
