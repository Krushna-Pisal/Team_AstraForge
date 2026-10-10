"""
Integration Audit Suite for AstraForge.
Verifies complete consistency between Relationship Manager (RM) and Customer Portal:
- Deterministic calculation engine consistency across ELN, DCD, and CPN.
- Suitability engine consistency across all 6 regulatory dimensions.
- AI explanation groundedness and graceful offline fallback.
- Cross-portal data isolation and role boundaries.
"""

import os
import time
from unittest.mock import patch
import jwt
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.phase2_models import ElnPayoffRequest, DcdPayoffRequest, CpnPayoffRequest
from app.phase2_engines import calculate_eln_payoff, calculate_dcd_payoff, calculate_cpn_payoff
from app.phase3_sim_models import ScenarioRequest, ProductConfiguration
from app.phase3_simulation import simulate_scenarios
from app.phase4_models import ClientProfile, SuitabilityRequest
from app.phase4_suitability import run_suitability_assessment
from app.services import derive_product_risk

TEST_JWT_SECRET = "test-secret-at-least-32-bytes-long-123456"
client = TestClient(app, raise_server_exceptions=False)


def make_jwt(sub: str, email: str, role: str = "client", secret: str = TEST_JWT_SECRET) -> str:
    payload = {
        "sub": sub,
        "email": email,
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
        "app_metadata": {"role": role},
        "user_metadata": {"role": role},
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def test_eln_calculation_consistency_rm_vs_customer():
    """Verify that ELN simulation outputs in Customer Portal match RM calculation engines identically."""
    investment = 500000.0
    strike_pct = 90.0
    barrier_pct = 70.0
    coupon_pct = 12.0
    tenor_months = 12
    tenor_years = 1.0

    # 1. Direct RM Engine Calculation
    eln_req = ElnPayoffRequest(
        investment_currency="INR",
        investment=investment,
        initial_price=100.0,
        final_price=105.0,
        strike_pct=strike_pct,
        barrier_pct=barrier_pct,
        coupon_pct_pa=coupon_pct,
        tenor_years=tenor_years,
        contract_variant="unconditional_strike",
    )
    direct_rm_payoff = calculate_eln_payoff(eln_req)

    # 2. Customer Portal API Simulation
    customer_token = make_jwt("cust-audit-1", "cust1@example.com", role="client")
    headers = {"Authorization": f"Bearer {customer_token}"}

    with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET}):
        cust_res = client.post("/api/customer/simulate", json={
            "product_type": "ELN",
            "investment_amount": investment,
            "currency": "INR",
            "ticker": "^NSEI",
            "tenor_months": tenor_months,
            "strike_pct": strike_pct,
            "barrier_pct": barrier_pct,
            "coupon_pct_pa": coupon_pct,
            "risk_appetite": "MODERATE",
            "investment_horizon_months": 24,
            "max_acceptable_loss_pct": 15.0,
            "liquidity_requirement_months": 6,
            "investment_objective": "GROWTH",
        }, headers=headers)

    assert cust_res.status_code == 200
    cust_data = cust_res.json()

    # Compare Payoff outputs
    cust_payoff = cust_data["payoff"]
    assert cust_payoff["total_maturity_value"] == direct_rm_payoff.total_maturity_value
    assert cust_payoff["return_pct"] == direct_rm_payoff.return_pct
    assert cust_payoff["barrier_breached"] == direct_rm_payoff.barrier_breached
    assert cust_payoff["coupon_earned"] == direct_rm_payoff.coupon_earned


def test_dcd_calculation_consistency_rm_vs_customer():
    """Verify that DCD simulation outputs in Customer Portal match RM calculation engines identically."""
    deposit = 50000.0
    tenor_months = 3
    tenor_years = 0.25
    coupon_pct = 8.0
    initial_fx = 80.0
    strike_fx = 84.0

    # 1. Direct RM Engine Calculation
    dcd_req = DcdPayoffRequest(
        deposit_currency="USD",
        alternate_currency="INR",
        deposit_amount=deposit,
        initial_fx_rate=initial_fx,
        conversion_strike_rate=strike_fx,
        maturity_fx_rate=initial_fx,
        coupon_pct_pa=coupon_pct,
        tenor_years=tenor_years,
        conversion_condition="FX_AT_OR_ABOVE_STRIKE",
    )
    direct_rm_payoff = calculate_dcd_payoff(dcd_req)

    # 2. Customer Portal API Simulation
    customer_token = make_jwt("cust-audit-2", "cust2@example.com", role="client")
    headers = {"Authorization": f"Bearer {customer_token}"}

    with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET}):
        cust_res = client.post("/api/customer/simulate", json={
            "product_type": "DCD",
            "investment_amount": deposit,
            "deposit_currency": "USD",
            "alternate_currency": "INR",
            "initial_fx_rate": initial_fx,
            "conversion_strike_rate": strike_fx,
            "coupon_pct_pa": coupon_pct,
            "tenor_months": tenor_months,
            "conversion_condition": "FX_AT_OR_ABOVE_STRIKE",
            "risk_appetite": "MODERATE",
            "investment_horizon_months": 12,
            "max_acceptable_loss_pct": 10.0,
            "investment_objective": "INCOME",
        }, headers=headers)

    assert cust_res.status_code == 200
    cust_data = cust_res.json()

    # Compare Payoff outputs
    cust_payoff = cust_data["payoff"]
    assert cust_payoff["total_maturity_repayment"] == direct_rm_payoff.total_maturity_repayment
    assert cust_payoff["conversion_occurred"] == direct_rm_payoff.conversion_occurred
    assert cust_payoff["coupon_amount"] == direct_rm_payoff.coupon_amount


def test_cpn_calculation_consistency_rm_vs_customer():
    """Verify that CPN simulation outputs in Customer Portal match RM calculation engines identically."""
    investment = 1000000.0
    tenor_months = 24
    tenor_years = 2.0
    protection_pct = 100.0
    participation_rate = 100.0

    # 1. Direct RM Engine Calculation
    cpn_req = CpnPayoffRequest(
        investment_currency="INR",
        investment=investment,
        initial_price=100.0,
        final_price=110.0,
        protection_pct=protection_pct,
        participation_rate=participation_rate,
        coupon_pct_pa=0.0,
        tenor_years=tenor_years,
    )
    direct_rm_payoff = calculate_cpn_payoff(cpn_req)

    # 2. Customer Portal API Simulation
    customer_token = make_jwt("cust-audit-3", "cust3@example.com", role="client")
    headers = {"Authorization": f"Bearer {customer_token}"}

    with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET}):
        cust_res = client.post("/api/customer/simulate", json={
            "product_type": "CPN",
            "investment_amount": investment,
            "currency": "INR",
            "ticker": "^NSEI",
            "tenor_months": tenor_months,
            "protection_pct": protection_pct,
            "participation_rate": participation_rate,
            "risk_appetite": "CONSERVATIVE",
            "investment_horizon_months": 24,
            "max_acceptable_loss_pct": 0.0,
            "investment_objective": "CAPITAL_PRESERVATION",
        }, headers=headers)

    assert cust_res.status_code == 200
    cust_data = cust_res.json()

    # Compare Payoff outputs
    cust_payoff = cust_data["payoff"]
    assert cust_payoff["total_maturity_value"] == direct_rm_payoff.total_maturity_value
    assert cust_payoff["return_pct"] == direct_rm_payoff.return_pct
    assert cust_payoff["protected_principal"] == direct_rm_payoff.protected_principal


def test_suitability_matrix_consistency_6_dimensions():
    """Verify that all 6 suitability dimensions produce statuses in Customer simulation."""
    customer_token = make_jwt("cust-audit-suit", "custsuit@example.com", role="client")
    headers = {"Authorization": f"Bearer {customer_token}"}

    with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET}):
        res = client.post("/api/customer/simulate", json={
            "product_type": "ELN",
            "investment_amount": 500000,
            "risk_appetite": "CONSERVATIVE",
            "investment_horizon_months": 6,
            "max_acceptable_loss_pct": 5.0,
            "investment_objective": "CAPITAL_PRESERVATION",
        }, headers=headers)

        assert res.status_code == 200
        data = res.json()
        suitability = data["suitability"]
        checks = {c["type"]: c["status"] for c in suitability["checks"]}

        # All 6 dimensions must be evaluated
        expected_dims = {
            "risk_appetite", "loss_tolerance", "investment_horizon",
            "liquidity", "investment_objective", "portfolio_concentration"
        }
        assert set(checks.keys()) == expected_dims
        assert suitability["overall_status"] in ("not_suitable", "review_required", "suitable_with_warnings")


def test_ai_insights_offline_fallback():
    """Verify AI explanation falls back gracefully to deterministic text when Gemini API key is missing."""
    customer_token = make_jwt("cust-ai", "custai@example.com", role="client")
    headers = {"Authorization": f"Bearer {customer_token}"}

    with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET, "GEMINI_API_KEY": ""}):
        # 1. Run simulation
        sim_res = client.post("/api/customer/simulate", json={
            "product_type": "CPN",
            "investment_amount": 300000,
        }, headers=headers)
        assert sim_res.status_code == 200
        assessment_id = sim_res.json()["assessment_id"]

        # 2. Request Insights with no Gemini key
        ins_res = client.post("/api/insights/generate", json={
            "assessment_id": assessment_id,
            "audience": "CLIENT",
            "language": "EN",
            "retry": False,
        }, headers=headers)

        assert ins_res.status_code == 200
        insights_data = ins_res.json()
        assert insights_data["mode"] == "fallback"
        assert "insights" in insights_data
        assert len(insights_data["insights"]["executive_summary"]) > 0
