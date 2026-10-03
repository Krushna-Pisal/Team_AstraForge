"""Shared JSON conventions: percentages are percentage points; money is unrounded."""
from typing import Literal
from pydantic import BaseModel, ConfigDict

ProductType = Literal["ELN", "DCD", "CPN"]
Currency = Literal["INR", "USD", "EUR", "GBP", "JPY", "CHF", "AUD", "CAD", "SGD", "HKD"]


class DomainModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False, populate_by_name=True)


class DomainError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 422):
        self.code, self.message, self.status_code = code, message, status_code
        super().__init__(message)


class ErrorDetail(DomainModel):
    field: str
    message: str


class ErrorBody(DomainModel):
    code: str
    message: str
    details: list[ErrorDetail] = []


class ErrorResponse(DomainModel):
    error: ErrorBody
