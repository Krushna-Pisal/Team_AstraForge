# Engineering handoff

## Completed

RM simplification adds a session-only product library and six-input customer form. ProductConfiguration now saves customer-independent terms through /api/products/validate; Investment applies an amount through /api/products/prepare, refreshing available reference data. Products stay across New customer and refresh; saved assessments are immutable snapshots. Backend products.py owns typed templates and configuration preparation. UnderlyingSearch calls /api/market-data/search; phase3_market_data verifies Yahoo metadata dynamically (Mapping, not only dict). NIFTY retains its explicitly unverified bundled snapshot. Supported non-INR equity currency flows through scenarios and backtests. No persistent product database is introduced.

Missing optional portfolio/holdings details explicitly mark concentration incomplete. exposure_details_provided defaults true only for old API compatibility; the new UI sends false unless all holdings fields are supplied. Product and portfolio currencies must match; no automatic FX translation. The original PS was not available: the six visible customer questions were selected from the existing suitability checks, not claimed to be a verified PS minimum.

The existing React/FastAPI architecture is retained. Shared strict schemas, error envelopes, pure payoff functions and service orchestration provide a stable boundary. All product flows use actual backend data; fake dashboard/history/results values have been replaced with real state or honest empty states.

See FOUNDATION_REVIEW.md for the pre-change financial conflict review. The CPN default cap correction and historical observation-count correction are intentional. Two ELN formulas remain explicitly distinct; confirm an issuer's term sheet before selecting either.

## Agent readiness to begin development

| Component | Status | Boundary / limitation |
|---|---|---|
| Scenario Agent | READY | Validated /api/scenarios/simulate and payoff endpoints; explain assumptions without recalculating values. |
| Historical Analysis Agent | READY | /api/backtest/run and typed market history; must surface unverified snapshot provenance, provider failures and overlapping-window assumptions. |
| Suitability Explanation Agent | READY | Canonical checks/reason codes and backend-derived /api/suitability/evaluate; explanations must never override rule status. |
| RM Copilot | READY | Central services and shared workflow state permit a separate panel; production authentication, durable persistence and institution-approved policy are future work. |

READY means the software foundations support starting implementation. It does not mean any agent exists or that the application is approved for production financial advice.

## Two-developer continuation

Developer A: add backend tool adapters around services and typed contracts, provider/persistence interfaces and deterministic fixtures. Keep engine rules isolated and regression-tested.

Developer B: add a Copilot panel next to the layout Outlet, consume service JSON using lib/api.js, and extend assessment state with explanation-only data. Do not duplicate financial calculations in JavaScript or an LLM.

Coordinate API changes through OpenAPI snapshots, API_CONTRACTS.md and test updates. Use a new API version for breaking contract changes; do not repurpose percentage/currency meanings.

## Verification commands

- Backend: .venv/Scripts/python.exe -m pytest -q
- UI checks: npm.cmd run lint; npm.cmd run build (from frontend)
- Browser workflow: npm.cmd run test:e2e (installed Microsoft Edge)
- Supervisor: run.cmd --skip-install --smoke
- Git Bash supervisor: bash run.sh --skip-install --smoke
- Export contract: .venv/Scripts/python.exe scripts/export_schema.py

Tests cover exact boundaries, both ELN variants, coupon tenors, DCD quote/settlement/currency validation, both CPN cap bases, full-path historical barriers, no future-window leakage, source validation, all six suitability checks, API errors and all product service flows. Browser tests include session restore, API unavailable, invalid barrier, edited-client invalidation and mobile layout.

## Remaining limitations

- Unverified provenance of the supplied NIFTY CSV; never labeled live or guaranteed authentic. FX availability depends on external Yahoo service.
- Financial templates are illustrative; both ELN variants and partial CPN protected-base semantics need term-sheet confirmation for real products.
- 252 trading-interval tenor approximation; closing prices only; no credit default, fees, taxes or early-sale valuation.
- Browser session history and existing bounded in-memory audit adapter are not a durable audit system.
- No production auth, database, AI agents, Monte Carlo, comparison, PDF reports, extraction or monitoring.
- Legacy phase docs and unused standalone UI components are historical references. Core interfaces are documented in API_CONTRACTS.md and OpenAPI.
- TestClient emits an upstream Starlette/httpx deprecation warning; tests still pass. Migrate that test dependency when updating the pinned stack.
