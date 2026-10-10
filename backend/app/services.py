"""Application boundary for UI and future tools; never depends on frontend code."""
from pydantic import model_validator
from app.domain import DomainError, DomainModel, ErrorBody
from app.phase2_engines import calculate_eln_payoff, calculate_dcd_payoff, calculate_cpn_payoff
from app.phase2_models import ElnPayoffResponse, DcdPayoffResponse, CpnPayoffResponse
from app.phase3_sim_models import ProductConfiguration, ScenarioRequest, ScenarioResponse, BacktestRequest, BacktestResponse
from app.phase3_simulation import simulate_scenarios, run_backtest
from app.phase4_models import ClientProfile, ProductRiskCharacteristics, SuitabilityRequest, SuitabilityResponse
from app.phase4_suitability import run_suitability_assessment
from app.phase3_market_data import MARKETS, get_instrument, validate_ticker

class SimulationRequest(ProductConfiguration):
    ticker: str = "^NSEI"
    include_history: bool = True

    @model_validator(mode="after")
    def matching_market(self):
        self.ticker = validate_ticker(self.ticker)
        market = MARKETS.get(self.ticker)
        if market is None:
            return self  # External metadata is resolved in the synchronous service, not during schema parsing.
        if self.product_type == "DCD":
            if market.get("deposit") != self.config.deposit_currency or market.get("alternate") != self.config.alternate_currency:
                raise ValueError("FX ticker must match deposit/alternate currency quote convention.")
        elif market["kind"] != "equity":
            raise ValueError("ELN and CPN require an equity underlying.")
        return self


class EvaluateRequest(SimulationRequest):
    client: ClientProfile


class SimulationBundle(DomainModel):
    payoff: ElnPayoffResponse | DcdPayoffResponse | CpnPayoffResponse
    scenarios: ScenarioResponse
    curve: ScenarioResponse
    backtest: BacktestResponse | None
    historical_error: ErrorBody | None
    product_risk: ProductRiskCharacteristics


class EvaluationBundle(DomainModel):
    assessment: SuitabilityResponse
    product_risk: ProductRiskCharacteristics
    historical_error: ErrorBody | None


def configuration(req):
    return ProductConfiguration.model_validate({key: getattr(req, key) for key in
        ("product_type", "eln_config", "dcd_config", "cpn_config")})


def derive_product_risk(req: ProductConfiguration, ticker="^NSEI", backtest=None, scenarios=None):
    cfg = req.config
    protection = cfg.protection_pct if req.product_type == "CPN" else 0
    # Coupon is not subtracted: this conservative gross-principal bound excludes issuer default.
    max_loss = 100 - protection
    if req.product_type == "DCD" and cfg.conversion_condition == "FX_AT_OR_BELOW_STRIKE":
        max_loss = 0  # Under this quote convention, converted principal value is >= deposit.
    stress_loss = None
    if scenarios is not None:
        negative_returns = [-result.return_pct for result in scenarios.results if result.return_pct < 0]
        stress_loss = max(negative_returns, default=0.0)
    historical_loss = max(0, -backtest.metrics.worst_return) if backtest else None
    assessed_loss = max(
        (value for value in (stress_loss, historical_loss) if value is not None),
        default=None,
    )
    return ProductRiskCharacteristics(product_type=req.product_type, product_reference=f"{req.product_type}:{ticker}",
        tenor_years=cfg.tenor_years, underlying_asset=ticker, issuer="Unspecified illustrative issuer",
        principal_protection_pct=protection, max_contractual_loss_pct=max_loss, coupon_pct_pa=cfg.coupon_pct_pa or 0,
        upside_participation=cfg.participation_rate > 0 if req.product_type == "CPN" else False,
        currency_conversion_risk=req.product_type == "DCD",
        stress_loss_pct=stress_loss, historical_worst_loss_pct=historical_loss,
        assessed_loss_pct=assessed_loss)


def history_or_error(req):
    if not req.include_history:
        return None, None
    try:
        return run_backtest(BacktestRequest(**configuration(req).model_dump(), ticker=req.ticker)), None
    except DomainError as exc:
        return None, ErrorBody(code=exc.code, message=exc.message)


def run_simulation(req: SimulationRequest) -> SimulationBundle:
    validate_product_market(req)
    config = configuration(req)
    payoff = {"ELN": calculate_eln_payoff, "DCD": calculate_dcd_payoff, "CPN": calculate_cpn_payoff}[req.product_type](req.config)
    scenarios = simulate_scenarios(ScenarioRequest(**config.model_dump()))
    curve = simulate_scenarios(ScenarioRequest(**config.model_dump(), custom_scenarios=list(range(-90, 81))))
    history, error = history_or_error(req)
    return SimulationBundle(payoff=payoff, scenarios=scenarios, curve=curve, backtest=history, historical_error=error,
        product_risk=derive_product_risk(config, req.ticker, history, scenarios))


def evaluate_client(req: EvaluateRequest, user=None) -> EvaluationBundle:
    validate_product_market(req)
    config = configuration(req)
    amount = req.config.deposit_amount if req.product_type == "DCD" else req.config.investment
    currency = req.config.deposit_currency if req.product_type == "DCD" else req.config.investment_currency
    if req.client.portfolio_currency != currency:
        raise DomainError("CURRENCY_MISMATCH", "Client portfolio and product investment must use the same currency; automatic portfolio FX translation is not supported.")
    if abs(amount - req.client.proposed_investment_amount) > 0.01:
        raise DomainError("INVESTMENT_MISMATCH", "Client proposed investment must match the configured product amount.")
    scenarios = simulate_scenarios(ScenarioRequest(**config.model_dump()))
    history, error = history_or_error(req)
    risk = derive_product_risk(config, req.ticker, history, scenarios)
    assessment = run_suitability_assessment(SuitabilityRequest(client=req.client, product_risk=risk))
    result = EvaluationBundle(assessment=assessment, product_risk=risk, historical_error=error)
    from app.assessment_records import save_record
    owner_id = None
    rm_id = None
    if user is not None:
        if getattr(user, "role", None) == "rm":
            owner_id = req.client.client_id
            rm_id = getattr(user, "id", None)
        else:
            owner_id = getattr(user, "id", None)
            rm_id = None
    else:
        owner_id = req.client.client_id
    save_record(req, result, history, owner_id=owner_id, rm_id=rm_id)
    return result


def validate_product_market(req):
    market = get_instrument(req.ticker)
    if req.product_type == "DCD":
        if market.deposit != req.config.deposit_currency or market.alternate != req.config.alternate_currency:
            raise DomainError("FX_PAIR_MISMATCH", "The currency pair must match the saved product.")
    elif market.kind != "equity":
        raise DomainError("UNDERLYING_MISMATCH", "Choose a stock, index or ETF for this product.")
