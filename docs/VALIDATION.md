# Foundation validation — 3 October 2026

Validated locally on Windows with Python 3.13.0, Node 22.17.1, and Microsoft Edge.

| Check | Result |
|---|---|
| Backend unit/API suite | 152 passed; includes reusable-template and dynamic Yahoo-discovery regression tests |
| Frontend lint | Passed with no warnings |
| Frontend production build | Passed; analysis/chart code split into a separate bundle |
| Real-browser workflow suite | 8 passed |
| Windows launcher first installation path | Passed after in-place npm installation handling for Windows file locks |
| Windows launcher API/frontend/proxy smoke test | Passed |
| Executable run.sh through Git Bash | Passed syntax, executable-file and API/frontend/proxy smoke checks |
| Occupied default ports | Clear failure before dependency installation; user processes preserved |
| Interactive Ctrl+C | Both owned server ports released; Windows batch wrapper may then ask Terminate batch job (Y/N) |
| git diff --check | Passed |

## Financial/API coverage

Both ELN variants, no breach/touch/breach/recovery, exact strike, maturity vs daily path, extreme/sideways/positive outcomes, invalid terms, coupon tenors; DCD at/above/below conversion strikes, short tenor, currencies, translated totals and settlement legs; CPN flat/falling/rising, fixed protected base, participation and both cap interpretations.

Historical tests cover tenor interval count, exact start/end observations, full in-window path, no future-window leakage, date restrictions, insufficient history, future observation removal, all products and DCD strike rebasing. Provider failures are explicit and use no synthetic fallback.

Suitability tests cover all six dimensions, exact reason codes, PASS/WARNING/MISMATCH, overall status, missing inputs, portfolio consistency, currencies, each exposure bucket and avoiding double-counted overlapping exposure.

## Browser coverage

- Customer → save ELN product → enter amount → actual backend payoff/scenarios → historical metrics → six suitability checks → save → reload/reopen.
- Repeat for CPN.
- DCD uses an explicitly mocked provider-price/prepare fixture in the browser; product validation, simulation and suitability use real API requests. History can return real FX data or an explicit provider error. Deterministic DCD preparation, preserved strike and historical math are separately tested in backend tests.
- Invalid barrier and unreachable calculation API show understandable errors.
- Edited client invalidates prior simulation/suitability results.
- Same product reused for two customers with different amounts and unique IDs; saved assessments remain unchanged after editing product terms.
- Duplicate names, search keyboard selection, unavailable selected-symbol history, mismatched portfolio currency and excessive investment amounts are checked.
- Exactly six primary customer controls; optional portfolio section is collapsed. Mobile customer/library pages have no document overflow.
- Desktop product library and mobile customer screenshots visually reviewed.

Live provider smoke: Yahoo search for Reliance returned RELIANCE.NS and other matches; AAPL metadata resolved as USD equity; RELIANCE.NS monthly history returned 22 observations with INR quotes through 2026-09-30. This uncovered and fixed the installed yfinance version's Mapping-based (not plain dict) metadata wrapper. Remote availability and quotes can change; these checks are separate from deterministic mocked-provider regression tests.

Browser artifacts are in frontend/test-results and ignored by Git. No deployment, external messages or AI agents were created.

## Known validation limits

- One upstream Starlette/httpx TestClient deprecation warning remains; it does not fail tests.
- NIFTY snapshot source has not been independently verified. FX data availability is external.
- Unix launcher branch has not been executed here.
- This verifies software behavior under documented illustrative contracts, not issuer term-sheet or institutional regulatory approval.
