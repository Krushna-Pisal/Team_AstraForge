# AstraForge — structured product advisory foundation

A React/Vite and FastAPI application for deterministic ELN, DCD and CPN payoffs, hypothetical scenarios, historical backtesting and explainable client suitability.

## Start everything on Windows

From PowerShell, one command:

```powershell
cd D:\MindSpark\Team_AstraForge
.\run.cmd
```

Or from Git Bash on Windows:

```bash
./run.sh
# equivalently: bash run.sh
```

Windows PowerShell does not execute Bash scripts natively; `run.cmd` and `run.sh` delegate to the same Windows bootstrap and Python process supervisor. There is no permanent execution-policy change. Both servers run under the launcher; **Ctrl+C stops both**. Existing processes on occupied ports are never killed.

Stop any previously opened backend/frontend terminals before using the default ports. Windows may ask `Terminate batch job (Y/N)?` after Ctrl+C; enter Y. If native packages are already loaded by another server, the bootstrap uses an in-place npm install instead of clearing node_modules.

Prerequisites: Python **3.12+** (tested: 3.13), Node **22.12+** (tested: 22.17), npm. Python 3.11 is no longer sufficient for the pinned NumPy dependency. Git Bash is required only for the `.sh` entry point. On first run the launcher creates `.venv` if needed and installs Python/frontend dependencies. Dependency changes trigger installation again; network access is needed for installation. Subsequent runs reuse the environment.

- App: http://localhost:5173
- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

```powershell
.\run.cmd --check
.\run.cmd --skip-install
.\run.cmd --smoke --skip-install
.\run.cmd --backend-port 8001 --frontend-port 5174
```

The proxy follows the selected backend port automatically. The launcher is a local development utility, not a production deployment. Vite supports frontend hot reload; the backend automatically reloads changes under backend/app. Use --no-reload to disable backend watching. Restart the launcher after dependency or launcher changes. Startup also verifies the underlying-search endpoint through the frontend proxy.

On macOS/Linux: `bash run.sh` uses `python3` and the same supervisor. Windows launchers have been exercised; Unix execution is not tested in this workspace.

## Manual setup

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
cd frontend
npm.cmd ci
```

In separate terminals, from the repository root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload
```

```powershell
cd frontend
npm.cmd run dev
```

Using the environment's interpreter directly avoids PowerShell activation-policy issues. Use `npm.cmd` if PowerShell blocks `npm.ps1`. An optional `VITE_API_BASE_URL` overrides the same-origin development proxy; configure CORS separately if deploying to another origin.

## Completed foundation

### Simple RM workflow

1. Open **Saved products** to add an ELN, DCD or CPN. Give it a name, search the underlying, review its terms, and save it.
2. Choose **New customer** and answer six questions: name, risk level, goal, investment period, acceptable loss and when funds are needed. Portfolio totals and existing holdings are optional; leaving them out marks the holdings check incomplete.
3. Select **Use product**, enter this customer's investment amount, and view results and customer fit. The saved product never stores customer details or amounts.
4. For another customer, reuse the same saved product. Reference prices are requested again (provider cache may be up to one hour old); saved terms stay unchanged. DCD's absolute conversion strike is retained.

Products (up to 100) and assessments (up to 30) are kept in this tab's session, including page refreshes; there is no permanent product database. New customer clears the active customer/results but preserves products and assessment history. Editing a product does not rewrite saved assessments. Storage failures show a warning.

The original problem statement was not available, so these six main inputs follow the existing suitability engine, not a claimed exact PS mapping. Advanced product settings are collapsed but remain editable.

- All three existing payoff engines retained, validated and exposed through typed JSON APIs.
- ELN contract variants explicitly distinguish the two original financial rules.
- CPN cap interpretation fixed to the documented investor-return default; old underlying-return cap available explicitly.
- DCD exposes settlement legs and consistent deposit-currency total value/P&L.
- Scenarios, payoff chart data and historical windows use the same deterministic engine.
- Backtesting supports ELN, CPN and supported Yahoo DCD pairs, correct tenor observation count, full-path daily barriers, metrics and source provenance.
- Six suitability checks: risk appetite, horizon, loss tolerance, concentration, liquidity and objective. Canonical checks use PASS/WARNING/MISMATCH, stable reason codes and an overall status.
- Real client → configuration → market data → payoff/scenario/history → suitability → session history flow.
- Responsive dark advisory UI; contextual references, settlement details, accessible fields, error/retry states, reduced-motion support, chart markers and expandable reasons.
- Dependency manifest, one-command launcher, unit/API/browser tests and executable OpenAPI contract.

No LLM calculates payoffs, events, risk bounds or suitability. Agent implementations are intentionally absent.

## Architecture

```text
backend/app/
  domain.py                 Shared strict models and domain errors
  errors.py                 Uniform safe HTTP errors
  services.py               Integrated simulation / backend-derived suitability
  main.py                   API routes and OpenAPI
  phase2_models.py           Validated product contracts (compatibility module names)
  phase2_engines.py          Pure deterministic payoff functions
  phase3_sim_models.py       Shared scenario, historical and risk-metric schemas
  phase3_simulation.py       Scenario and historical engines
  phase3_market_data.py      Catalog, validation, data provider and provenance
  phase4_models.py           Client / risk / suitability schemas
  phase4_suitability.py      Deterministic rules and bounded in-memory audit adapter
  models.py, payoff_engine.py, market_data.py  Legacy ELN compatibility API
frontend/src/
  lib/api.js                Central request handling, timeout, error formatting
  state/AssessmentContext.jsx  Shared state, invalidation and session snapshots
  components/               Shared forms, charts, shell and UI states
  pages/                    Existing routes, now integrated with backend
scripts/dev.py              Cross-platform process supervisor
run.cmd / run.ps1 / run.sh   Entry points
```

Phase filenames are retained to preserve import compatibility. Extend `services.py` for future tools; never make agents call UI code. The unused original `ProductForm`, `Placeholder`, `StatCard` and template `App.css` remain compatibility leftovers and are not used by the active workflow.

## API contracts

See [API_CONTRACTS.md](docs/API_CONTRACTS.md), [financial decisions](docs/FOUNDATION_REVIEW.md) and [developer handoff](docs/HANDOFF.md). Interactive schemas are authoritative at `/docs` and `/openapi.json`; export a snapshot with:

```powershell
.\.venv\Scripts\python.exe scripts\export_schema.py
```

Core routes:

| Method | Path | Purpose |
|---|---|---|
| POST | /api/payoff/eln | ELN payoff |
| POST | /api/payoff/dcd | DCD payoff and settlement legs |
| POST | /api/payoff/cpn | CPN payoff |
| POST | /api/scenarios/simulate | Standard/custom shocks |
| POST | /api/backtest/run | Historical rolling windows |
| GET | /api/market-data/catalog | Starting suggestions and FX conventions |
| GET | /api/market-data/search | Search Yahoo stock/index/ETF/FX symbols |
| GET | /api/market-data/history | Typed observations with provenance |
| POST | /api/products/validate | Validate reusable product terms |
| POST | /api/products/prepare | Apply terms to a fresh customer amount/reference price |
| POST | /api/suitability/check | Low-level assessment with explicit product risk |
| POST | /api/simulation/run | Payoff, curve, scenarios, history and derived risk |
| POST | /api/suitability/evaluate | Client assessment with server-derived product risk |

Legacy `/payoff`, `/prices/NIFTY50` and `/underlyings` remain available and are deprecated.

## Validation

Latest local results: **152 backend tests and 8 browser tests passed; lint and production build passed**. See [VALIDATION.md](docs/VALIDATION.md) for scope and limitations.

```powershell
.\.venv\Scripts\python.exe -m pytest -q
cd frontend
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
```

Browser tests use installed Microsoft Edge on Windows and isolated ports 8012/5182. Set `PLAYWRIGHT_CHANNEL=chrome` for installed Chrome. ELN/CPN use real backend services; DCD uses an explicit provider-price/preparation fixture with real calculation/suitability APIs. Tests cover product reuse for multiple customers, persistence/reopen, invalid terms, API outage, keyboard search, currency checks, stale-result invalidation and mobile layout. Browser traces and screenshots are generated under `frontend/test-results/` and ignored by Git. Provider adapters and FX math are separately tested with fixed observations.

## Data and limitations

NIFTY uses the existing bundled CSV; its original provenance has not been independently verified, so every current API result labels it as an unverified snapshot. It is not a live quote. Other supported underlyings use Yahoo Finance via yfinance (hourly cache); provider outages are returned explicitly. Search retrieves matching symbols on demand, up to 30 provider results per query, rather than claiming to enumerate every Yahoo instrument. Stocks, indices, ETFs and currency pairs in the supported currencies are usable; crypto, futures, unsupported currencies and subunit quotes such as GBp are rejected. Product currency follows the underlying (DCD: first currency in the pair); no automatic conversion is applied. No synthetic fallback is generated. An explicit optional refresh is `python backend/scripts/fetch_data.py`; a failed refresh preserves the current file.

Historical tenor uses ceil(years × 252) trading intervals and one extra price. Dates are sorted, deduplicated and future observations removed. Windows overlap, closing observations miss intraday barrier touches, and results exclude taxes, fees and issuer default.

CPN protection is a fixed protected base in this illustrative contract, not a universal floor formula. ELN variants are not interchangeable. DCD rate means alternate currency units per deposit unit. Read the contract assumptions shown in the UI.

Suitability is an illustrative policy, not an approved institutional rule set. Its risk classification describes modeled market payoff only. Principal protection still depends on issuer solvency, as described by the [SEC investor bulletin](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-76).

Session history is limited to 30 records. Backend audit is bounded to 200 in-memory records and disappears on restart. No authentication, durable client database, production audit system or PDF reports are implemented. Client portfolio currency must match investment currency; automatic FX translation of portfolios is unsupported.

## Future work

AI agents / RM Copilot, Monte Carlo, product comparison, database and audit trail, report generation, term-sheet extraction, continuous monitoring, institutional policy configuration and production authentication. Discovery currently provides illustrative configurable templates, without recommendations or live offers.
