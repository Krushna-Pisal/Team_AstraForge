"""Advanced Scenario Simulation and Historical Replay Module for AstraForge."""
from app.advanced_simulation.schemas import (
    ProductSimulationSpec,
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

__all__ = [
    "ProductSimulationSpec",
    "MarketShockRequest",
    "MarketShockResponse",
    "SensitivityRequest",
    "SensitivityResponse",
    "HistoricalScenarioRequest",
    "HistoricalScenarioResponse",
    "evaluate_market_shocks",
    "evaluate_sensitivity",
    "evaluate_historical_scenarios",
]
