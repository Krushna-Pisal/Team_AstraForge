from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ContextProduct(BaseModel):
    product_type: str
    product_reference: str
    underlying_asset: str
    investment_amount: float
    initial_price: Optional[float] = None
    final_price: Optional[float] = None
    strike_percentage: Optional[float] = None
    barrier_percentage: Optional[float] = None
    coupon_rate: Optional[float] = None
    tenor: float
    barrier_monitoring_method: Optional[str] = None
    barrier_breach_status: Optional[bool] = None
    settlement_method: Optional[str] = None
    product_specific_conditions: Optional[Dict[str, Any]] = None

class ContextPayoff(BaseModel):
    principal_repayment: float
    coupon_earned: float
    total_maturity_value: float
    absolute_profit_loss: float
    return_percentage: float
    existing_backend_explanation: str

class ContextSimulationScenario(BaseModel):
    scenario_shock_percentage: float
    underlying_final_level: float
    maturity_value: float
    profit_loss: float
    return_percentage: float
    conversion_status: Optional[bool] = None
    scenario_assumptions: str

class ContextSimulation(BaseModel):
    product_type: str
    scenarios: List[ContextSimulationScenario]

class ContextHistoricalBacktest(BaseModel):
    available: bool
    data_source: Optional[str] = None
    historical_period: Optional[str] = None
    windows_tested: Optional[int] = None
    average_return: Optional[float] = None
    median_return: Optional[float] = None
    best_outcome: Optional[float] = None
    worst_outcome: Optional[float] = None
    loss_frequency: Optional[float] = None
    barrier_breach_frequency: Optional[float] = None
    historical_assumptions: Optional[str] = None

class ContextClientProfile(BaseModel):
    risk_appetite: str
    investment_horizon: Optional[int] = None
    maximum_acceptable_loss: Optional[float] = None
    portfolio_value: Optional[float] = None
    proposed_investment_amount: float
    liquidity_requirements: Optional[int] = None

class ContextProductRisk(BaseModel):
    product_type: str
    product_reference: str
    risk_classification: str
    issuer: str
    tenor: float
    historical_worst_loss: Optional[float] = None
    early_exit_availability: bool

class ContextSuitabilityDimension(BaseModel):
    dimension: str
    status: str
    relevant_input_values: Dict[str, Any]
    rule_applied: str
    existing_explanation: str

class ContextSuitability(BaseModel):
    assessment_id: str
    completeness: str
    rule_set_version: str
    dimensions: List[ContextSuitabilityDimension]
    key_warnings_mismatches: List[str]

class ContextMetadata(BaseModel):
    currency: str
    data_source: str
    data_as_of_date: str
    context_id: str
    source_assessment_id: Optional[str] = None
    assumptions: str

class ExplanationContext(BaseModel):
    product: ContextProduct
    payoff: ContextPayoff
    simulation: Optional[ContextSimulation] = None
    backtest: Optional[ContextHistoricalBacktest] = None
    client_profile: ContextClientProfile
    product_risk: ContextProductRisk
    suitability: ContextSuitability
    metadata: ContextMetadata

class ExplanationResponse(BaseModel):
    context_id: str
    product_summary: str
    how_it_works: str
    potential_return_explanation: str
    potential_loss_explanation: str
    scenario_explanations: str
    historical_performance_explanation: Optional[str] = None
    suitability_explanation: str
    key_risks_and_disclosures: List[str]
    missing_information: List[str]
    generation_method: str

class QuestionRequest(BaseModel):
    context: ExplanationContext
    client_question: str

class QuestionResponse(BaseModel):
    answer: str
    supporting_facts_warnings: List[str]
    unavailable_information: List[str]
