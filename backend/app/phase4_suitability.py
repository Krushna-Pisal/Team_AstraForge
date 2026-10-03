import uuid
from datetime import datetime
from typing import List, Dict, Any
from app.phase4_models import (
    SuitabilityRequest, SuitabilityResponse, DimensionResult,
    ClientProfile, ProductRiskCharacteristics, AuditRecord
)

# In-memory audit persistence adapter
class AuditStore:
    def __init__(self):
        self.records: Dict[str, AuditRecord] = {}

    def save(self, record: AuditRecord):
        self.records[record.assessment_id] = record

    def get(self, assessment_id: str) -> AuditRecord:
        return self.records.get(assessment_id)

audit_store = AuditStore()

RULE_SET_VERSION = "1.0.0"

def determine_product_risk(product: ProductRiskCharacteristics) -> str:
    """Basic deterministic product risk classifier."""
    if product.product_type == "CPN":
        if product.principal_protection_pct and product.principal_protection_pct >= 100.0:
            return "LOW"
        return "MEDIUM"
    elif product.product_type == "ELN":
        return "HIGH" # Standard non-protected equity risk
    elif product.product_type == "DCD":
        return "HIGH" # Currency conversion risk
    return "HIGH" # Default fallback

def evaluate_risk_appetite(client: ClientProfile, product: ProductRiskCharacteristics) -> DimensionResult:
    prod_risk = determine_product_risk(product)
    appetite = client.risk_appetite.upper()
    
    status = "MISMATCH"
    if appetite == "AGGRESSIVE":
        status = "PASS"
    elif appetite == "MODERATE" and prod_risk in ["LOW", "MEDIUM"]:
        status = "PASS"
    elif appetite == "CONSERVATIVE" and prod_risk == "LOW":
        status = "PASS"
        
    explanation = f"Client appetite is {appetite} and product risk is classified as {prod_risk}."
    if status == "MISMATCH":
        explanation += " The product risk level exceeds the client's risk appetite."
        
    return DimensionResult(
        dimension="RISK_APPETITE",
        status=status,
        relevant_input_values={"client_appetite": appetite, "product_risk": prod_risk},
        rule_applied="Conservative=Low, Moderate=Low/Medium, Aggressive=Any",
        explanation=explanation
    )

def evaluate_horizon(client: ClientProfile, product: ProductRiskCharacteristics) -> DimensionResult:
    if client.investment_horizon_months is None:
        return DimensionResult(
            dimension="INVESTMENT_HORIZON",
            status="INSUFFICIENT_DATA",
            relevant_input_values={},
            rule_applied="Product tenor <= Client Horizon",
            explanation="Client investment horizon is not provided."
        )
        
    tenor_months = product.tenor_years * 12
    status = "PASS" if tenor_months <= client.investment_horizon_months else "MISMATCH"
    explanation = f"Product tenor is {tenor_months} months; Client horizon is {client.investment_horizon_months} months."
    if status == "MISMATCH":
        explanation += " The product's maturity exceeds the client's stated investment timeframe. Early exit may not be possible."
        
    return DimensionResult(
        dimension="INVESTMENT_HORIZON",
        status=status,
        relevant_input_values={"product_tenor_months": tenor_months, "client_horizon_months": client.investment_horizon_months},
        rule_applied="Product tenor <= Client Horizon",
        explanation=explanation
    )

def evaluate_loss_tolerance(client: ClientProfile, product: ProductRiskCharacteristics) -> DimensionResult:
    if client.max_acceptable_loss_pct is None:
        return DimensionResult(
            dimension="LOSS_TOLERANCE",
            status="INSUFFICIENT_DATA",
            relevant_input_values={},
            rule_applied="Worst potential loss <= Client Max Tolerance",
            explanation="Client max acceptable loss is not provided."
        )
        
    worst_loss = None
    if product.max_contractual_loss_pct is not None:
        worst_loss = product.max_contractual_loss_pct
    if product.historical_worst_loss_pct is not None:
        if worst_loss is None or product.historical_worst_loss_pct > worst_loss:
            worst_loss = product.historical_worst_loss_pct
            
    if worst_loss is None:
        return DimensionResult(
            dimension="LOSS_TOLERANCE",
            status="INSUFFICIENT_DATA",
            relevant_input_values={"client_tolerance": client.max_acceptable_loss_pct},
            rule_applied="Worst potential loss <= Client Max Tolerance",
            explanation="Product contractual downside or historical worst loss is unknown. Cannot accurately assess loss tolerance."
        )
        
    status = "PASS" if worst_loss <= client.max_acceptable_loss_pct else "MISMATCH"
    explanation = f"Assessed worst loss is {worst_loss}%. Client tolerance is {client.max_acceptable_loss_pct}%."
    if status == "MISMATCH":
        explanation += " The assessed potential loss exceeds the client's stated tolerance."
    explanation += " Note: Historical worst loss is not the maximum possible future loss."
    
    return DimensionResult(
        dimension="LOSS_TOLERANCE",
        status=status,
        relevant_input_values={"worst_loss_evaluated": worst_loss, "client_tolerance": client.max_acceptable_loss_pct},
        rule_applied="Worst potential loss <= Client Max Tolerance",
        explanation=explanation
    )

def evaluate_concentration(client: ClientProfile) -> DimensionResult:
    if client.total_portfolio_value is None or client.total_portfolio_value <= 0:
        return DimensionResult(
            dimension="PORTFOLIO_CONCENTRATION",
            status="INSUFFICIENT_DATA",
            relevant_input_values={},
            rule_applied="<20% PASS, 20-30% WARNING, >30% MISMATCH",
            explanation="Client total portfolio value is missing or zero."
        )
        
    # We assess structured product overall concentration as an example
    proposed_exposure = client.existing_structured_product_exposure + client.proposed_investment_amount
    concentration_pct = (proposed_exposure / client.total_portfolio_value) * 100.0
    
    if concentration_pct <= 20.0:
        status = "PASS"
    elif concentration_pct <= 30.0:
        status = "WARNING"
    else:
        status = "MISMATCH"
        
    explanation = f"Proposed structured product concentration is {concentration_pct:.2f}% of total portfolio."
    
    return DimensionResult(
        dimension="PORTFOLIO_CONCENTRATION",
        status=status,
        relevant_input_values={
            "proposed_exposure": proposed_exposure,
            "total_portfolio": client.total_portfolio_value,
            "concentration_pct": concentration_pct
        },
        rule_applied="<20% PASS, 20-30% WARNING, >30% MISMATCH",
        explanation=explanation
    )

def evaluate_liquidity(client: ClientProfile, product: ProductRiskCharacteristics) -> DimensionResult:
    if client.liquidity_requirement_months is None:
        return DimensionResult(
            dimension="LIQUIDITY",
            status="INSUFFICIENT_DATA",
            relevant_input_values={},
            rule_applied="Early exit available OR Product tenor <= Liquidity req",
            explanation="Client liquidity requirement is not provided."
        )
        
    tenor_months = product.tenor_years * 12
    if product.early_exit_available:
        status = "PASS"
        explanation = "Product offers early exit options fulfilling liquidity requirements."
    elif tenor_months <= client.liquidity_requirement_months:
        status = "PASS"
        explanation = f"Product tenor ({tenor_months}m) fits within client liquidity constraints ({client.liquidity_requirement_months}m)."
    else:
        status = "MISMATCH"
        explanation = f"Product tenor ({tenor_months}m) exceeds client liquidity constraints ({client.liquidity_requirement_months}m) and no early exit is guaranteed."
        
    return DimensionResult(
        dimension="LIQUIDITY",
        status=status,
        relevant_input_values={
            "early_exit": product.early_exit_available,
            "tenor_months": tenor_months,
            "liquidity_req": client.liquidity_requirement_months
        },
        rule_applied="Early exit available OR Product tenor <= Liquidity req",
        explanation=explanation
    )

def run_suitability_assessment(req: SuitabilityRequest) -> SuitabilityResponse:
    d_risk = evaluate_risk_appetite(req.client, req.product_risk)
    d_horizon = evaluate_horizon(req.client, req.product_risk)
    d_loss = evaluate_loss_tolerance(req.client, req.product_risk)
    d_conc = evaluate_concentration(req.client)
    d_liq = evaluate_liquidity(req.client, req.product_risk)
    
    dimensions = [d_risk, d_horizon, d_loss, d_conc, d_liq]
    
    is_incomplete = any(d.status == "INSUFFICIENT_DATA" for d in dimensions)
    completeness = "INCOMPLETE" if is_incomplete else "COMPLETE"
    
    warnings = []
    for d in dimensions:
        if d.status in ["WARNING", "MISMATCH"]:
            warnings.append(f"[{d.dimension}] {d.status}: {d.explanation}")
            
    assessment_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat()
    
    resp = SuitabilityResponse(
        assessment_id=assessment_id,
        client_reference=req.client.client_id,
        product_reference=req.product_risk.product_reference,
        timestamp=timestamp,
        completeness=completeness,
        dimensions=dimensions,
        key_warnings_mismatches=warnings,
        rule_set_version=RULE_SET_VERSION
    )
    
    # Audit trail
    record = AuditRecord(
        assessment_id=assessment_id,
        client_id=req.client.client_id,
        product_reference=req.product_risk.product_reference,
        timestamp=timestamp,
        rule_set_version=RULE_SET_VERSION,
        input_snapshot=req.model_dump(),
        dimensions_status={d.dimension: d.status for d in dimensions},
        explanations={d.dimension: d.explanation for d in dimensions}
    )
    audit_store.save(record)
    
    return resp
