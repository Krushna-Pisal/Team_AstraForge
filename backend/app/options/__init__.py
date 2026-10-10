"""Options Payoff Simulator module for AstraForge."""
from app.options.payoff import (
    calculate_option_payoff_single,
    calculate_break_even,
    calculate_max_profit_loss,
    simulate_options,
    validate_option_inputs,
)
from app.options.schemas import (
    OptionType,
    PositionType,
    OptionsSimulationRequest,
    OptionsSimulationResponse,
    OptionScenarioItem,
    OptionCurvePoint,
)

__all__ = [
    "calculate_option_payoff_single",
    "calculate_break_even",
    "calculate_max_profit_loss",
    "simulate_options",
    "validate_option_inputs",
    "OptionType",
    "PositionType",
    "OptionsSimulationRequest",
    "OptionsSimulationResponse",
    "OptionScenarioItem",
    "OptionCurvePoint",
]
