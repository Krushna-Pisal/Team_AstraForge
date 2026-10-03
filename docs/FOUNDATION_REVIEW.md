# Foundation review and financial rule decisions

Recorded before implementation. This is a software contract, not an issuer term sheet.

## Findings

- Two working ELN engines disagree: the original `/payoff` always pays coupon and uses strike-normalized redemption with recovery; phase 2 pays a contingent coupon and uses initial-price redemption after breach (even after recovery). Neither can silently replace the other.
- Phase 2 trusts a caller's barrier flag and ignores monitoring and settlement. Daily observations need an explicit path or an explicit externally observed event. Physical settlement has no implemented share-delivery model.
- CPN code caps the underlying return before participation, but the published API example and failing scenario test cap the investor participation gain. Partial protection is a fixed protected base, not a floor on an otherwise fully returned principal.
- DCD uses alternate units per one deposit unit; the original INR/USD example of 83 is inverted. Coupon stays in deposit currency. The mixed-currency total and zero scenario P/L are misleading.
- Backtests use 252 observations for 252 intervals (off by one), only implement ELN, and lose source provenance. Daily barrier must use every observation within each window.
- Suitability lacks objective checks, reason codes and overall status. Missing inputs must require review. Existing LOW classification for a protected CPN only describes modeled market payoff risk; it excludes issuer/default/liquidity risk.
- Frontend forms lose state. Dashboard/history/results contain fabricated values; suitability uses a hardcoded client. Several links/buttons do nothing.

## Explicit decisions

1. Preserve both ELN contracts through `contract_variant`: `phase2_contingent` (existing phase 2 default) and `unconditional_strike` (original engine, selected explicitly by the frontend). Show assumptions in the UI. They are illustrative templates requiring term-sheet confirmation before production use.
2. Maturity monitoring derives breach only at maturity. Daily monitoring uses a complete `observed_prices` path when supplied; otherwise an explicit observed `barrier_breached` flag is required. An end price touching/below barrier always breaches. Scenarios explicitly use a monotonic two-endpoint path, not an inferred historical path. Cash settlement only; reject unsupported physical settlement.
3. CPN default `cap_basis=investor_return` matches the existing documented example/test (80% participation, +20% underlying, 15% cap => +15%). `cap_basis=underlying_return` preserves the previous +12% behavior explicitly. Preserve fixed protected-base behavior for partial protection and disclose it, including flat-market principal loss.
4. DCD preserves conversion and coupon rules. Add explicit cash-flow legs and common totals/P&L in deposit currency; legacy settlement amounts are retained with clear currency labels. Supported currencies are a bounded catalog. No inverse FX quotation guesses.
5. Historical tenor is explicitly `ceil(years * 252)` trading intervals, requiring one extra observation. Coupon uses contractual tenor. This is a trading-day approximation, not calendar maturity. Overlapping windows are not independent; fees, taxes, defaults and intraday breaches are excluded. FX uses 252 intervals consistently and disclosed.
6. Retain existing suitability appetite/concentration/liquidity policies, with reason codes. Add a documented illustrative objective policy: preservation needs 100% protection, growth needs upside participation, income needs a positive coupon. Unavailable inputs produce WARNING plus incomplete/review-required, never a silent pass. These are demo policy rules requiring institutional approval before production.
7. Contractual modeled loss and issuer loss are distinct. Computed risk inputs describe market payoff only; issuer default can lose all capital. Historical loss never bounds contractual risk. Backend derives product risk for the integrated flow, rather than trusting browser-computed financial values.
8. NIFTY uses the supplied CSV with provenance labeled as a bundled snapshot (not verified live quotes). FX history uses Yahoo Finance via yfinance; failures remain visible and do not generate synthetic observations. No fabricated fallback data.
9. History remains bounded, browser-session storage. Existing backend audit storage remains in-memory and bounded. Durable database/audit and PDF reporting are explicitly future work.
10. The concentration check uses the largest post-investment underlying, issuer or structured-product bucket with the existing 20%/30% thresholds. Overlapping buckets are not summed. This makes previously accepted but unused exposure inputs meaningful without inventing new thresholds.

## Incremental architecture

Keep existing phase modules/imports as compatibility surfaces. Add shared strict domain models, error handlers and a service layer for orchestration. Stable `/api` contracts plus OpenAPI are the future tool boundary. Preserve the legacy `/payoff`, `/prices` and `/underlyings` routes, marked deprecated. No AI calculations or advanced agents are introduced.
