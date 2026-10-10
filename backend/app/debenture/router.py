from __future__ import annotations

from fastapi import APIRouter, HTTPException, Depends
from app.auth import get_current_user, User
from app.debenture.schemas import (
    DebentureRequest,
    DebentureResponse,
)
from app.debenture.engine import calculate_debenture

router = APIRouter(prefix="/api/debenture", tags=["debenture"], dependencies=[Depends(get_current_user)])


@router.post("/simulate", response_model=DebentureResponse)
def simulate_debenture_endpoint(
    req: DebentureRequest,
    user: User = Depends(get_current_user),
) -> DebentureResponse:
    """
    Simulate Fixed-Rate Bullet Debenture cash flows, Yield-to-Maturity (YTM),
    Present Value, and yield sensitivity curve.
    """
    try:
        return calculate_debenture(req)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Debenture simulation error: {str(e)}")
