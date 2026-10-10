"""Deterministic matching only. No AI ranking or recommended products."""
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, Depends
from app.auth import require_rm_role, User
from app.domain import DomainError, ErrorBody
from app.products import prepare_product, PrepareProductRequest
from app.services import run_simulation, configuration, derive_product_risk
from app.phase4_models import SuitabilityRequest
from app.phase4_suitability import run_suitability_assessment
from .discovery_models import DiscoveryRequest, DiscoveryResponse, ProductMatch

router = APIRouter(prefix="/api/discovery", tags=["discovery"])

def alignment(checks):
    expected = {"risk_appetite", "investment_horizon", "loss_tolerance", "portfolio_concentration", "liquidity", "investment_objective"}
    if len(checks) != 6 or {c.type for c in checks} != expected:
        raise ValueError("Alignment requires exactly the six distinct suitability checks.")
    missing = sum(c.reason_code.startswith("MISSING_") for c in checks)
    passed = sum(c.status == "PASS" and not c.reason_code.startswith("MISSING_") for c in checks)
    warnings = sum(c.status == "WARNING" and not c.reason_code.startswith("MISSING_") for c in checks)
    mismatches = sum(c.status == "MISMATCH" for c in checks)
    return dict(alignment_pct=round((passed + warnings * .5) / 6 * 100, 2),
                checks_completed=6-missing, passed=passed, warnings=warnings, mismatches=mismatches,
                missing=missing, critical_mismatch=mismatches > 0, eligible=mismatches == 0 and missing == 0)

def evaluate_saved(saved, client):
    if saved.template.currency != client.portfolio_currency:
        return ProductMatch(product_id=saved.id, critical_mismatch=True,
            concerns=["Investment currency does not match this product."],
            error=ErrorBody(code="CURRENCY_MISMATCH", message="Choose a product in the customer's investment currency."))
    try:
        prepared = prepare_product(PrepareProductRequest(template=saved.template, investment_amount=client.proposed_investment_amount))
        simulation = run_simulation(prepared.configuration)
        risk = derive_product_risk(configuration(prepared.configuration), saved.template.ticker, simulation.backtest)
        assessment = run_suitability_assessment(SuitabilityRequest(client=client, product_risk=risk))
        score = alignment(assessment.checks)
        concerns = [c.reason for c in assessment.checks if c.status != "PASS"]
        if simulation.historical_error:
            concerns.append("Historical analysis unavailable; contractual modeled risk was used.")
        return ProductMatch(product_id=saved.id, **score, checks=assessment.checks,
            concerns=concerns, reasons=[c.reason for c in assessment.checks if c.status == "PASS"])
    except DomainError as exc:
        return ProductMatch(product_id=saved.id, error=ErrorBody(code=exc.code, message=exc.message), concerns=[exc.message])
    except Exception:
        return ProductMatch(product_id=saved.id, error=ErrorBody(code="PRODUCT_UNAVAILABLE", message="This product could not be evaluated. Retry or review its terms."),
            concerns=["This product could not be evaluated."])

@router.post("/evaluate", response_model=DiscoveryResponse)
def discover(req: DiscoveryRequest, user: User = Depends(require_rm_role)):
    # Bound provider concurrency; one unavailable product must not hide other results.
    with ThreadPoolExecutor(max_workers=4) as pool:
        matches = list(pool.map(lambda p: evaluate_saved(p, req.client), req.products))
    def priority(m):
        return (3 if m.error else 2 if m.critical_mismatch else 1 if m.warnings or m.missing else 0,
                -(m.alignment_pct or 0), m.product_id)
    matches.sort(key=priority)
    return DiscoveryResponse(matches=matches, eligible_count=sum(m.eligible for m in matches))
