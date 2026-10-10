"""
FastAPI application entry point for the Payoff Simulator.

CORS is enabled for localhost:5173 (Vite dev server).
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure backend directory is on sys.path for direct uvicorn invocations
_backend_dir = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

import numpy as np
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.domain import ErrorResponse
from app.errors import install_error_handlers
import os
from app.phase3_market_data import get_market_data, MarketHistory, MarketInstrument, MARKETS
from app.services import SimulationRequest, SimulationBundle, EvaluateRequest, EvaluationBundle, run_simulation, evaluate_client
from app.phase3_market_data import SearchResponse, search_underlyings
from app.products import ProductTemplate, ValidatedProduct, PrepareProductRequest, PreparedProduct, validate_product, prepare_product

from app.models import ProductInput, PayoffResponse, PriceInfo
from app.market_data import get_price_info, get_s0
from app.payoff_engine import build_payoff_curve, run_scenarios, get_formula_text, DEFAULT_SHOCKS
from app.phase2_models import (
    ElnPayoffRequest, ElnPayoffResponse,
    DcdPayoffRequest, DcdPayoffResponse,
    CpnPayoffRequest, CpnPayoffResponse
)
from app.phase2_engines import calculate_eln_payoff, calculate_dcd_payoff, calculate_cpn_payoff
app = FastAPI(
    title="Suitability-Aware Payoff Simulator",
    description="Deterministic ELN, DCD and CPN payoff, historical analysis and suitability. Percentages use percentage points.",
    version="1.0.0",
    responses={status: {"model": ErrorResponse} for status in (422, 404, 500, 503)},
)
install_error_handlers(app)
from app.discovery.discovery_service import router as discovery_router
from app.agents.insights_agent import router as insights_router
from app.auth_routes import router as auth_router
from app.customer_routes import router as customer_router

app.include_router(discovery_router)
app.include_router(insights_router)
app.include_router(auth_router)
app.include_router(customer_router)

frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
if frontend_url and frontend_url not in origins:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CURVE_RATIO_RANGE = list(np.round(np.arange(0.20, 1.81, 0.01), 4).tolist())


from app.auth import get_current_user, require_rm_role, User

@app.get("/health", tags=["meta"])
def health_check():
    """Liveness check."""
    return {"status": "ok"}

@app.get("/me", tags=["auth"])
def get_current_user_profile(user: User = Depends(get_current_user)):
    """Return the currently authenticated user's profile from the JWT token."""
    return {"id": user.id, "email": user.email, "role": user.role}



@app.get("/underlyings", tags=["legacy"], deprecated=True)
def list_underlyings() -> list[str]:
    """Return the list of supported underlyings."""
    return ["NIFTY50"]


@app.get("/prices/{underlying}", response_model=PriceInfo, tags=["legacy"], deprecated=True)
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


@app.post("/payoff", response_model=PayoffResponse, tags=["legacy"], deprecated=True)
def compute_payoff_api(product: ProductInput, user: User = Depends(get_current_user)) -> PayoffResponse:
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
def compute_eln_api(req: ElnPayoffRequest, user: User = Depends(get_current_user)) -> ElnPayoffResponse:
    """Compute ELN payoff for a specific final outcome."""
    return calculate_eln_payoff(req)

@app.post("/api/payoff/dcd", response_model=DcdPayoffResponse, tags=["payoff", "phase2"])
def compute_dcd_api(req: DcdPayoffRequest, user: User = Depends(get_current_user)) -> DcdPayoffResponse:
    """Compute DCD payoff for a specific final outcome."""
    return calculate_dcd_payoff(req)

@app.post("/api/payoff/cpn", response_model=CpnPayoffResponse, tags=["payoff", "phase2"])
def compute_cpn_api(req: CpnPayoffRequest, user: User = Depends(get_current_user)) -> CpnPayoffResponse:
    """Compute CPN payoff for a specific final outcome."""
    return calculate_cpn_payoff(req)

# --- Phase 3 Endpoints ---
from app.phase3_sim_models import ScenarioRequest, ScenarioResponse, BacktestRequest, BacktestResponse
from app.phase3_simulation import simulate_scenarios, run_backtest
from app.phase3_market_data import get_historical_market_data
from typing import Any

@app.get("/api/market-data/history", response_model=MarketHistory, tags=["market"])
def get_market_history(ticker: str = "^NSEI", period: str = "10y", source: str = "snapshot", refresh: bool = False, user: User = Depends(get_current_user)) -> MarketHistory:
    return get_market_data(ticker, period, source, refresh)


@app.get("/api/market-data/catalog", response_model=list[MarketInstrument], tags=["market"])
def get_market_catalog(user: User = Depends(get_current_user)) -> list[MarketInstrument]:
    return [{"ticker": key, **value} for key, value in MARKETS.items()]


@app.get("/api/market-data/search", response_model=SearchResponse, tags=["market"])
def search_market_symbols(q: str = "", kind: str = "equity", user: User = Depends(get_current_user)):
    return search_underlyings(q, kind)


@app.post("/api/products/validate", response_model=ValidatedProduct, tags=["products"])
def validate_product_template(req: ProductTemplate, user: User = Depends(require_rm_role)):
    return validate_product(req)


@app.post("/api/products/prepare", response_model=PreparedProduct, tags=["products"])
def prepare_saved_product(req: PrepareProductRequest, user: User = Depends(require_rm_role)):
    return prepare_product(req)


@app.post("/api/simulation/run", response_model=SimulationBundle, tags=["services"])
def simulation_bundle(req: SimulationRequest, user: User = Depends(get_current_user)):
    return run_simulation(req)


@app.post("/api/suitability/evaluate", response_model=EvaluationBundle, tags=["services"])
def evaluate_configured_product(req: EvaluateRequest, user: User = Depends(get_current_user)):
    return evaluate_client(req, user=user)

@app.post("/api/scenarios/simulate", response_model=ScenarioResponse, tags=["simulation", "phase3"])
def simulate_scenarios_api(req: ScenarioRequest, user: User = Depends(get_current_user)) -> ScenarioResponse:
    """Run hypothetical scenarios for a configured product."""
    return simulate_scenarios(req)

@app.post("/api/backtest/run", response_model=BacktestResponse, tags=["backtest", "phase3"])
def run_backtest_api(req: BacktestRequest, user: User = Depends(get_current_user)) -> BacktestResponse:
    """Run historical rolling-window backtest on real market data paths."""
    return run_backtest(req)

# --- Phase 4 Endpoints ---
from app.phase4_models import SuitabilityRequest, SuitabilityResponse
from app.phase4_suitability import run_suitability_assessment

@app.post("/api/suitability/check", response_model=SuitabilityResponse, tags=["suitability", "phase4"])
def check_suitability_api(req: SuitabilityRequest, user: User = Depends(get_current_user)) -> SuitabilityResponse:
    """Evaluate client suitability against product risk characteristics."""
    return run_suitability_assessment(req)

# --- CPN Endpoints ---
from app.cpn.router import router as cpn_router
app.include_router(cpn_router)

# --- DCD Endpoints ---
from app.dcd.router import router as dcd_router
app.include_router(dcd_router)

# --- Options Endpoints ---
from app.options.router import router as options_router
app.include_router(options_router)

# --- Debenture Endpoints ---
from app.debenture.router import router as debenture_router
app.include_router(debenture_router)

# --- Advanced Simulation Endpoints ---
from app.advanced_simulation.router import router as advanced_sim_router
app.include_router(advanced_sim_router)



