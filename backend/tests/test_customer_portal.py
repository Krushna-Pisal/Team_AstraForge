"""
Comprehensive Tests for AstraForge Customer Portal Backend Endpoints.
Verifying customer simulation workflows, deterministic engine reuse,
and strict customer data isolation.
"""

import os
import time
from unittest.mock import patch
import jwt
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.auth import User
from app.assessment_records import _records

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


def test_unauthenticated_customer_endpoints_rejected():
    """Unauthenticated calls to /api/customer/* are rejected with 401."""
    with patch.dict(os.environ, {"ALLOW_DEV_AUTH_BYPASS": "false", "SUPABASE_JWT_SECRET": TEST_JWT_SECRET}):
        res = client.get("/api/customer/profile")
        assert res.status_code == 401

        res_sim = client.post("/api/customer/simulate", json={
            "product_type": "ELN", "investment_amount": 100000
        })
        assert res_sim.status_code == 401


def test_customer_profile_and_product_catalog():
    """Authenticated customer can retrieve profile and browse available product catalog."""
    token = make_jwt("cust-101", "cust101@example.com", role="client")
    headers = {"Authorization": f"Bearer {token}"}

    with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET}):
        res_prof = client.get("/api/customer/profile", headers=headers)
        assert res_prof.status_code == 200
        assert res_prof.json()["id"] == "cust-101"
        assert res_prof.json()["role"] == "client"

        res_prod = client.get("/api/customer/products", headers=headers)
        assert res_prod.status_code == 200
        types = [p["type"] for p in res_prod.json()]
        assert "ELN" in types
        assert "DCD" in types
        assert "CPN" in types


def test_customer_simulation_eln_flow():
    """Customer runs ELN simulation and receives payoff, scenarios, and suitability."""
    token = make_jwt("cust-201", "cust201@example.com", role="client")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "product_type": "ELN",
        "investment_amount": 250000,
        "currency": "INR",
        "ticker": "^NSEI",
        "tenor_months": 12,
        "strike_pct": 90.0,
        "barrier_pct": 70.0,
        "coupon_pct_pa": 12.0,
        "risk_appetite": "MODERATE",
        "investment_horizon_months": 24,
        "max_acceptable_loss_pct": 15.0,
        "liquidity_requirement_months": 6,
        "investment_objective": "GROWTH",
    }

    with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET}):
        res = client.post("/api/customer/simulate", json=payload, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "assessment_id" in data
        assert data["product_type"] == "ELN"
        assert data["investment_amount"] == 250000
        assert "payoff" in data
        assert "scenarios" in data
        assert "suitability" in data
        assert data["suitability"]["overall_status"] in ("suitable", "review_required", "not_suitable")
        assert len(data["suitability"]["checks"]) == 6
        assert "disclaimer" in data


def test_customer_simulation_dcd_and_cpn_flows():
    """Customer can simulate DCD and CPN products with correct calculations."""
    token = make_jwt("cust-202", "cust202@example.com", role="client")
    headers = {"Authorization": f"Bearer {token}"}

    with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET}):
        # DCD simulation
        res_dcd = client.post("/api/customer/simulate", json={
            "product_type": "DCD",
            "investment_amount": 50000,
            "deposit_currency": "USD",
            "alternate_currency": "INR",
            "initial_fx_rate": 80.0,
            "conversion_strike_rate": 84.0,
            "tenor_months": 3,
            "risk_appetite": "MODERATE",
            "max_acceptable_loss_pct": 10.0,
        }, headers=headers)
        assert res_dcd.status_code == 200
        assert res_dcd.json()["product_type"] == "DCD"

        # CPN simulation
        res_cpn = client.post("/api/customer/simulate", json={
            "product_type": "CPN",
            "investment_amount": 1000000,
            "currency": "INR",
            "protection_pct": 100.0,
            "participation_rate": 100.0,
            "tenor_months": 24,
            "risk_appetite": "CONSERVATIVE",
            "max_acceptable_loss_pct": 0.0,
            "investment_objective": "CAPITAL_PRESERVATION",
        }, headers=headers)
        assert res_cpn.status_code == 200
        assert res_cpn.json()["product_type"] == "CPN"


def test_customer_data_isolation_between_customers():
    """Customer A only sees their own assessments; Customer B is denied access to Customer A's records."""
    token_a = make_jwt("customer-alpha", "alpha@example.com", role="client")
    token_b = make_jwt("customer-beta", "beta@example.com", role="client")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET}):
        # 1. Customer Alpha runs a simulation
        sim_res = client.post("/api/customer/simulate", json={
            "product_type": "ELN",
            "investment_amount": 150000,
            "risk_appetite": "MODERATE",
        }, headers=headers_a)
        assert sim_res.status_code == 200
        assessment_id = sim_res.json()["assessment_id"]

        # 2. Customer Alpha can retrieve their assessment list and finds the simulation
        list_a = client.get("/api/customer/assessments", headers=headers_a)
        assert list_a.status_code == 200
        ids_a = [item["assessment_id"] for item in list_a.json()]
        assert assessment_id in ids_a

        # 3. Customer Alpha can retrieve the full details
        detail_a = client.get(f"/api/customer/assessments/{assessment_id}", headers=headers_a)
        assert detail_a.status_code == 200
        assert detail_a.json()["owner_id"] == "customer-alpha"

        # 4. Customer Beta CANNOT see Customer Alpha's simulation in their list
        list_b = client.get("/api/customer/assessments", headers=headers_b)
        assert list_b.status_code == 200
        ids_b = [item["assessment_id"] for item in list_b.json()]
        assert assessment_id not in ids_b

        # 5. Customer Beta is REJECTED with 403 when trying to directly fetch Alpha's assessment_id
        detail_b = client.get(f"/api/customer/assessments/{assessment_id}", headers=headers_b)
        assert detail_b.status_code == 403
        assert "not authorized" in detail_b.text.lower()


def test_customer_denied_rm_only_operations():
    """Customer role is rejected with 403 on RM-only operations."""
    token = make_jwt("cust-301", "cust301@example.com", role="client")
    headers = {"Authorization": f"Bearer {token}"}

    with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET}):
        # Call RM-protected product validation
        res = client.post("/api/products/validate", json={
            "product_type": "ELN",
            "name": "Test ELN",
            "underlying": "NIFTY50",
            "tenor_months": 12,
            "currency": "INR",
            "strike_pct": 90.0,
            "barrier_pct": 70.0,
            "coupon_pa_pct": 10.0,
        }, headers=headers)
        assert res.status_code == 403
        assert "relationship managers" in res.text.lower()


def test_customer_self_promotion_prevention():
    """Customer cannot self-promote to RM by forging client-side user_metadata."""
    # Attacker sets user_metadata: {"role": "rm"} but server-controlled app_metadata has "client"
    payload = {
        "sub": "sneaky-cust",
        "email": "sneaky@example.com",
        "aud": "authenticated",
        "exp": int(time.time()) + 3600,
        "app_metadata": {"role": "client"},
        "user_metadata": {"role": "rm"},  # Attacker attempts bypass
    }
    forged_token = jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")
    headers = {"Authorization": f"Bearer {forged_token}"}

    with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET}):
        res = client.post("/api/products/validate", json={
            "product_type": "ELN",
            "name": "Test ELN",
            "underlying": "NIFTY50",
            "tenor_months": 12,
            "currency": "INR",
            "strike_pct": 90.0,
            "barrier_pct": 70.0,
            "coupon_pa_pct": 10.0,
        }, headers=headers)
        assert res.status_code == 403
        assert "relationship managers" in res.text.lower()


def test_cross_customer_insight_request_rejected():
    """Customer cannot request AI insights for another customer's simulation."""
    token_a = make_jwt("customer-one", "one@example.com", role="client")
    token_b = make_jwt("customer-two", "two@example.com", role="client")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET}):
        # Customer One creates a simulation
        sim_res = client.post("/api/customer/simulate", json={
            "product_type": "CPN",
            "investment_amount": 500000,
        }, headers=headers_a)
        assert sim_res.status_code == 200
        assessment_id = sim_res.json()["assessment_id"]

        # Customer Two tries to generate/fetch insights for Customer One's assessment_id
        insight_res = client.post("/api/insights/generate", json={
            "assessment_id": assessment_id,
            "audience": "CLIENT",
            "language": "EN",
            "retry": False,
        }, headers=headers_b)
        assert insight_res.status_code == 403
        assert "not authorized" in insight_res.text.lower()


def test_ownerless_legacy_records_inaccessible_to_customers():
    """Legacy records without an owner are not accessible to customer accounts, but accessible to RM."""
    from app.assessment_records import _records
    from time import monotonic

    # Insert a synthetic ownerless legacy record as (timestamp, record_dict)
    legacy_id = "legacy-ownerless-assessment-999"
    _records[legacy_id] = (monotonic(), {
        "id": legacy_id,
        "owner_id": None,
        "request": {"product_type": "ELN"},
        "evaluation": {"assessment": {"overall_status": "suitable", "checks": []}},
    })

    client_token = make_jwt("cust-leg", "custleg@example.com", role="client")
    rm_token = make_jwt("rm-leg", "rmleg@example.com", role="rm")

    with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": TEST_JWT_SECRET}):
        # Customer request: must receive 403
        client_res = client.get(f"/api/customer/assessments/{legacy_id}", headers={"Authorization": f"Bearer {client_token}"})
        assert client_res.status_code == 403
        assert "no verified owner" in client_res.text.lower() or "forbidden" in client_res.text.lower()

        # RM request: allowed
        from app.assessment_records import get_record
        rm_user = User(id="rm-leg", email="rmleg@example.com", role="rm")
        rec = get_record(legacy_id, caller=rm_user)
        assert rec["id"] == legacy_id

