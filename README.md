# Team_AstraForge

**AstraForgers** — Hackathon Team

**Team Members:** Vishvesh · Aditya · Krishna · Pratik

---

# Suitability-Aware Payoff Simulator for Structured Investment Products
### Phase 0 — Thin End-to-End Slice (ELN only)

A full-stack web application for simulating and visualising the payoff of **Equity-Linked Notes (ELN)** on the NIFTY 50 index. Built for a hackathon; designed to be extended with suitability, backtest, and report modules in later phases.

---

## Stack

| Layer    | Technology |
|----------|-----------|
| Backend  | Python 3.11+, FastAPI, Pydantic v2, pandas, uvicorn |
| Frontend | React 18, Vite, Recharts, plain CSS |
| Data     | Cached CSV — 10 years of NIFTY 50 daily closes |

---

## Project Structure

```
Team_AstraForge/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          ← FastAPI app (CORS for localhost:5173)
│   │   ├── models.py        ← Pydantic request/response models
│   │   ├── market_data.py   ← CSV loader (no yfinance at runtime)
│   │   └── payoff_engine.py ← Pure payoff logic (no I/O)
│   ├── data/
│   │   └── NIFTY50.csv      ← Cached daily closes (date, close)
│   ├── scripts/
│   │   └── fetch_data.py    ← One-off data download script
│   └── tests/
│       ├── __init__.py
│       └── test_payoff.py   ← 11 pytest test cases (all pass)
├── frontend/
│   ├── src/
│   │   ├── App.jsx                   ← 4-step stepper root
│   │   ├── index.css                 ← Design system (dark theme)
│   │   ├── main.jsx
│   │   └── components/
│   │       ├── ProductForm.jsx       ← Step 1 — ELN configuration
│   │       ├── PayoffChart.jsx       ← Step 2 — Recharts payoff curve
│   │       ├── ScenarioCards.jsx     ← Step 2 — Scenario outcome cards
│   │       └── Placeholder.jsx       ← Steps 3 & 4 — "Coming soon"
│   ├── index.html
│   └── package.json
└── README.md
```

---

## Quick Start

### 1. Fetch Market Data (one-off)

```powershell
# From the project root
python backend/scripts/fetch_data.py
```

This downloads ~10 years of NIFTY 50 (`^NSEI`) daily closes via yfinance and saves them to `backend/data/NIFTY50.csv`.  
If the download fails (network issue), it automatically generates clearly-labelled **synthetic fallback data** so the app still runs.

> **Note:** The app NEVER calls yfinance at runtime. All market data is read from the cached CSV.

---

### 2. Install Dependencies & Start the Backend

```powershell
# From the project root
pip install -r backend/requirements.txt

# Start backend server
cd backend
uvicorn app.main:app --reload
```

The API will be available at **http://localhost:8000**

- `GET  /health` — liveness check
- `GET  /underlyings` — `["NIFTY50"]`
- `GET  /prices/NIFTY50` — `{s0, start_date, end_date, count}`
- `POST /payoff` — compute payoff curve + scenarios
- Interactive docs: **http://localhost:8000/docs**

> **Port blocked?** Try `uvicorn app.main:app --reload --port 8001` and update `API` in `frontend/src/App.jsx` to match.

---

### 3. Start the Frontend

```powershell
# In a new terminal, from the project root
cd frontend
npm install   # first time only
npm run dev
```

App opens at **http://localhost:5173**

---

### 4. Run Tests

```powershell
cd backend
python -m pytest tests/test_payoff.py -v
```

All **11 tests** should pass in ~0.2 seconds.

---

## ELN Payoff Formula

```
r = S_T / S₀  (final price ratio)
coupon_amount = investment × coupon_pct_pa% × tenor_years  (always paid)

Barrier breached if:
  - daily monitoring:    min(S_t / S₀ over all trading days) ≤ barrier_pct / 100
  - maturity monitoring: r ≤ barrier_pct / 100

Redemption:
  - Not breached                      → investment
  - Breached AND r ≥ strike_pct / 100 → investment       (recovered at maturity)
  - Breached AND r < strike_pct / 100 → investment × (r / (strike_pct / 100))

final_amount = redemption + coupon_amount
```

---

## Product Inputs (ELN)

| Field               | Default    | Validation |
|---------------------|------------|------------|
| `underlying`        | NIFTY50    | Fixed |
| `investment`        | ₹10,00,000 | > 0 |
| `tenor_years`       | 1          | 0.5, 1, or 2 |
| `strike_pct`        | 90%        | 70–100; > barrier_pct |
| `barrier_pct`       | 70%        | 40–85; < strike_pct |
| `barrier_monitoring`| daily      | "daily" or "maturity" |
| `coupon_pct_pa`     | 12%        | 1–30 |

---

## Phases Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| **0 — Base**        | ✅ Done | ELN payoff engine, chart, scenarios |
| 1 — Suitability     | 🔜 Next | Client profile, risk scoring, KYC |
| 2 — Backtest        | 🔜 Next | Historical path simulation |
| 3 — Explanation     | 🔜 Next | NLP summary of payoff profile |
| 4 — Report          | 🔜 Next | PDF/HTML term sheet export |

---

## Disclaimer

> Past performance is not a guarantee. This tool is for **illustrative and educational purposes only** and does not constitute financial advice. Consult a qualified financial advisor before making investment decisions.
