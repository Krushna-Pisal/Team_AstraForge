# Phase 3 Market Data and Simulation Architecture

## Overview
Phase 3 expands the backend by layering market data retrieval, scenario analysis, and historical rolling-window backtesting on top of the Phase 2 Payoff Engines. These enhancements allow Relationship Managers (RMs) to simulate structured product behavior using hypothetical market shocks and real historical paths, fulfilling the requirement for transparent, mathematically grounded decision-support tools.

## 1. Market Data Retrieval (`yfinance`)
**Source:** Historical market data is sourced dynamically from `yfinance` using the `^NSEI` (NIFTY 50) ticker.
**Caching:** Fetched data is cached via `functools.lru_cache` within the application memory to prevent excessive API calls and latency during successive backtest simulations.
**Data Cleaning:**
- Missing `Open`/`High`/`Low` values default to `Close`.
- Duplicate dates are removed.
- Data is strictly sorted chronologically.

**Endpoint:** `GET /api/market-data/history`

## 2. Hypothetical Scenario Simulation
**Logic:** Allows users to pass arbitrary product configurations to generate precise maturity values under fixed final-price shocks (e.g., -50%, -40%, ..., +40%). 
**Barrier Assumption:** For path-dependent structures (like daily monitored ELNs) running in hypothetical point-in-time scenarios, we explicitly proxy barrier breach status by examining if the hypothetical *final* price is below the barrier level. This limitation is explicitly documented in the API response payload to prevent misleading risk profiles.

**Endpoint:** `POST /api/scenarios/simulate`

## 3. Historical Rolling-Window Backtesting
**Methodology:**
1. A sliding window of size `tenor_years * 252` trading days is applied across the entire historical price array.
2. For each window, the true initial, final, and minimum observed prices are extracted.
3. The true daily price path accurately determines daily barrier breaches, resolving the limitations of the point-in-time hypothetical scenario above.
4. The exact conditions are fed into the Phase 2 ELN calculation engine.
5. The performance is aggregated into a series of transparent risk metrics.

**Risk Metrics Generated:**
- Average, Median, Best, and Worst Return.
- Loss Frequency % and Win Frequency %.
- Barrier Breach Count and Frequency %.

**Limitation & Disclaimer:**
As explicitly documented in the API payload, these metrics summarize historical performance and do NOT guarantee future outcomes, nor do they represent a statistical probability of future loss.

**Endpoint:** `POST /api/backtest/run`

## 4. API Contracts

### Scenario Analysis
**Request (`POST /api/scenarios/simulate`):**
```json
{
  "product_type": "ELN",
  "eln_config": { ... },
  "custom_scenarios": [-50, -20, 0, 20, 50]
}
```

### Historical Backtesting
**Request (`POST /api/backtest/run`):**
```json
{
  "product_type": "ELN",
  "ticker": "^NSEI",
  "eln_config": { ... }
}
```

## 5. Result Classifications
To maintain compliance with transparency requirements, the frontend must clearly delineate:
* **OBSERVED DATA:** Live pricing or historical raw paths.
* **HYPOTHETICAL SCENARIO:** Point-in-time "what if" stress tests.
* **HISTORICAL BACKTEST:** Actual historical outcomes of the defined ruleset.
