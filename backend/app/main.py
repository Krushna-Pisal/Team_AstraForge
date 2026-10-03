"""
FastAPI application entry point for the Payoff Simulator.

CORS is enabled for localhost:5173 (Vite dev server).
"""

from __future__ import annotations

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.domain import ErrorResponse
from app.errors import install_error_handlers
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
app.include_router(discovery_router)
app.include_router(insights_router)

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

@app.get("/api/market-data/history", response_model=MarketHistory, tags=["market"])
def get_market_history(ticker: str = "^NSEI", period: str = "10y", source: str = "snapshot", refresh: bool = False) -> MarketHistory:
    return get_market_data(ticker, period, source, refresh)


@app.get("/api/market-data/catalog", response_model=list[MarketInstrument], tags=["market"])
def get_market_catalog() -> list[MarketInstrument]:
    return [{"ticker": key, **value} for key, value in MARKETS.items()]


@app.get("/api/market-data/search", response_model=SearchResponse, tags=["market"])
def search_market_symbols(q: str = "", kind: str = "equity"):
    return search_underlyings(q, kind)


@app.post("/api/products/validate", response_model=ValidatedProduct, tags=["products"])
def validate_product_template(req: ProductTemplate):
    return validate_product(req)


@app.post("/api/products/prepare", response_model=PreparedProduct, tags=["products"])
def prepare_saved_product(req: PrepareProductRequest):
    return prepare_product(req)


@app.post("/api/simulation/run", response_model=SimulationBundle, tags=["services"])
def simulation_bundle(req: SimulationRequest):
    return run_simulation(req)


@app.post("/api/suitability/evaluate", response_model=EvaluationBundle, tags=["services"])
def evaluate_configured_product(req: EvaluateRequest):
    return evaluate_client(req)

@app.post("/api/scenarios/simulate", response_model=ScenarioResponse, tags=["simulation", "phase3"])
def simulate_scenarios_api(req: ScenarioRequest) -> ScenarioResponse:
    """Run hypothetical scenarios for a configured product."""
    return simulate_scenarios(req)

@app.post("/api/backtest/run", response_model=BacktestResponse, tags=["backtest", "phase3"])
def run_backtest_api(req: BacktestRequest) -> BacktestResponse:
    """Run historical rolling-window backtest on real market data paths."""
    return run_backtest(req)

# --- Phase 4 Endpoints ---
from app.phase4_models import SuitabilityRequest, SuitabilityResponse
from app.phase4_suitability import run_suitability_assessment

@app.post("/api/suitability/check", response_model=SuitabilityResponse, tags=["suitability", "phase4"])
def check_suitability_api(req: SuitabilityRequest) -> SuitabilityResponse:
    """Evaluate client suitability against product risk characteristics."""
    return run_suitability_assessment(req)
