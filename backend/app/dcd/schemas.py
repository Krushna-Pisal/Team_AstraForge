"""
Pydantic schemas and validation for Dual Currency Deposit (DCD).
Strict type checking, clear 422 error messages, zero synthetic data.
"""

from typing import Literal, Optional, List
from pydantic import BaseModel, Field, model_validator


SUPPORTED_PAIRS = {
    "USDINR=X": {"label": "USD / INR", "deposit": "USD", "alternate": "INR"},
    "EURUSD=X": {"label": "EUR / USD", "deposit": "EUR", "alternate": "USD"},
    "GBPUSD=X": {"label": "GBP / USD", "deposit": "GBP", "alternate": "USD"},
}

ALLOWED_TENORS = [1 / 12, 3 / 12, 6 / 12, 1.0, 2.0]  # 1M, 3M, 6M, 1Y, 2Y


class FxPairInfo(BaseModel):
    ticker: str
    label: str
    deposit_currency: str
    alternate_currency: str
    latest_price: float
    as_of: str


class DcdProductInput(BaseModel):
    pair: str = Field("USDINR=X", description="Yahoo FX ticker, e.g. USDINR=X, EURUSD=X")
    deposit_currency: str = Field("USD", description="Currency deposited by investor")
    alternate_currency: str = Field("INR", description="Alternate linked currency")
    deposit_amount: float = Field(..., gt=0, description="Amount deposited in deposit_currency")
    tenor_years: float = Field(0.25, gt=0, le=5.0, description="Tenor in years (e.g. 0.25 for 3 months)")
    conversion_strike_rate: float = Field(..., gt=0, description="Exchange rate trigger K (alternate units per 1 deposit unit)")
    initial_fx_rate: Optional[float] = Field(None, gt=0, description="Reference spot FX rate S_0 at deposit start")
    conversion_condition: Literal["FX_AT_OR_ABOVE_STRIKE", "FX_AT_OR_BELOW_STRIKE"] = Field(
        "FX_AT_OR_ABOVE_STRIKE",
        description="Whether conversion triggers if maturity FX >= strike or <= strike"
    )
    coupon_pct_pa: float = Field(0.0, ge=0.0, le=100.0, description="Annualized fixed coupon in deposit currency")
    fd_rate_pct_pa: Optional[float] = Field(
        None,
        ge=0.0,
        le=50.0,
        description="User-entered benchmark deposit rate for comparison (no default, purely optional)"
    )

    @model_validator(mode="after")
    def validate_currencies_and_strike(self):
        dep = self.deposit_currency.strip().upper()
        alt = self.alternate_currency.strip().upper()
        if dep == alt:
            raise ValueError(f"Deposit currency and alternate currency must be different (got {dep} and {alt}).")
        self.deposit_currency = dep
        self.alternate_currency = alt

        # Normalize pair ticker if needed
        p = self.pair.strip().upper()
        if not p.endswith("=X"):
            if "/" in p:
                parts = p.split("/")
                p = f"{parts[0].strip()}{parts[1].strip()}=X"
            else:
                p = f"{p}=X"
        self.pair = p

        if self.conversion_strike_rate <= 0:
            raise ValueError("Conversion strike rate must be greater than 0.")
        if self.deposit_amount <= 0:
            raise ValueError("Deposit amount must be greater than 0.")
        return self


class DcdPayoffRequest(DcdProductInput):
    maturity_fx_rate: float = Field(..., gt=0, description="Observed exchange rate S_T at maturity")


class DcdPayoffOutcome(BaseModel):
    deposit_currency: str
    alternate_currency: str
    deposit_amount: float
    maturity_fx_rate: float
    conversion_strike_rate: float
    conversion_condition: str
    conversion_occurred: bool
    repayment_currency: str
    principal_repayment_amount: float
    coupon_amount: float
    coupon_currency: str
    principal_value_deposit_currency: float
    total_value_deposit_currency: float
    profit_loss_deposit_currency: float
    return_pct: float
    cash_flows: List[dict]
    explanation: str
    risk_notes: List[str]


class DcdPayoffResponse(DcdPayoffOutcome):
    pass


class DcdCurvePoint(BaseModel):
    fx_rate: float
    fx_change_pct: float
    investor_return_pct: float
    conversion_occurred: bool
    repayment_currency: str
    total_value_deposit_currency: float


class DcdBreakpoints(BaseModel):
    conversion_strike_rate: float
    break_even_fx_rate: Optional[float]
    max_return_pct: float
    initial_fx_rate: float


class DcdCurveResponse(BaseModel):
    pair: str
    deposit_currency: str
    alternate_currency: str
    points: List[DcdCurvePoint]
    breakpoints: DcdBreakpoints
    risk_notes: List[str]


class DcdScenarioItem(BaseModel):
    fx_shock_pct: float
    maturity_fx_rate: float
    conversion_occurred: bool
    repayment_currency: str
    principal_repayment: float
    coupon_amount: float
    total_value_deposit: float
    profit_loss_deposit: float
    return_pct: float


class DcdScenariosRequest(DcdProductInput):
    shocks: Optional[List[float]] = None


class DcdScenariosResponse(BaseModel):
    pair: str
    deposit_currency: str
    alternate_currency: str
    scenarios: List[DcdScenarioItem]
    risk_notes: List[str]


class DcdHistogramBucket(BaseModel):
    bucket_min: float
    bucket_max: float
    count: int
    pct: float


class DcdBacktestResponse(BaseModel):
    pair: str
    deposit_currency: str
    alternate_currency: str
    total_windows: int
    data_start_date: str
    data_end_date: str
    conversion_frequency_pct: float
    win_frequency_pct: float
    loss_frequency_pct: float
    best_return_pct: float
    median_return_pct: float
    worst_return_pct: float
    average_annualized_return_pct: float
    histogram: List[DcdHistogramBucket]
    fd_outperformed_pct: Optional[float] = None
    data_note: str
    source: str


class DcdLossMeasuresResponse(BaseModel):
    max_contractual_loss_pct: Optional[float]
    worst_historical_loss_pct: Optional[float]
    p5_loss_pct: Optional[float]
    conversion_frequency_pct: Optional[float]
    driving_measure: str
    data_note: str
