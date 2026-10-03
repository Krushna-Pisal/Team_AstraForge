import pytest
from app.phase5_explanation.models import (
    ExplanationContext, ContextProduct, ContextPayoff,
    ContextClientProfile, ContextProductRisk, ContextSuitability,
    ContextMetadata, ContextSuitabilityDimension
)
from app.phase5_explanation.explanation_service import generate_explanation
from app.phase5_explanation.context_builder import validate_context

def get_valid_context():
    return ExplanationContext(
        product=ContextProduct(
            product_type="ELN",
            product_reference="ELN123",
            underlying_asset="NIFTY50",
            investment_amount=1_000_000,
            tenor=1.0,
            barrier_percentage=75.0,
            strike_percentage=95.0
        ),
        payoff=ContextPayoff(
            principal_repayment=1_000_000,
            coupon_earned=100_000,
            total_maturity_value=1_100_000,
            absolute_profit_loss=100_000,
            return_percentage=10.0,
            existing_backend_explanation="Barrier never breached and final price >= strike. Full principal returned + coupon."
        ),
        client_profile=ContextClientProfile(
            risk_appetite="MODERATE",
            investment_horizon=12,
            maximum_acceptable_loss=15.0,
            portfolio_value=10_000_000,
            proposed_investment_amount=1_000_000
        ),
        product_risk=ContextProductRisk(
            product_type="ELN",
            product_reference="ELN123",
            risk_classification="HIGH",
            issuer="BankA",
            tenor=1.0,
            early_exit_availability=False
        ),
        suitability=ContextSuitability(
            assessment_id="A1",
            completeness="COMPLETE",
            rule_set_version="1.0.0",
            dimensions=[
                ContextSuitabilityDimension(
                    dimension="RISK_APPETITE",
                    status="MISMATCH",
                    relevant_input_values={},
                    rule_applied="",
                    existing_explanation="Client appetite is MODERATE and product risk is classified as HIGH."
                )
            ],
            key_warnings_mismatches=[]
        ),
        metadata=ContextMetadata(
            currency="INR",
            data_source="yfinance",
            data_as_of_date="2026-10-03",
            context_id="ctx-1",
            assumptions="Test"
        )
    )

def test_context_validation():
    ctx = get_valid_context()
    is_valid, errs = validate_context(ctx)
    assert is_valid is True
    assert len(errs) == 0
    
    # Intentionally break reference match
    ctx.product.product_reference = "ELN999"
    is_valid, errs = validate_context(ctx)
    assert is_valid is False
    assert any("does not match" in e for e in errs)

def test_explanation_generation_eln_fallback(monkeypatch):
    monkeypatch.setattr("app.phase5_explanation.llm_service.get_client", lambda: None)
    ctx = get_valid_context()
    resp = generate_explanation(ctx)
    assert "Deterministic Templates" in resp.generation_method
    assert "Equity-Linked Note" in resp.product_summary
    assert "₹1,000,000" in resp.product_summary
    assert "downside barrier" in resp.how_it_works
    assert "Mismatch!" in resp.suitability_explanation
    assert "MODERATE" in resp.suitability_explanation

def test_explanation_generation_dcd_fallback(monkeypatch):
    monkeypatch.setattr("app.phase5_explanation.llm_service.get_client", lambda: None)
    ctx = get_valid_context()
    ctx.product.product_type = "DCD"
    resp = generate_explanation(ctx)
    assert "Dual Currency Deposit" in resp.product_summary
    assert "exchange rate" in resp.how_it_works

class MockResponse:
    def __init__(self, text):
        self.text = text

class MockModels:
    def generate_content(self, model, contents, config):
        return MockResponse('{"context_id": "ctx", "product_summary": "LLM Summary", "how_it_works": "LLM Works", "potential_return_explanation": "Return", "potential_loss_explanation": "Loss", "scenario_explanations": "Scenarios", "historical_performance_explanation": "History", "suitability_explanation": "LLM MISMATCH test", "key_risks_and_disclosures": ["risk1"], "missing_information": [], "generation_method": "Gemini AI"}')

class MockClient:
    def __init__(self):
        self.models = MockModels()

def test_explanation_generation_llm(monkeypatch):
    monkeypatch.setattr("app.phase5_explanation.llm_service.get_client", lambda: MockClient())
    ctx = get_valid_context()
    resp = generate_explanation(ctx)
    assert "Google Gemini AI" in resp.generation_method
    assert resp.product_summary == "LLM Summary"
    assert "MISMATCH" in resp.suitability_explanation

def test_explanation_generation_llm_validator_override(monkeypatch):
    class MockModelsNoStatus:
        def generate_content(self, model, contents, config):
            return MockResponse('{"context_id": "ctx", "product_summary": "LLM Summary", "how_it_works": "LLM Works", "potential_return_explanation": "Return", "potential_loss_explanation": "Loss", "scenario_explanations": "Scenarios", "historical_performance_explanation": "History", "suitability_explanation": "Looks good!", "key_risks_and_disclosures": ["risk1"], "missing_information": [], "generation_method": "Gemini AI"}')
            
    class MockClientNoStatus:
        def __init__(self):
            self.models = MockModelsNoStatus()
            
    monkeypatch.setattr("app.phase5_explanation.llm_service.get_client", lambda: MockClientNoStatus())
    ctx = get_valid_context()
    resp = generate_explanation(ctx)
    # The validator should force the status back in
    assert "[SYSTEM OVERRIDE]" in resp.suitability_explanation
    assert "MISMATCH" in resp.suitability_explanation


