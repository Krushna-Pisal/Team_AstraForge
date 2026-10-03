"""
Dual Currency Deposit (DCD) product package.
Deterministic payoff calculation, curve generation, scenario analysis,
real FX historical backtest, and suitability loss measures.
"""

from app.dcd.schemas import (
    DcdProductInput,
    DcdPayoffRequest,
    DcdPayoffOutcome,
    DcdPayoffResponse,
    DcdCurveResponse,
    DcdScenarioItem,
    DcdScenariosResponse,
    DcdBacktestResponse,
    DcdLossMeasuresResponse,
    FxPairInfo,
)
from app.dcd.payoff import calculate_dcd_payoff_core
from app.dcd.curve import generate_dcd_curve
from app.dcd.scenarios import run_dcd_scenarios
from app.dcd.backtest import run_dcd_backtest
from app.dcd.loss_measures import calculate_dcd_loss_measures

__all__ = [
    "DcdProductInput",
    "DcdPayoffRequest",
    "DcdPayoffOutcome",
    "DcdPayoffResponse",
    "DcdCurveResponse",
    "DcdScenarioItem",
    "DcdScenariosResponse",
    "DcdBacktestResponse",
    "DcdLossMeasuresResponse",
    "FxPairInfo",
    "calculate_dcd_payoff_core",
    "generate_dcd_curve",
    "run_dcd_scenarios",
    "run_dcd_backtest",
    "calculate_dcd_loss_measures",
]
