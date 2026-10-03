"""
FastAPI application entry point for the Payoff Simulator.

CORS is enabled for localhost:5173 (Vite dev server).
"""

from __future__ import annotations

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.models import ProductInput, PayoffResponse, PriceInfo
from app.market_data import get_price_info, get_s0
from app.payoff_engine import build_payoff_curve, build_eln_two_curves, run_scenarios, get_formula_text, DEFAULT_SHOCKS
from app.phase2_models import (
    ElnPayoffRequest, ElnPayoffResponse,
    DcdPayoffRequest, DcdPayoffResponse,
    CpnPayoffRequest, CpnPayoffResponse
)
from app.phase2_engines import calculate_eln_payoff, calculate_dcd_payoff, calculate_cpn_payoff
app = FastAPI(
    title="Suitability-Aware Payoff Simulator",
    description="Payoff simulation API for Structured Investment Products (Phase 0 – ELN only)",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CURVE_RATIO_RANGE = list(np.round(np.arange(0.20, 1.81, 0.01), 4).tolist())


@app.get("/health", tags=["meta"])
def health_check():
    """Liveness check."""
    return {"status": "ok"}


@app.get("/underlyings", tags=["market"])
def list_underlyings() -> list[str]:
    """Return the list of supported underlyings."""
    return ["NIFTY50"]


@app.get("/prices/{underlying}", response_model=PriceInfo, tags=["market"])
def get_prices(underlying: str) -> PriceInfo:
    """
    Return price metadata for a given underlying.

    - **s0**: Latest closing price (reference price)
    - **start_date**: First date in the CSV
    - **end_date**: Last date in the CSV
    - **count**: Number of trading days loaded
    """
    if underlying not in ["NIFTY50"]:
        raise HTTPException(status_code=404, detail=f"Unknown underlying: {underlying!r}")
    info = get_price_info(underlying)
    return PriceInfo(**info)


@app.post("/payoff", response_model=PayoffResponse, tags=["payoff"])
def compute_payoff_api(product: ProductInput) -> PayoffResponse:
    """
    Compute the ELN payoff curve and scenario table.

    Returns:
    - **s0**: Current reference price
    - **barrier_price**: Barrier in absolute INR terms
    - **strike_price**: Strike in absolute INR terms
    - **curve**: x/y data for the payoff chart
    - **scenarios**: Scenario table for preset shocks
    - **formula_text**: Human-readable payoff formula
    """
    s0 = get_s0(product.underlying)
    curve_data = build_payoff_curve(product, CURVE_RATIO_RANGE)
    two_curves = build_eln_two_curves(product, CURVE_RATIO_RANGE)
    scenario_data = run_scenarios(product, DEFAULT_SHOCKS)
    formula_text = get_formula_text(product)

    return PayoffResponse(
        s0=s0,
        barrier_price=round(s0 * product.barrier_pct / 100.0, 2),
        strike_price=round(s0 * product.strike_pct / 100.0, 2),
        curve=[
            {"underlying_return_pct": p["underlying_return_pct"],
             "investor_return_pct": p["investor_return_pct"]}
            for p in curve_data
        ],
        curve_not_breached=[
            {"underlying_return_pct": p["underlying_return_pct"],
             "investor_return_pct": p["investor_return_pct"]}
            for p in two_curves["curve_not_breached"]
        ],
        curve_breached=[
            {"underlying_return_pct": p["underlying_return_pct"],
             "investor_return_pct": p["investor_return_pct"]}
            for p in two_curves["curve_breached"]
        ],
        scenarios=[
            {
                "shock_pct": s["shock_pct"],
                "underlying_return_pct": s["underlying_return_pct"],
                "redemption": s["redemption"],
                "coupon_amount": s["coupon_amount"],
                "final_amount": s["final_amount"],
                "profit_loss": s["profit_loss"],
                "return_pct": s["return_pct"],
                "barrier_breached": s["barrier_breached"],
            }
            for s in scenario_data
        ],
        formula_text=formula_text,
    )

@app.post("/api/payoff/eln", response_model=ElnPayoffResponse, tags=["payoff", "phase2"])
def compute_eln_api(req: ElnPayoffRequest) -> ElnPayoffResponse:
    """Compute ELN payoff for a specific final outcome."""
    return calculate_eln_payoff(req)

@app.post("/api/payoff/dcd", response_model=DcdPayoffResponse, tags=["payoff", "phase2"])
def compute_dcd_api(req: DcdPayoffRequest) -> DcdPayoffResponse:
    """Compute DCD payoff for a specific final outcome."""
    return calculate_dcd_payoff(req)

@app.post("/api/payoff/cpn", response_model=CpnPayoffResponse, tags=["payoff", "phase2"])
def compute_cpn_api(req: CpnPayoffRequest) -> CpnPayoffResponse:
    """Compute CPN payoff for a specific final outcome."""
    return calculate_cpn_payoff(req)

# --- Phase 3 Endpoints ---
from app.phase3_sim_models import ScenarioRequest, ScenarioResponse, BacktestRequest, BacktestResponse
from app.phase3_simulation import simulate_scenarios, run_backtest
from app.phase3_market_data import get_historical_market_data
from typing import Any

@app.get("/api/market-data/history", tags=["market", "phase3"])
def get_market_history(ticker: str = "^NSEI", period: str = "10y") -> list[dict[str, Any]]:
    """Retrieve historical market data using yfinance."""
    df = get_historical_market_data(ticker, period)
    return df.to_dict(orient="records")

@app.post("/api/scenarios/simulate", response_model=ScenarioResponse, tags=["simulation", "phase3"])
def simulate_scenarios_api(req: ScenarioRequest) -> ScenarioResponse:
    """Run hypothetical scenarios for a configured product."""
    return simulate_scenarios(req)

@app.post("/api/backtest/run", response_model=BacktestResponse, tags=["backtest", "phase3"])
def run_backtest_api(req: BacktestRequest) -> BacktestResponse:
    """Run historical rolling-window backtest on real market data paths."""
    return run_backtest(req)

# --- Phase 4 Endpoints ---
import os
import json
from app.phase4_models import SuitabilityRequest, SuitabilityResponse, AuditRecord
from app.phase4_suitability import run_suitability_assessment, audit_store

CLIENTS_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "mock_clients.json")


@app.get("/api/clients", tags=["clients"])
def get_mock_clients() -> list[dict[str, Any]]:
    """Return pre-configured mock client profiles for demo and testing."""
    if os.path.exists(CLIENTS_FILE):
        with open(CLIENTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


@app.get("/api/audit", tags=["audit"])
def list_audit_records() -> list[dict[str, Any]]:
    """Retrieve all suitability assessment audit trail records (newest first)."""
    records = audit_store.list_all()
    return [r.model_dump() for r in records]


@app.get("/api/audit/{assessment_id}", tags=["audit"])
def get_audit_record(assessment_id: str) -> dict[str, Any]:
    """Retrieve a specific audit trail record by its assessment_id."""
    record = audit_store.get(assessment_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Audit record {assessment_id} not found")
    return record.model_dump()


@app.post("/api/suitability/check", response_model=SuitabilityResponse, tags=["suitability", "phase4"])
def check_suitability_api(req: SuitabilityRequest) -> SuitabilityResponse:
    """Evaluate client suitability against product risk characteristics."""
    try:
        return run_suitability_assessment(req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- Phase 5 Endpoints ---
from app.phase5_explanation.router import router as phase5_router
app.include_router(phase5_router)
