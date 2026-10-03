import pytest
from pydantic import ValidationError
from app.phase4_models import SuitabilityRequest, ClientProfile, ProductRiskCharacteristics
from app.phase4_suitability import run_suitability_assessment, audit_store

def create_base_client(appetite="MODERATE", horizon=12, max_loss=20.0, portfolio=10_000_000, proposed=1_000_000, liquidity=12):
    return ClientProfile(
        client_id="C123",
        risk_appetite=appetite,
        investment_horizon_months=horizon,
        max_acceptable_loss_pct=max_loss,
        total_portfolio_value=portfolio,
        existing_structured_product_exposure=500_000,
        proposed_investment_amount=proposed,
        liquidity_requirement_months=liquidity
    )

def create_base_product(type="ELN", tenor=1.0, worst_loss=30.0, early_exit=False):
    return ProductRiskCharacteristics(
        product_type=type,
        product_reference="PROD_1",
        tenor_years=tenor,
        underlying_asset="NIFTY50",
        issuer="BankA",
        max_contractual_loss_pct=100.0,
        historical_worst_loss_pct=worst_loss,
        early_exit_available=early_exit
    )

def test_risk_appetite():
    # ELN is HIGH risk. Conservative client should mismatch.
    client = create_base_client(appetite="CONSERVATIVE")
    prod = create_base_product(type="ELN")
    req = SuitabilityRequest(client=client, product_risk=prod)
    res = run_suitability_assessment(req)
    risk_dim = next(d for d in res.dimensions if d.dimension == "RISK_APPETITE")
    assert risk_dim.status == "MISMATCH"

    # Aggressive client should pass HIGH risk.
    client.risk_appetite = "AGGRESSIVE"
    req = SuitabilityRequest(client=client, product_risk=prod)
    res = run_suitability_assessment(req)
    risk_dim = next(d for d in res.dimensions if d.dimension == "RISK_APPETITE")
    assert risk_dim.status == "PASS"

def test_horizon():
    # 1 year tenor (12 months) vs 6 months horizon
    client = create_base_client(horizon=6)
    prod = create_base_product(tenor=1.0)
    req = SuitabilityRequest(client=client, product_risk=prod)
    res = run_suitability_assessment(req)
    dim = next(d for d in res.dimensions if d.dimension == "INVESTMENT_HORIZON")
    assert dim.status == "MISMATCH"

    # Fits
    client.investment_horizon_months = 24
    req = SuitabilityRequest(client=client, product_risk=prod)
    res = run_suitability_assessment(req)
    dim = next(d for d in res.dimensions if d.dimension == "INVESTMENT_HORIZON")
    assert dim.status == "PASS"

def test_loss_tolerance():
    # Max loss 20%, worst product loss 30%
    client = create_base_client(max_loss=20.0)
    prod = create_base_product(worst_loss=30.0)
    req = SuitabilityRequest(client=client, product_risk=prod)
    res = run_suitability_assessment(req)
    dim = next(d for d in res.dimensions if d.dimension == "LOSS_TOLERANCE")
    assert dim.status == "MISMATCH"
    
    # Missing data
    prod.historical_worst_loss_pct = None
    prod.max_contractual_loss_pct = None
    req = SuitabilityRequest(client=client, product_risk=prod)
    res = run_suitability_assessment(req)
    dim = next(d for d in res.dimensions if d.dimension == "LOSS_TOLERANCE")
    assert dim.status == "INSUFFICIENT_DATA"

def test_concentration():
    # Portfolio = 1M, Existing = 0, Proposed = 400K -> 40% (Mismatch)
    client = create_base_client(portfolio=1_000_000, proposed=400_000)
    client.existing_structured_product_exposure = 0
    prod = create_base_product()
    req = SuitabilityRequest(client=client, product_risk=prod)
    res = run_suitability_assessment(req)
    dim = next(d for d in res.dimensions if d.dimension == "PORTFOLIO_CONCENTRATION")
    assert dim.status == "MISMATCH"
    
    # 25% (Warning)
    client.proposed_investment_amount = 250_000
    req = SuitabilityRequest(client=client, product_risk=prod)
    res = run_suitability_assessment(req)
    dim = next(d for d in res.dimensions if d.dimension == "PORTFOLIO_CONCENTRATION")
    assert dim.status == "WARNING"

def test_liquidity():
    # Need in 6 months, tenor 1 year, no early exit
    client = create_base_client(liquidity=6)
    prod = create_base_product(tenor=1.0, early_exit=False)
    req = SuitabilityRequest(client=client, product_risk=prod)
    res = run_suitability_assessment(req)
    dim = next(d for d in res.dimensions if d.dimension == "LIQUIDITY")
    assert dim.status == "MISMATCH"

    # Has early exit
    prod.early_exit_available = True
    req = SuitabilityRequest(client=client, product_risk=prod)
    res = run_suitability_assessment(req)
    dim = next(d for d in res.dimensions if d.dimension == "LIQUIDITY")
    assert dim.status == "PASS"

def test_missing_data_completeness():
    client = create_base_client()
    client.total_portfolio_value = None
    prod = create_base_product()
    req = SuitabilityRequest(client=client, product_risk=prod)
    res = run_suitability_assessment(req)
    assert res.completeness == "INCOMPLETE"
    dim = next(d for d in res.dimensions if d.dimension == "PORTFOLIO_CONCENTRATION")
    assert dim.status == "INSUFFICIENT_DATA"

def test_invalid_input():
    with pytest.raises(ValidationError):
        # negative proposed investment
        ClientProfile(
            client_id="C123",
            risk_appetite="MODERATE",
            proposed_investment_amount=-500
        )

def test_audit_record():
    client = create_base_client()
    prod = create_base_product()
    req = SuitabilityRequest(client=client, product_risk=prod)
    res = run_suitability_assessment(req)
    
    # Check in-memory store
    record = audit_store.get(res.assessment_id)
    assert record is not None
    assert record.client_id == client.client_id
    assert "RISK_APPETITE" in record.dimensions_status
