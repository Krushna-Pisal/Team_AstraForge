"""
Capital-Protected Note (CPN) domain package.
"""
from app.cpn.schemas import (
    CpnProductInput,
    CpnPayoffRequest,
    CpnPayoffResponse,
    CpnCurveResponse,
    CpnScenarioRequest,
    CpnScenarioResponse,
    CpnBacktestRequest,
    CpnBacktestResponse,
    CpnLossMeasuresResponse,
)

__all__ = [
    "CpnProductInput",
    "CpnPayoffRequest",
    "CpnPayoffResponse",
    "CpnCurveResponse",
    "CpnScenarioRequest",
    "CpnScenarioResponse",
    "CpnBacktestRequest",
    "CpnBacktestResponse",
    "CpnLossMeasuresResponse",
]
