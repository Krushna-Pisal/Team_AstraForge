from __future__ import annotations

from fastapi import APIRouter, HTTPException, Depends
from app.auth import get_current_user, User
from app.advanced_simulation.schemas import (
    MarketShockRequest,
    MarketShockResponse,
    SensitivityRequest,
    SensitivityResponse,
    HistoricalScenarioRequest,
    HistoricalScenarioResponse,
)
from app.advanced_simulation.service import (
    evaluate_market_shocks,
    evaluate_sensitivity,
    evaluate_historical_scenarios,
)

router = APIRouter(prefix="/api/advanced-simulation", tags=["advanced_simulation"], dependencies=[Depends(get_current_user)])


@router.post("/market-shocks", response_model=MarketShockResponse)
def market_shocks_endpoint(
    req: MarketShockRequest,
    user: User = Depends(get_current_user),
) -> MarketShockResponse:
    """Evaluate and compare structured product payoffs under market shocks."""
    try:
        return evaluate_market_shocks(req)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Market shock simulation error: {str(e)}")


@router.post("/sensitivity", response_model=SensitivityResponse)
def sensitivity_endpoint(
    req: SensitivityRequest,
    user: User = Depends(get_current_user),
) -> SensitivityResponse:
    """Generate dense payoff curve and key threshold markers for sensitivity analysis."""
    try:
        return evaluate_sensitivity(req)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sensitivity analysis error: {str(e)}")


@router.post("/historical-scenarios", response_model=HistoricalScenarioResponse)
def historical_scenarios_endpoint(
    req: HistoricalScenarioRequest,
    user: User = Depends(get_current_user),
) -> HistoricalScenarioResponse:
    """Run historical scenario replay using observed market windows."""
    try:
        return evaluate_historical_scenarios(req)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Historical scenario replay error: {str(e)}")
