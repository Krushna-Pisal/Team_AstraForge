# Stable foundation contracts — API 1.0.0

The executable schema is `GET /openapi.json`; an exported snapshot is `docs/openapi.json`. Unknown request fields, non-finite numbers, invalid enum values and invalid combinations are rejected. All stable APIs return a consistent error envelope.

## Conventions

- Percentages are percentage points (12 = 12%, 80 = 80%). Annual simple coupons are `coupon_pct_pa`; tenor is `tenor_years`.
- `participation_rate` retains its established field name but is percentage points.
- DCD/CPN accept old `coupon_rate` on input only. Send only one alias. Responses and schemas use canonical names.
- Monetary values are in named currency units, not paise/cents. Engines retain precision; UI formats to 2 decimals.
- All returns are total returns over the tenor, not annualized yields.
- Dates are ISO YYYY-MM-DD; assessment timestamps are ISO 8601 with UTC offset.
- Product enums: ELN / DCD / CPN. Observation enums: daily / maturity. Cash-only ELN settlement.
- CPN retains deprecated `underlying_return` as a fractional ratio for compatibility; new clients use `underlying_return_pct`.
- Final outcome calculations are deterministic for the same inputs; assessment UUID/timestamp are metadata and vary.

## Error envelope

```json
{"error":{"code":"VALIDATION_ERROR","message":"Please check the highlighted request fields.","details":[{"field":"body.investment","message":"Input should be greater than 0"}]}}
```

Validation/unsupported contract errors: 422. Unknown route: 404. Market failure/empty/invalid provider data: 503. Unexpected failure: 500 with safe generic message. Codes include UNSUPPORTED_TICKER, INVALID_PERIOD, EMPTY_MARKET_DATA, INVALID_MARKET_DATA, MARKET_DATA_UNAVAILABLE, INSUFFICIENT_HISTORY, FX_PAIR_MISMATCH, UNDERLYING_MISMATCH, INVESTMENT_MISMATCH, CURRENCY_MISMATCH.

## Product payoff routes

### POST /api/payoff/eln

```json
{
  "investment": 1000000,
  "initial_price": 100,
  "final_price": 60,
  "strike_pct": 90,
  "barrier_pct": 70,
  "coupon_pct_pa": 12,
  "tenor_years": 1,
  "barrier_monitoring": "daily",
  "observed_prices": [100, 70, 60],
  "settlement_method": "cash",
  "contract_variant": "unconditional_strike"
}
```

Daily observations must begin/end at the initial/final levels. Without a path, daily callers must explicitly supply an observed `barrier_breached` boolean. Paths take precedence over the flag. Final price touching/below the barrier always breaches. Maturity ignores earlier observations/flags.

`unconditional_strike`: coupon = investment × annual rate × years. Principal = investment unless breached and final below strike, then investment × final/strike. Exact strike returns full principal.

`phase2_contingent` (compatibility default): coupon only if no breach and final ≥ strike. Breached principal = investment × final/initial, including recovery above initial. This preserves the original phase 2 rule; it is explicitly not equivalent to the original legacy `/payoff` endpoint.

Response: initial/final/strike/barrier prices, barrier_breached, principal_repayment, coupon_earned, total_maturity_value, absolute_profit_loss, return_pct, contract_variant, payoff_explanation, contract_assumptions.

### POST /api/payoff/dcd

```json
{
  "deposit_currency": "USD",
  "alternate_currency": "INR",
  "deposit_amount": 100000,
  "initial_fx_rate": 83,
  "conversion_strike_rate": 84,
  "maturity_fx_rate": 85,
  "coupon_pct_pa": 6,
  "tenor_years": 0.25,
  "conversion_condition": "FX_AT_OR_ABOVE_STRIKE"
}
```

Quote = alternate units per one deposit unit (83 means INR per USD here). Also supports FX_AT_OR_BELOW_STRIKE. Exact strike triggers conversion for either condition. Converted principal = deposit × strike in alternate currency. Coupon always = deposit × annual rate × years in deposit currency.

Response includes `cash_flows` (separate principal/coupon currency amounts), `principal_value_deposit_currency`, `total_value_deposit_currency`, `absolute_profit_loss`, `effective_return_pct`, events and assumptions. Translated principal = alternate principal / maturity FX. Legacy `total_maturity_repayment` remains the numerical alternate principal if converted, otherwise deposit principal plus coupon; never use that legacy field to add mixed currencies.

Supported payoff currency codes: INR, USD, EUR, GBP, JPY, CHF, AUD, CAD, SGD, HKD; same-currency contracts rejected. History supports Yahoo currency pairs in these currencies, subject to provider availability.

### POST /api/payoff/cpn

```json
{
  "investment": 100000,
  "initial_price": 100,
  "final_price": 120,
  "protection_pct": 100,
  "participation_rate": 80,
  "upside_cap_pct": 15,
  "coupon_pct_pa": 0,
  "tenor_years": 1,
  "cap_basis": "investor_return"
}
```

Fixed protected base = investment × protection_pct/100. Participation gain = investment × participation_rate/100 × max(underlying return ratio, 0). Default investor-return cap limits gain to investment × cap/100; this example returns 115000. Explicit `underlying_return` cap preserves the previous 112000 outcome. Optional coupon is added after the cap.

Response includes protected_principal, participation_gain, coupon, total_maturity_value, absolute_profit_loss, return_pct, underlying_return_pct, protection_active, cap_applied and assumptions.

## Shared product configuration

Scenario/backtest/service requests contain `product_type` and exactly one matching `eln_config`, `dcd_config` or `cpn_config` with the corresponding payoff request above. No unmatched configuration objects.

### POST /api/scenarios/simulate

Shared configuration plus optional `custom_scenarios` (1–301 percentage shocks). Default shocks: -50, -40, -30, -20, -10, 0, 10, 20, 30. Minimum -100 for equities; DCD requires greater than -100 to keep FX positive.

Each result: scenario_shock_pct, initial_price, underlying_final_level, underlying_return_pct, principal_repayment, coupon_earned, participation_gain, maturity_value, profit_loss, return_pct, value_currency, explanation, and nullable barrier/strike/conversion/protection/cap event flags. DCD additionally includes settlement_principal and repayment_currency. Common DCD financial values are always in deposit currency.

Daily scenarios explicitly assume a monotonic path between endpoints; they cannot infer earlier barrier breaches. Historical paths are evaluated separately.

### POST /api/backtest/run

Shared configuration plus ticker, optional start_date/end_date. ELN/CPN accept verified Yahoo stock/index/ETF symbols. DCD accepts supported Yahoo currency pairs with matching currency direction. ELN/CPN config includes investment_currency (INR default for older clients), used for scenario/backtest monetary outputs.

Tenor uses ceil(years × 252) intervals and one additional observation. Every rolling window uses its own initial/final levels and in-window path only. DCD strike is rebased to preserve configured strike/initial ratio. No future-window observations enter an earlier result.

Response: windows, metrics, data_source, data_as_of, ticker, product_type, value_currency, assumptions. Metrics: total_windows, average_return, median_return, best_return, worst_return, loss_frequency_pct, win_frequency_pct, zero_return_frequency_pct, nullable barrier counts/frequency and conversion_frequency_pct. All return metrics are percentages despite retained legacy names. Overlapping-window frequencies are descriptive, not predicted probabilities.

### GET /api/market-data/catalog

Starting suggestions, not the complete symbol universe. Entries: ticker, label, currency, kind and (FX only) deposit/alternate currency direction.

### GET /api/market-data/search?q=Reliance&kind=equity

kind is equity or fx. Returns results[{ticker,label,kind,exchange}] and nullable warning. Empty query returns starting suggestions. Nonempty queries call yfinance Search (up to 30 provider matches), filter supported asset classes, and cache for the current hour. Metadata/history verification occurs on selection; a search hit can still have unsupported currency or unavailable history. Failed remote searches return SEARCH_UNAVAILABLE (503), or explicit warning when matching catalog suggestions are available. Query maximum 80 characters. Symbol metadata is resolved dynamically, including Yahoo's Mapping-based lazy metadata.

### POST /api/products/validate

Accepts ProductTemplate: name, product_type, ticker, currency and exactly one of eln_terms/dcd_terms/cpn_terms. Terms include duration, coupon and product-specific contractual fields, never customer identifiers, investment amounts or initial/final prices. Returns normalized template and instrument. Name is trimmed and nonempty. The browser enforces unique names within its session. ELN/CPN currency must equal underlying currency; DCD currency equals deposit currency.

### POST /api/products/prepare

Accepts {template: ProductTemplate, investment_amount: positive number}. Revalidates instrument/currency, loads available reference prices, and returns {configuration: SimulationRequest, market: MarketHistory}. Initial and final prices initially match (flat scenario); ELN receives a flat assumed observation path. All saved terms are preserved, including DCD's absolute conversion strike. Products are not persisted on the server. The browser stores templates separately from prepared per-customer configurations and immutable assessment snapshots.

### Simplified customer capture

The UI asks six main questions: name, risk appetite, objective, horizon, loss tolerance and liquidity deadline. Client IDs are generated automatically, and the investment amount is added at product use. Total portfolio/currency/exposures are optional supporting inputs. ClientProfile adds exposure_details_provided (default true for API compatibility); the UI explicitly sends false if any holdings detail is missing. This always yields incomplete concentration assessment, never assumed zero holdings. All provided amounts still undergo portfolio consistency checks.

### GET /api/market-data/history?ticker=^NSEI&period=10y

Periods: 1mo, 1y, 5y, 10y. Returns an object (replaces the old undocumented bare-list response): ticker, source, as_of, fetched_at, count, latest_price, currency, warnings, prices[{date, close}], instrument. Instrument carries the verified type/currency and optional FX direction. Bundled NIFTY snapshot is labeled unverified. No synthesized OHLC fields, volumes or fallback prices.

## Suitability

### POST /api/suitability/check

Low-level request: `client` plus `product_risk`. Trusted integrations must provide truthful externally derived risk attributes; the preferred integrated route below derives them itself.

Client: client_id, optional client_name, portfolio_currency (INR default), risk_appetite (CONSERVATIVE/MODERATE/AGGRESSIVE), investment_horizon_months, max_acceptable_loss_pct, total_portfolio_value, proposed_investment_amount, existing_underlying_exposure, existing_issuer_exposure, existing_structured_product_exposure, liquidity_requirement_months, investment_objective (INCOME/GROWTH/CAPITAL_PRESERVATION). Exposures are currency amounts, not percentages. Each exposure plus proposed investment must fit the portfolio. Missing optional assessment values cause incomplete review, not a pass.

Risk: product_type, product_reference, tenor_years, underlying_asset, issuer, principal_protection_pct, max_contractual_loss_pct, historical_worst_loss_pct, coupon_pct_pa, upside_participation, early_exit_available, currency_conversion_risk, risk_scope.

Response: assessment_id, client_reference, product_reference, timestamp, completeness (COMPLETE/INCOMPLETE), overall_status (suitable/suitable_with_warnings/review_required), checks, rule_set_version, warnings. Legacy `dimensions` is retained and can contain INSUFFICIENT_DATA; canonical `checks` always uses PASS/WARNING/MISMATCH.

Each check: type, status, client_value, product_value, reason_code, reason. Missing data becomes WARNING with MISSING_<DIMENSION> reason and overall review_required. Any mismatch requires review.

Policy 1.1.0:
- Appetite maps conservative→LOW, moderate→LOW/MEDIUM, aggressive→any. Protected CPN LOW refers only to modeled market payoff risk.
- Product tenor must fit investment horizon.
- Maximum of contractual and observed historical loss must fit tolerance.
- Largest underlying/issuer/structured-product exposure bucket after investment: ≤20% PASS, >20–30% WARNING, >30% MISMATCH. Buckets overlap and are never summed.
- Liquidity deadline must fit tenor unless early exit is available.
- Preservation requires 100% protected base; income requires a positive coupon; growth requires positive upside participation.

Mismatch codes: RISK_EXCEEDS_APPETITE, TENOR_EXCEEDS_HORIZON, LOSS_EXCEEDS_TOLERANCE, CONCENTRATION_EXCEEDS_LIMIT, LIQUIDITY_MISMATCH, OBJECTIVE_MISMATCH. Concentration warning: CONCENTRATION_WARNING. Pass: <DIMENSION>_MATCH.

### POST /api/simulation/run

Shared configuration + ticker + include_history (default true). Returns payoff, scenarios, curve, backtest, product_risk and historical_error. A market/history failure preserves valid payoff/scenario outputs with backtest=null and explicit historical_error. Contract validation still returns 422.

### POST /api/suitability/evaluate

Same service request plus client. Recomputes product risk on the server and returns assessment, product_risk, historical_error. Client investment amount and currency must match configured investment. Historical failure is explicit; contractual market-loss bounds remain available. Issuer default is outside those bounds and is disclosed.

## Compatibility / migration

The old ELN /payoff, /underlyings and /prices routes remain deprecated. Existing Python module names remain importable. Financial changes and their justifications are recorded in FOUNDATION_REVIEW.md; phase-specific documentation is historical and superseded by this contract.
