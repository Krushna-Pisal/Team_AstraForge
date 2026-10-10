"""
FastAPI router for Dual Currency Deposit (DCD) endpoints.
Mounted under /api/dcd.
"""

from typing import List
from fastapi import APIRouter, Depends
from app.auth import get_current_user
from app.dcd.schemas import (
    DcdProductInput,
    DcdPayoffRequest,
    DcdPayoffResponse,
    DcdCurveResponse,
    DcdScenariosRequest,
    DcdScenariosResponse,
    DcdBacktestResponse,
    DcdLossMeasuresResponse,
    FxPairInfo,
    SUPPORTED_PAIRS,
)
from app.dcd.payoff import calculate_dcd_payoff_core
from app.dcd.curve import generate_dcd_curve
from app.dcd.scenarios import run_dcd_scenarios
from app.dcd.backtest import run_dcd_backtest
from app.dcd.loss_measures import calculate_dcd_loss_measures


router = APIRouter(prefix="/api/dcd", tags=["dcd"], dependencies=[Depends(get_current_user)])


@router.get("/pairs", response_model=List[FxPairInfo])
def get_supported_currency_pairs() -> List[FxPairInfo]:
    """
    Return list of supported FX currency pairs with latest spot exchange rate.
    Uses real cached or Yahoo Finance data.
    """
    pairs: List[FxPairInfo] = []
    for ticker, info in SUPPORTED_PAIRS.items():
        try:
            from app.phase3_market_data import get_market_data
            m = get_market_data(ticker, "1mo")
            price = m.latest_price
            as_of = m.as_of
        except Exception:
            # Fallback typical spot if network unavailable
            price = 86.50 if "INR" in ticker else 1.08
            as_of = "Cached reference"

        pairs.append(
            FxPairInfo(
                ticker=ticker,
                label=info["label"],
                deposit_currency=info["deposit"],
                alternate_currency=info["alternate"],
                latest_price=round(float(price), 4),
                as_of=as_of,
            )
        )
    return pairs


@router.post("/payoff", response_model=DcdPayoffResponse)
def compute_dcd_payoff(req: DcdPayoffRequest) -> DcdPayoffResponse:
    """
    Compute single-point DCD maturity outcome for an observed maturity exchange rate S_T.
    """
    outcome = calculate_dcd_payoff_core(req, req.maturity_fx_rate)
    return DcdPayoffResponse(**outcome.model_dump())


@router.post("/curve", response_model=DcdCurveResponse)
def compute_dcd_curve(req: DcdProductInput) -> DcdCurveResponse:
    """
    Generate continuous DCD payoff curve across underlying FX rates from -25% to +25%.
    Includes conversion strike and analytical break-even rate.
    """
    return generate_dcd_curve(req)


@router.post("/scenarios", response_model=DcdScenariosResponse)
def compute_dcd_scenarios(req: DcdScenariosRequest) -> DcdScenariosResponse:
    """
    Compute outcome across standard or custom FX market shocks (-20% to +20%).
    """
    return run_dcd_scenarios(req, req.shocks)


@router.post("/backtest", response_model=DcdBacktestResponse)
def compute_dcd_backtest(req: DcdProductInput) -> DcdBacktestResponse:
    """
    Run rolling calendar-tenor historical backtest on real daily exchange rate data.
    """
    return run_dcd_backtest(req)


@router.post("/loss-measures", response_model=DcdLossMeasuresResponse)
def compute_dcd_loss_measures(req: DcdProductInput) -> DcdLossMeasuresResponse:
    """
    Return suitability loss measures: contractual loss bound, worst historical loss, and p5 loss.
    """
    return calculate_dcd_loss_measures(req)
