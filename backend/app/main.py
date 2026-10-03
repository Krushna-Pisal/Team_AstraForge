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
from app.payoff_engine import build_payoff_curve, run_scenarios, get_formula_text, DEFAULT_SHOCKS

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
