from __future__ import annotations

from fastapi import APIRouter, HTTPException, Depends
from app.auth import get_current_user, User
from app.options.schemas import (
    OptionsSimulationRequest,
    OptionsSimulationResponse,
)
from app.options.payoff import simulate_options

router = APIRouter(prefix="/api/options", tags=["options"], dependencies=[Depends(get_current_user)])


@router.post("/simulate", response_model=OptionsSimulationResponse)
def simulate_options_endpoint(
    req: OptionsSimulationRequest,
    user: User = Depends(get_current_user),
) -> OptionsSimulationResponse:
    """
    Simulate European option payoff, profit/loss, scenarios, and curves at expiration.
    Supports Call and Put options in Long and Short positions.
    """
    try:
        return simulate_options(req)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")
