from __future__ import annotations

from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, field_validator, model_validator

CPN_RISK_NOTES: List[str] = [
    "Protection applies only at maturity and depends on the issuer's ability to pay. Issuer credit risk is not modelled here.",
    "Selling before maturity may return less than the protected amount.",
    "Upside is limited by the participation rate and any cap.",
    "Taxes and fees are ignored."
]

FORMULA_TEXT: str = (
    "r = (S_T - S_0) / S_0; "
    "protected_amount = investment * protection_pct / 100; "
    "participation_gain = investment * (participation_pct / 100) * min(max(r, 0), cap_pct / 100); "
    "coupon_amount = investment * (coupon_pct_pa / 100) * tenor_years; "
    "final_amount = protected_amount + participation_gain + coupon_amount; "
    "profit_loss = final_amount - investment; "
    "return_pct = profit_loss / investment * 100"
)

ALLOWED_TENORS = {0.5, 1.0, 2.0, 3.0, 5.0}


class CpnProductInput(BaseModel):
    underlying: str = Field(default="NIFTY50", description="Underlying asset symbol with cached data")
    investment: float = Field(..., gt=0, description="Investment amount in INR")
    tenor_years: float = Field(default=3.0, description="Tenor in years: one of 0.5, 1, 2, 3, 5")
    protection_pct: float = Field(default=100.0, ge=80.0, le=100.0, description="Principal protection percentage (80-100)")
    participation_pct: float = Field(default=100.0, ge=10.0, le=150.0, description="Participation rate percentage (10-150)")
    cap_pct: Optional[float] = Field(default=None, description="Optional upside cap percentage on underlying return (>0)")
    coupon_pct_pa: float = Field(default=0.0, ge=0.0, description="Optional fixed coupon percentage per annum")
    fd_rate_pct_pa: Optional[float] = Field(default=None, description="Assumed fixed-deposit rate (user-entered, not market data)")

    @field_validator("tenor_years")
    @classmethod
    def validate_tenor(cls, v: float) -> float:
        val = float(v)
        if val not in ALLOWED_TENORS:
            raise ValueError(f"tenor_years must be one of {sorted(list(ALLOWED_TENORS))}, got {v}")
        return val

    @field_validator("cap_pct")
    @classmethod
    def validate_cap(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("cap_pct must be strictly greater than 0 when provided")
        return v


class CpnPayoffRequest(CpnProductInput):
    underlying_return_pct: Optional[float] = Field(default=None, description="Underlying return percentage (e.g. 20 for +20%)")
    r: Optional[float] = Field(default=None, description="Underlying return in decimal (e.g. 0.20 for +20%)")

    @model_validator(mode="after")
    def resolve_return(self) -> "CpnPayoffRequest":
        if self.underlying_return_pct is None and self.r is None:
            self.underlying_return_pct = 0.0
            self.r = 0.0
        elif self.r is not None and self.underlying_return_pct is None:
            self.underlying_return_pct = self.r * 100.0
        elif self.underlying_return_pct is not None and self.r is None:
            self.r = self.underlying_return_pct / 100.0
        return self


class CpnPayoffResponse(BaseModel):
    protected_amount: float
    participation_gain: float
    coupon_amount: float
    final_amount: float
    profit_loss: float
    return_pct: float
    principal_at_risk: float
    formula_text: str = FORMULA_TEXT
    risk_notes: List[str] = CPN_RISK_NOTES


class CpnCurvePoint(BaseModel):
    underlying_return_pct: float
    investor_return_pct: float
    final_amount: float


class CpnBreakpoints(BaseModel):
    floor_return_pct: float
    cap_underlying_return_pct: Optional[float] = None
    cap_return_pct: Optional[float] = None
    break_even_underlying_return_pct: Optional[float] = None


class CpnCurveResponse(BaseModel):
    points: List[CpnCurvePoint]
    breakpoints: CpnBreakpoints
    risk_notes: List[str] = CPN_RISK_NOTES


class CpnScenarioRequest(CpnProductInput):
    custom_scenarios: Optional[List[float]] = Field(
        default=None,
        description="Optional list of underlying shocks in percentage (e.g. [-40, -20, 0, 20])"
    )


class CpnScenarioResult(BaseModel):
    scenario_shock_pct: float
    underlying_return_pct: float
    protected_amount: float
    participation_gain: float
    coupon_amount: float
    final_amount: float
    profit_loss: float
    return_pct: float


class CpnScenarioResponse(BaseModel):
    results: List[CpnScenarioResult]
    risk_notes: List[str] = CPN_RISK_NOTES


class CpnHistogramBucket(BaseModel):
    bin_start: float
    bin_end: float
    count: int
    frequency_pct: float


class CpnBacktestRequest(CpnProductInput):
    pass


class CpnBacktestResponse(BaseModel):
    total_windows: int
    data_start_date: str
    data_end_date: str
    best_final_amount: float
    best_return_pct: float
    median_final_amount: float
    median_return_pct: float
    worst_final_amount: float
    worst_return_pct: float
    average_annualised_return_pct: float
    no_upside_windows_pct: float
    loss_windows_pct: float
    histogram: List[CpnHistogramBucket]
    fd_comparison: Optional[Dict[str, Any]] = None
    data_note: str
    source: str = "Yahoo Finance via yfinance, daily adjusted closes"
    risk_notes: List[str] = CPN_RISK_NOTES


class CpnLossMeasuresResponse(BaseModel):
    max_principal_loss_pct: float
    worst_historical_loss_pct: Optional[float] = None
    p5_loss_pct: Optional[float] = None
    strictest_loss_pct: Optional[float] = None
    driving_measure: Optional[str] = None
    data_note: Optional[str] = None
