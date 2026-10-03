"""Reusable product terms. Persistence belongs to the browser session for now."""
from typing import Literal
from pydantic import Field, model_validator
from app.domain import Currency, DomainError, DomainModel, ProductType
from app.phase2_models import ElnPayoffRequest, DcdPayoffRequest, CpnPayoffRequest
from app.phase3_market_data import MarketHistory, MarketInstrument, get_instrument, get_market_data, validate_ticker
from app.services import SimulationRequest


class ELNTerms(DomainModel):
    tenor_years: float = Field(gt=0, le=30)
    coupon_pct_pa: float = Field(ge=0, le=100)
    strike_pct: float = Field(gt=0, le=100)
    barrier_pct: float = Field(gt=0, le=100)
    barrier_monitoring: Literal["daily", "maturity"] = "daily"
    contract_variant: Literal["unconditional_strike", "phase2_contingent"] = "unconditional_strike"
    settlement_method: Literal["cash"] = "cash"

    @model_validator(mode="after")
    def valid_barrier(self):
        if self.barrier_pct >= self.strike_pct:
            raise ValueError("The loss trigger (barrier) must be lower than the settlement level (strike).")
        return self


class DCDTerms(DomainModel):
    tenor_years: float = Field(gt=0, le=30)
    coupon_pct_pa: float = Field(ge=0, le=100)
    conversion_strike_rate: float = Field(gt=0)
    conversion_condition: Literal["FX_AT_OR_ABOVE_STRIKE", "FX_AT_OR_BELOW_STRIKE"] = "FX_AT_OR_ABOVE_STRIKE"


class CPNTerms(DomainModel):
    tenor_years: float = Field(gt=0, le=30)
    coupon_pct_pa: float = Field(0, ge=0, le=100)
    protection_pct: float = Field(ge=0, le=100)
    participation_rate: float = Field(ge=0, le=1000)
    upside_cap_pct: float | None = Field(None, ge=0, le=1000)
    cap_basis: Literal["investor_return", "underlying_return"] = "investor_return"


class ProductTemplate(DomainModel):
    name: str = Field(min_length=1, max_length=100)
    product_type: ProductType
    ticker: str = Field(min_length=1, max_length=32)
    currency: Currency
    eln_terms: ELNTerms | None = None
    dcd_terms: DCDTerms | None = None
    cpn_terms: CPNTerms | None = None

    @model_validator(mode="after")
    def matching_terms(self):
        self.name = self.name.strip()
        self.ticker = validate_ticker(self.ticker)
        if not self.name:
            raise ValueError("Enter a product name.")
        terms = {"ELN": self.eln_terms, "DCD": self.dcd_terms, "CPN": self.cpn_terms}
        if terms[self.product_type] is None or sum(t is not None for t in terms.values()) != 1:
            raise ValueError("Provide exactly the terms for the selected product type.")
        return self

    @property
    def terms(self):
        return getattr(self, self.product_type.lower() + "_terms")


class ValidatedProduct(DomainModel):
    template: ProductTemplate
    instrument: MarketInstrument


class PrepareProductRequest(DomainModel):
    template: ProductTemplate
    investment_amount: float = Field(gt=0, le=1e15)


class PreparedProduct(DomainModel):
    configuration: SimulationRequest
    market: MarketHistory


def validate_product(template: ProductTemplate) -> ValidatedProduct:
    instrument = get_instrument(template.ticker)
    if template.product_type == "DCD":
        if instrument.kind != "fx" or template.currency != instrument.deposit:
            raise DomainError("CURRENCY_MISMATCH", "The product currency must be the first currency in the selected pair.")
    elif instrument.kind != "equity":
        raise DomainError("UNDERLYING_MISMATCH", "Choose a stock, index or ETF.")
    elif template.currency != instrument.currency:
        raise DomainError("CURRENCY_MISMATCH", "Use the underlying's currency for this product. Automatic currency conversion is not supported.")
    return ValidatedProduct(template=template, instrument=instrument)


def prepare_product(req: PrepareProductRequest) -> PreparedProduct:
    validated = validate_product(req.template)
    market = get_market_data(req.template.ticker)
    template, instrument = validated.template, validated.instrument
    initial = market.latest_price
    terms = template.terms.model_dump()
    if template.product_type == "ELN":
        config = ElnPayoffRequest(**terms, investment=req.investment_amount, investment_currency=template.currency,
            initial_price=initial, final_price=initial, observed_prices=[initial, initial])
    elif template.product_type == "DCD":
        # Reuse the actual saved absolute strike. Never silently rebase a product's terms.
        config = DcdPayoffRequest(**terms, deposit_amount=req.investment_amount,
            deposit_currency=instrument.deposit, alternate_currency=instrument.alternate,
            initial_fx_rate=initial, maturity_fx_rate=initial)
    else:
        config = CpnPayoffRequest(**terms, investment=req.investment_amount, investment_currency=template.currency,
            initial_price=initial, final_price=initial)
    return PreparedProduct(configuration=SimulationRequest(product_type=template.product_type, ticker=template.ticker,
        **{template.product_type.lower() + "_config": config}), market=market)
