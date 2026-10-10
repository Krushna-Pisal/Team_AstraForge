"""
Customer Portal Router for AstraForge.
Enables customer-facing product simulations, suitability evaluation,
and assessment history access with strict caller data isolation.
"""
from typing import Literal, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.auth import get_current_user, User
from app.assessment_records import get_record, list_customer_records, save_record
from app.domain import DomainError
from app.phase2_models import (
    ElnPayoffRequest, ElnPayoffResponse,
    DcdPayoffRequest, DcdPayoffResponse,
    CpnPayoffRequest, CpnPayoffResponse,
)
from app.phase2_engines import calculate_eln_payoff, calculate_dcd_payoff, calculate_cpn_payoff
from app.phase3_sim_models import ScenarioRequest, ScenarioResponse, ProductConfiguration
from app.phase3_simulation import simulate_scenarios
from app.phase4_models import ClientProfile, ProductRiskCharacteristics, SuitabilityRequest, SuitabilityResponse
from app.phase4_suitability import run_suitability_assessment
from app.services import derive_product_risk, configuration, EvaluationBundle

router = APIRouter(prefix="/api/customer", tags=["customer-portal"])


class CustomerSimulationRequest(BaseModel):
    product_type: Literal["ELN", "DCD", "CPN"]
    investment_amount: float = Field(..., gt=0)
    currency: str = "INR"
    ticker: str = "^NSEI"
    tenor_months: int = Field(12, gt=0, le=360)

    # ELN specific
    strike_pct: Optional[float] = Field(90.0, gt=0, le=100)
    barrier_pct: Optional[float] = Field(70.0, gt=0, le=100)
    coupon_pct_pa: Optional[float] = Field(None, ge=0, le=100)

    # DCD specific
    deposit_currency: Optional[str] = "USD"
    alternate_currency: Optional[str] = "INR"
    initial_fx_rate: Optional[float] = 80.0
    conversion_strike_rate: Optional[float] = 84.0
    conversion_condition: Optional[Literal["FX_AT_OR_ABOVE_STRIKE", "FX_AT_OR_BELOW_STRIKE"]] = "FX_AT_OR_ABOVE_STRIKE"

    # CPN specific
    protection_pct: Optional[float] = Field(100.0, ge=0, le=100)
    participation_rate: Optional[float] = Field(100.0, ge=0, le=1000)

    # Suitability profile inputs
    risk_appetite: Literal["CONSERVATIVE", "MODERATE", "AGGRESSIVE"] = "MODERATE"
    investment_horizon_months: int = Field(24, gt=0, le=600)
    max_acceptable_loss_pct: float = Field(15.0, ge=0, le=100)
    liquidity_requirement_months: int = Field(6, ge=0, le=600)
    investment_objective: Literal["INCOME", "GROWTH", "CAPITAL_PRESERVATION"] = "GROWTH"
    total_portfolio_value: Optional[float] = None


@router.get("/profile")
def get_customer_profile(user: User = Depends(get_current_user)):
    """Return profile for the currently authenticated customer."""
    return {"id": user.id, "email": user.email, "role": user.role}


@router.get("/products")
def list_available_products(user: User = Depends(get_current_user)):
    """Return available structured product types for customer exploration."""
    return [
        {
            "type": "CPN",
            "name": "Capital Protected Note",
            "summary": "100% or partial principal protection with equity participation upside.",
            "suitable_for": "Conservative to Moderate investors seeking capital preservation with market upside.",
            "default_ticker": "^NSEI",
            "default_currency": "INR",
        },
        {
            "type": "ELN",
            "name": "Equity Linked Note",
            "summary": "Enhanced coupon yield tied to an underlying stock or index with downside barrier protection.",
            "suitable_for": "Moderate to Aggressive investors seeking above-market yield with defined downside buffer.",
            "default_ticker": "^NSEI",
            "default_currency": "INR",
        },
        {
            "type": "DCD",
            "name": "Dual Currency Deposit",
            "summary": "High-yield short-term currency deposit with potential conversion into an alternate currency.",
            "suitable_for": "Investors with natural multi-currency needs comfortable with alternate currency conversion.",
            "default_ticker": "USDINR=X",
            "default_currency": "USD",
        },
    ]


@router.post("/simulate")
def run_customer_simulation(req: CustomerSimulationRequest, user: User = Depends(get_current_user)):
    """
    Run an end-to-end customer simulation using existing deterministic engines,
    evaluate suitability across all 6 dimensions, and store the snapshot with verified ownership.
    """
    # Strict customer identity enforcement: caller ID is used, ignoring any forged client_id
    customer_id = user.id
    tenor_years = round(req.tenor_months / 12.0, 2)
    portfolio_val = req.total_portfolio_value or (req.investment_amount * 5.0)

    # 1. Build ClientProfile for suitability evaluation
    client_profile = ClientProfile(
        client_id=customer_id,
        client_name=user.email.split("@")[0].replace(".", " ").title(),
        portfolio_currency=req.deposit_currency if req.product_type == "DCD" else req.currency,
        risk_appetite=req.risk_appetite,
        investment_horizon_months=req.investment_horizon_months,
        max_acceptable_loss_pct=req.max_acceptable_loss_pct,
        total_portfolio_value=portfolio_val,
        proposed_investment_amount=req.investment_amount,
        liquidity_requirement_months=req.liquidity_requirement_months,
        investment_objective=req.investment_objective,
    )

    # 2. Compute Payoff using the existing engine
    if req.product_type == "ELN":
        eln_req = ElnPayoffRequest(
            investment_currency=req.currency,
            investment=req.investment_amount,
            initial_price=100.0,
            final_price=105.0,
            strike_pct=req.strike_pct if req.strike_pct is not None else 90.0,
            barrier_pct=req.barrier_pct if req.barrier_pct is not None else 70.0,
            coupon_pct_pa=req.coupon_pct_pa if req.coupon_pct_pa is not None else 12.0,
            tenor_years=tenor_years,
            contract_variant="unconditional_strike",
        )
        payoff_result = calculate_eln_payoff(eln_req)
        config_dict = {
            "product_type": "ELN",
            "eln_config": eln_req.model_dump(),
            "dcd_config": None,
            "cpn_config": None,
        }
        prod_config = ProductConfiguration.model_validate(config_dict)

    elif req.product_type == "DCD":
        dcd_req = DcdPayoffRequest(
            deposit_currency=req.deposit_currency or "USD",
            alternate_currency=req.alternate_currency or "INR",
            deposit_amount=req.investment_amount,
            initial_fx_rate=req.initial_fx_rate if req.initial_fx_rate is not None else 80.0,
            conversion_strike_rate=req.conversion_strike_rate if req.conversion_strike_rate is not None else 84.0,
            maturity_fx_rate=req.initial_fx_rate if req.initial_fx_rate is not None else 80.0,
            coupon_pct_pa=req.coupon_pct_pa if req.coupon_pct_pa is not None else 8.0,
            tenor_years=tenor_years,
            conversion_condition=req.conversion_condition or "FX_AT_OR_ABOVE_STRIKE",
        )
        payoff_result = calculate_dcd_payoff(dcd_req)
        config_dict = {
            "product_type": "DCD",
            "eln_config": None,
            "dcd_config": dcd_req.model_dump(),
            "cpn_config": None,
        }
        prod_config = ProductConfiguration.model_validate(config_dict)

    elif req.product_type == "CPN":
        cpn_req = CpnPayoffRequest(
            investment_currency=req.currency,
            investment=req.investment_amount,
            initial_price=100.0,
            final_price=110.0,
            protection_pct=req.protection_pct if req.protection_pct is not None else 100.0,
            participation_rate=req.participation_rate if req.participation_rate is not None else 100.0,
            coupon_pct_pa=req.coupon_pct_pa if req.coupon_pct_pa is not None else 0.0,
            tenor_years=tenor_years,
        )
        payoff_result = calculate_cpn_payoff(cpn_req)
        config_dict = {
            "product_type": "CPN",
            "eln_config": None,
            "dcd_config": None,
            "cpn_config": cpn_req.model_dump(),
        }
        prod_config = ProductConfiguration.model_validate(config_dict)

    # 3. Simulate Scenarios using existing simulation engine
    scenarios_result = simulate_scenarios(ScenarioRequest(**prod_config.model_dump()))

    # 4. Derive Product Risk Characteristics & Evaluate Suitability
    product_risk = derive_product_risk(prod_config, req.ticker, None, scenarios_result)
    suitability_assessment = run_suitability_assessment(
        SuitabilityRequest(client=client_profile, product_risk=product_risk)
    )

    # 5. Build and Save Assessment Record with caller's owner_id
    evaluation_bundle = EvaluationBundle(
        assessment=suitability_assessment,
        product_risk=product_risk,
        historical_error=None,
    )

    # Mock request model for record storage
    record_request_model = type("RecordedRequest", (), {
        "model_dump": lambda self, mode=None: {
            "product_type": req.product_type,
            "ticker": req.ticker,
            "client": client_profile.model_dump(mode="json"),
            "eln_config": config_dict.get("eln_config"),
            "dcd_config": config_dict.get("dcd_config"),
            "cpn_config": config_dict.get("cpn_config"),
        }
    })()

    save_record(record_request_model, evaluation_bundle, None, owner_id=user.id)

    return {
        "assessment_id": suitability_assessment.assessment_id,
        "product_type": req.product_type,
        "ticker": req.ticker,
        "investment_amount": req.investment_amount,
        "payoff": payoff_result.model_dump(mode="json"),
        "scenarios": scenarios_result.model_dump(mode="json"),
        "suitability": {
            "overall_status": suitability_assessment.overall_status,
            "checks": [c.model_dump(mode="json") for c in suitability_assessment.checks],
            "completeness": suitability_assessment.completeness,
            "rule_set_version": suitability_assessment.rule_set_version,
        },
        "disclaimer": "Simulated returns are illustrative and not guaranteed. Structured products involve market risk and are subject to issuer creditworthiness.",
    }


@router.get("/assessments")
def get_customer_assessments(user: User = Depends(get_current_user)):
    """List all saved assessments belonging to the authenticated customer."""
    return list_customer_records(caller=user)


@router.get("/assessments/{assessment_id}")
def get_customer_assessment_detail(assessment_id: str, user: User = Depends(get_current_user)):
    """
    Retrieve full assessment details. Strictly checks caller ownership (returns 403 if unauthorized).
    """
    return get_record(assessment_id, caller=user)
