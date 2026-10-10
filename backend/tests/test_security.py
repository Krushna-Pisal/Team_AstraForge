"""
Comprehensive Security and Regression Test Suite for AstraForge
Testing authentication hardening, role isolation, data ownership, and contract preservation.
"""

import os
import time
from unittest.mock import patch
import jwt
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.auth import get_jwt_secret, User
from app.assessment_records import save_record, get_record, _records
from app.domain import DomainError
from app.phase2_models import ElnPayoffRequest, DcdPayoffRequest, CpnPayoffRequest
from app.phase2_engines import calculate_eln_payoff, calculate_dcd_payoff, calculate_cpn_payoff
from app.phase4_models import ClientProfile, ProductRiskCharacteristics, SuitabilityRequest
from app.phase4_suitability import run_suitability_assessment
from app.services import EvaluateRequest, evaluate_client
from app.products import ProductTemplate

TEST_JWT_SECRET = "test-secret-at-least-32-bytes-long-123456"

client = TestClient(app, raise_server_exceptions=False)


def make_jwt(sub: str, email: str, app_metadata: dict = None, user_metadata: dict = None, exp_offset: int = 3600, secret: str = TEST_JWT_SECRET) -> str:
    """Helper to generate signed Supabase-style JWTs for test scenarios."""
    payload = {
        "sub": sub,
        "email": email,
        "aud": "authenticated",
        "exp": int(time.time()) + exp_offset,
        "app_metadata": app_metadata or {},
        "user_metadata": user_metadata or {},
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def make_mock_eval_and_req(assessment_id: str, client_id: str = "cust-1"):
    """Helper to generate valid assessment snapshot mocks for ownership tests."""
    mock_eval = type("MockEval", (), {
        "assessment": type("MockAss", (), {
            "assessment_id": assessment_id,
            "checks": [],
            "overall_status": "PASS",
            "completeness": "COMPLETE",
            "rule_set_version": "1.0",
        })(),
        "model_dump": lambda self, mode=None: {
            "assessment": {
                "assessment_id": assessment_id,
                "checks": [],
                "overall_status": "PASS",
                "completeness": "COMPLETE",
                "rule_set_version": "1.0",
            },
            "product_risk": {},
            "historical_error": None,
        },
    })()
    mock_req = type("MockReq", (), {
        "model_dump": lambda self, mode=None: {
            "product_type": "ELN",
            "ticker": "^NSEI",
            "eln_config": {
                "investment": 100000,
                "initial_price": 100,
                "final_price": 100,
                "strike_pct": 90,
                "barrier_pct": 70,
                "coupon_pct_pa": 12,
                "tenor_years": 1,
                "barrier_monitoring": "maturity",
                "settlement_method": "cash",
                "contract_variant": "unconditional_strike",
            },
            "dcd_config": None,
            "cpn_config": None,
            "client": {"client_id": client_id, "client_name": "Test Client", "risk_appetite": "MODERATE"},
        },
    })()
    return mock_eval, mock_req


# ============================================================================
# 1. AUTHENTICATION TESTS
# ============================================================================

def test_unauthenticated_access_to_protected_endpoint_rejected():
    """Unauthenticated requests without headers are rejected with 401 when dev bypass is disabled."""
    with patch.dict(os.environ, {"ALLOW_DEV_AUTH_BYPASS": "false", "SUPABASE_JWT_SECRET": TEST_JWT_SECRET}):
        res = client.get("/me")
        assert res.status_code == 401
        assert "Not authenticated" in res.text


def test_valid_supabase_authentication():
    """Valid Supabase JWT grants authenticated access and reads profile."""
    token = make_jwt("rm-user-123", "rm1@astraforge.com", app_metadata={"role": "rm"})
    with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET}):
        res = client.get("/me", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == "rm-user-123"
        assert data["email"] == "rm1@astraforge.com"
        assert data["role"] == "rm"


def test_expired_token_rejected():
    """Tokens with past expiration time are rejected with 401."""
    expired_token = make_jwt("rm-123", "rm@test.com", app_metadata={"role": "rm"}, exp_offset=-60)
    with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET}):
        res = client.get("/me", headers={"Authorization": f"Bearer {expired_token}"})
        assert res.status_code == 401
        assert "Token has expired" in res.text


def test_invalid_signature_token_rejected():
    """Tokens signed with a wrong key are rejected with 401."""
    wrong_key_token = make_jwt("rm-123", "rm@test.com", secret="wrong-secret-signature-key-999")
    with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET}):
        res = client.get("/me", headers={"Authorization": f"Bearer {wrong_key_token}"})
        assert res.status_code == 401
        assert "Invalid authentication credentials" in res.text


def test_mock_token_rejected_when_supabase_is_configured():
    """Mock tokens are strictly rejected when Supabase/production authentication is configured."""
    with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET}):
        res = client.get("/me", headers={"Authorization": "Bearer mock-token-rm-12345"})
        assert res.status_code == 401
        assert "Invalid authentication credentials" in res.text


def test_mock_tokens_accepted_only_in_dev_mode():
    """Mock tokens only work when Supabase is not configured and not in production."""
    with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": "", "ENVIRONMENT": "development"}):
        # RM mock token
        res_rm = client.get("/me", headers={"Authorization": "Bearer mock-token-rm-999"})
        assert res_rm.status_code == 200
        assert res_rm.json()["role"] == "rm"

        # Client mock token
        res_client = client.get("/me", headers={"Authorization": "Bearer mock-token-client-999"})
        assert res_client.status_code == 200
        assert res_client.json()["role"] == "client"


def test_missing_production_auth_configuration_fails_safely():
    """When ENVIRONMENT=production but SUPABASE_JWT_SECRET is missing, requests fail safely without bypass."""
    with patch.dict(os.environ, {"ENVIRONMENT": "production", "SUPABASE_JWT_SECRET": ""}):
        res = client.get("/me", headers={"Authorization": "Bearer mock-token-rm-123"})
        assert res.status_code == 401
        assert "misconfigured" in res.text.lower()


def test_client_user_metadata_cannot_grant_rm_privileges():
    """Client-controllable user_metadata claiming role='rm' is downgraded to client in production."""
    token = make_jwt("attacker-1", "user@test.com", app_metadata={}, user_metadata={"role": "rm"})
    with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET}):
        res = client.get("/me", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        assert res.json()["role"] == "client"  # Must NOT be granted RM


def test_trusted_server_controlled_rm_role():
    """Server-controlled app_metadata accurately sets RM role and overrides user_metadata."""
    token = make_jwt("real-rm-1", "rm@test.com", app_metadata={"role": "rm"}, user_metadata={"role": "client"})
    with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET}):
        res = client.get("/me", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        assert res.json()["role"] == "rm"


# ============================================================================
# 2. AUTHORIZATION TESTS
# ============================================================================

def test_customers_cannot_access_rm_only_operations():
    """Customers receive 403 Forbidden when attempting RM-only operations."""
    client_token = make_jwt("client-user-1", "client@test.com", app_metadata={"role": "client"})
    auth_header = {"Authorization": f"Bearer {client_token}"}

    with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET}):
        # 1. Product validation
        res_val = client.post("/api/products/validate", json={
            "name": "Test", "product_type": "ELN", "ticker": "^NSEI", "currency": "INR",
            "eln_terms": {"barrier_pct": 70, "strike_pct": 90, "coupon_pct_pa": 12, "tenor_years": 1,
                          "barrier_monitoring": "maturity", "settlement_method": "cash", "contract_variant": "unconditional_strike"}
        }, headers=auth_header)
        assert res_val.status_code == 403
        assert "Access restricted to Relationship Managers" in res_val.text

        # 2. Product preparation
        res_prep = client.post("/api/products/prepare", json={
            "template": {"name": "Test", "product_type": "ELN", "ticker": "^NSEI", "currency": "INR",
                         "eln_terms": {"barrier_pct": 70, "strike_pct": 90, "coupon_pct_pa": 12, "tenor_years": 1,
                                       "barrier_monitoring": "maturity", "settlement_method": "cash", "contract_variant": "unconditional_strike"}},
            "investment_amount": 100000
        }, headers=auth_header)
        assert res_prep.status_code == 403

        # 3. Product discovery evaluation
        res_disc = client.post("/api/discovery/evaluate", json={
            "client": {"client_id": "CL-1", "client_name": "Test Client", "risk_appetite": "MODERATE",
                       "investment_horizon_months": 36, "max_acceptable_loss_pct": 10, "total_portfolio_value": 1000000,
                       "portfolio_currency": "INR", "proposed_investment_amount": 100000},
            "products": []
        }, headers=auth_header)
        assert res_disc.status_code == 403


def test_public_health_and_metadata_remain_accessible():
    """Health endpoint remains public without credentials."""
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_auth_failure_does_not_leak_internals():
    """Authentication errors return clean error messages without leaking secret or raw exceptions."""
    with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET}):
        res = client.get("/me", headers={"Authorization": "Bearer malformed.token.value"})
        assert res.status_code == 401
        assert TEST_JWT_SECRET not in res.text
        assert "Traceback" not in res.text


# ============================================================================
# 3. DATA ISOLATION & RECORD OWNERSHIP TESTS
# ============================================================================

def test_customer_can_retrieve_own_record():
    """Customer A can access their own assessment record."""
    user_a = User(id="customer-a", email="a@test.com", role="client")
    mock_eval, mock_req = make_mock_eval_and_req("ass-a-1", client_id="customer-a")

    save_record(mock_req, mock_eval, None, owner_id="customer-a")
    record = get_record("ass-a-1", caller=user_a)
    assert record["owner_id"] == "customer-a"


def test_customer_cannot_retrieve_other_customer_record():
    """Customer B is rejected with 403 when trying to access Customer A's assessment record."""
    user_b = User(id="customer-b", email="b@test.com", role="client")
    mock_eval, mock_req = make_mock_eval_and_req("ass-a-2", client_id="customer-a")

    save_record(mock_req, mock_eval, None, owner_id="customer-a")

    with pytest.raises(DomainError) as exc_info:
        get_record("ass-a-2", caller=user_b)
    assert exc_info.value.code == "ASSESSMENT_FORBIDDEN"
    assert exc_info.value.status_code == 403


def test_ownerless_legacy_records_forbidden_to_customers():
    """Customers are forbidden from accessing legacy records that lack an owner_id."""
    customer = User(id="customer-x", email="x@test.com", role="client")
    mock_eval, mock_req = make_mock_eval_and_req("legacy-ass-1")

    # Legacy record without owner_id
    save_record(mock_req, mock_eval, None, owner_id=None)

    with pytest.raises(DomainError) as exc_info:
        get_record("legacy-ass-1", caller=customer)
    assert exc_info.value.code == "ASSESSMENT_FORBIDDEN"
    assert exc_info.value.status_code == 403


def test_authorized_rm_can_access_any_assessment_record():
    """RMs can access assessment records across clients as part of their advisory role."""
    rm = User(id="rm-advisor-1", email="rm@test.com", role="rm")
    mock_eval, mock_req = make_mock_eval_and_req("client-ass-1", client_id="client-100")

    save_record(mock_req, mock_eval, None, owner_id="client-100")
    record = get_record("client-ass-1", caller=rm)
    assert record is not None
    assert record["owner_id"] == "client-100"


def test_unauthorized_insight_request_rejected():
    """Generating insights for another customer's assessment via HTTP is rejected with 403."""
    mock_eval, mock_req = make_mock_eval_and_req("ass-isolation-test-1", client_id="cust-a")
    save_record(mock_req, mock_eval, None, owner_id="cust-a")

    # Client B attempts to request insights using Client A's assessment_id
    token_b = make_jwt("cust-b", "b@test.com", app_metadata={"role": "client"})
    with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET}):
        res = client.post("/api/insights/generate", json={
            "assessment_id": "ass-isolation-test-1",
            "audience": "CLIENT",
            "language": "EN"
        }, headers={"Authorization": f"Bearer {token_b}"})
        assert res.status_code == 403
        assert "not authorized" in res.text.lower()


# ============================================================================
# 4. REGRESSION PRESERVATION TESTS
# ============================================================================

def test_eln_payoff_calculations_preserved():
    """ELN mathematical calculation formulas remain identical and deterministic."""
    req = ElnPayoffRequest(
        investment=100000, initial_price=100, final_price=110, strike_pct=90, barrier_pct=70,
        coupon_pct_pa=12, tenor_years=1, barrier_monitoring="maturity", settlement_method="cash",
        contract_variant="unconditional_strike"
    )
    res = calculate_eln_payoff(req)
    assert res.principal_repayment == 100000.0
    assert res.coupon_earned == 12000.0
    assert res.total_maturity_value == 112000.0
    assert res.return_pct == 12.0


def test_dcd_payoff_calculations_preserved():
    """DCD mathematical calculation formulas remain identical and deterministic."""
    req = DcdPayoffRequest(
        deposit_currency="USD", alternate_currency="INR", deposit_amount=100000,
        initial_fx_rate=80, conversion_strike_rate=84, maturity_fx_rate=80, coupon_pct_pa=6,
        tenor_years=0.25, conversion_condition="FX_AT_OR_ABOVE_STRIKE"
    )
    res = calculate_dcd_payoff(req)
    assert res.conversion_occurred is False
    assert res.repayment_currency == "USD"
    assert res.coupon_amount == 1500.0
    assert res.total_maturity_repayment == 101500.0


def test_cpn_payoff_calculations_preserved():
    """CPN mathematical calculation formulas remain identical and deterministic."""
    req = CpnPayoffRequest(
        investment=1000000, tenor_years=1.0, protection_pct=100.0, participation_rate=100.0,
        initial_price=100, final_price=120, coupon_pct_pa=0.0
    )
    res = calculate_cpn_payoff(req)
    assert res.protected_principal == 1000000.0
    assert res.participation_gain == 200000.0
    assert res.total_maturity_value == 1200000.0
    assert res.return_pct == 20.0


def test_suitability_thresholds_and_rules_preserved():
    """Suitability assessment rules produce identical evaluation logic."""
    client_prof = ClientProfile(
        client_id="C-1", client_name="John Doe", risk_appetite="CONSERVATIVE",
        investment_horizon_months=36, max_acceptable_loss_pct=5.0, proposed_investment_amount=100000,
        portfolio_currency="INR", total_portfolio_value=1000000
    )
    risk_char = ProductRiskCharacteristics(
        product_type="ELN", product_reference="ELN-001", tenor_years=3.0,
        underlying_asset="^NSEI", issuer="TestBank",
        principal_protection_pct=90.0, max_contractual_loss_pct=10.0
    )
    assessment = run_suitability_assessment(SuitabilityRequest(client=client_prof, product_risk=risk_char))
    assert assessment.overall_status in ("suitable", "review_required", "not_suitable")
    assert len(assessment.checks) == 6
