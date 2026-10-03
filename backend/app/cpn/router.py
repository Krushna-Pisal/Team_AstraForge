from __future__ import annotations

from typing import List, Optional
from pathlib import Path
from fastapi import APIRouter, HTTPException

from app.cpn.schemas import (
    CpnProductInput,
    CpnPayoffRequest,
    CpnPayoffResponse,
    CpnCurveResponse,
    CpnScenarioRequest,
    CpnScenarioResponse,
    CpnScenarioResult,
    CpnBacktestRequest,
    CpnBacktestResponse,
    CpnLossMeasuresResponse,
    CPN_RISK_NOTES,
    FORMULA_TEXT,
)
from app.cpn.payoff import calculate_cpn_payoff_core
from app.cpn.curve import generate_cpn_curve
from app.cpn.backtest import run_cpn_backtest
from app.cpn.loss_measures import calculate_cpn_loss_measures
from app.market_data import _CSV_PATHS

router = APIRouter(prefix="/api/cpn", tags=["cpn"])

DEFAULT_CPN_SHOCKS = [-40.0, -20.0, -10.0, 0.0, 10.0, 20.0, 30.0, 50.0]


@router.get("/underlyings", response_model=List[str])
def get_cpn_underlyings() -> List[str]:
    """Return only the underlyings that have real cached market data on disk."""
    valid_underlyings = []
    for key, path in _CSV_PATHS.items():
        if path.exists() and path.stat().st_size > 0:
            valid_underlyings.append(key)
    return valid_underlyings


@router.post("/payoff", response_model=CpnPayoffResponse)
def compute_cpn_payoff(req: CpnPayoffRequest) -> CpnPayoffResponse:
    """Calculate CPN payoff at maturity for a single outcome r."""
    r_dec = req.r if req.r is not None else (req.underlying_return_pct / 100.0 if req.underlying_return_pct is not None else 0.0)
    res = calculate_cpn_payoff_core(
        investment=req.investment,
        tenor_years=req.tenor_years,
        protection_pct=req.protection_pct,
        participation_pct=req.participation_pct,
        r=r_dec,
        cap_pct=req.cap_pct,
        coupon_pct_pa=req.coupon_pct_pa,
    )
    return CpnPayoffResponse(
        protected_amount=res["protected_amount"],
        participation_gain=res["participation_gain"],
        coupon_amount=res["coupon_amount"],
        final_amount=res["final_amount"],
        profit_loss=res["profit_loss"],
        return_pct=res["return_pct"],
        principal_at_risk=res["principal_at_risk"],
        formula_text=FORMULA_TEXT,
        risk_notes=CPN_RISK_NOTES,
    )


@router.post("/curve", response_model=CpnCurveResponse)
def compute_cpn_curve(req: CpnProductInput) -> CpnCurveResponse:
    """Generate payoff curve (-50% to +60%) and critical breakpoints."""
    return generate_cpn_curve(req)


@router.post("/scenarios", response_model=CpnScenarioResponse)
def compute_cpn_scenarios(req: CpnScenarioRequest) -> CpnScenarioResponse:
    """Simulate CPN payoffs across discrete market shocks."""
    shocks = req.custom_scenarios if req.custom_scenarios is not None else DEFAULT_CPN_SHOCKS
    results: List[CpnScenarioResult] = []
    for shock in shocks:
        r_dec = shock / 100.0
        res = calculate_cpn_payoff_core(
            investment=req.investment,
            tenor_years=req.tenor_years,
            protection_pct=req.protection_pct,
            participation_pct=req.participation_pct,
            r=r_dec,
            cap_pct=req.cap_pct,
            coupon_pct_pa=req.coupon_pct_pa,
        )
        results.append(
            CpnScenarioResult(
                scenario_shock_pct=float(shock),
                underlying_return_pct=float(shock),
                protected_amount=res["protected_amount"],
                participation_gain=res["participation_gain"],
                coupon_amount=res["coupon_amount"],
                final_amount=res["final_amount"],
                profit_loss=res["profit_loss"],
                return_pct=res["return_pct"],
            )
        )
    return CpnScenarioResponse(results=results, risk_notes=CPN_RISK_NOTES)


@router.post("/backtest", response_model=CpnBacktestResponse)
def compute_cpn_backtest(req: CpnBacktestRequest) -> CpnBacktestResponse:
    """Run rolling-window historical backtest against real cached price data."""
    return run_cpn_backtest(req)


@router.post("/loss-measures", response_model=CpnLossMeasuresResponse)
def compute_cpn_loss_measures(req: CpnProductInput) -> CpnLossMeasuresResponse:
    """Compute contractual and backtest loss measures for suitability."""
    return calculate_cpn_loss_measures(req)
