# AstraForge — Suitability-Aware Payoff Simulator
### What the Application Actually Does (Comprehensive Overview)

**Team AstraForge:** Vishvesh · Aditya · Krishna · Pratik  
**Current State:** Fully functional end-to-end platform (Phases 0–4 complete, 45 automated tests passing).

---

## 1. What Problem Does This Solve?

**Structured Investment Products (SIPs)**—such as Equity-Linked Notes (ELNs), Capital-Protected Notes (CPNs), and Dual-Currency Deposits (DCDs)—are complex, non-linear financial contracts. Historically, they have been treated as "black boxes" in retail and private wealth banking:
- Investors often misunderstand **downside barrier risk** (e.g. thinking a barrier protects capital permanently, even when breached).
- Advisory teams lack automated tools to stress-test products against **real historical market shocks**.
- **Regulatory suitability checks** are often manual, subjective, or incomplete, failing to account for an investor's pre-existing exposure to the underlying index or stock.

**This platform solves these problems** by providing private wealth relationship managers (RMs), compliance officers, and investors with a deterministic simulation, backtesting, and rule-based suitability evaluation tool.

---

## 2. End-to-End User Workflow

The platform operates through a seamless 4-step workflow:

```
[ Step 1: Product Config ] ──► [ Step 2: Client Profile ] ──► [ Step 3: Simulation & Payoff ] ──► [ Step 4: Suitability & Report ]
 (Choose ELN, CPN, or DCD)     (Load demo client or input)    (Dual-line chart & stress test)     (Rule matrix & audit report)
```

1. **Step 1 — Configure Product:**
   - Select product type: **Equity-Linked Note (ELN)**, **Capital-Protected Note (CPN)**, or **Dual-Currency Deposit (DCD)**.
   - Adjust parameters (tenor, strike %, barrier %, coupon rate, protection level, currency pairs).
   - Validation ensures financial validity (e.g. barrier must strictly be below strike).

2. **Step 2 — Client Profile Assessment:**
   - Input client financial parameters: risk appetite, investment horizon, loss tolerance, total portfolio value, and existing exposure.
   - **Quick Demo Feature:** A dropdown allows 1-click loading of realistic client personas (*Conservative Retiree*, *Balanced Professional*, *Aggressive Trader*, *Concentrated Holder*).

3. **Step 3 — Payoff Simulation & Backtesting:**
   - **Dual-Curve Payoff Visualization:** Graphically plots investor return against market return from -80% to +80%.
   - **Honest Daily Monitoring Display:** For daily monitored ELNs, the chart shows two distinct paths:
     - **Blue Solid Line:** Payoff if the barrier is never touched.
     - **Red Dashed Line:** Payoff if the barrier was breached at any point during the term.
   - **Scenario Stress Testing:** Evaluates market shocks (-50% to +50%) with exact monetary P&L in Indian Rupees (₹).
   - **Historical Backtesting:** Evaluates rolling windows over 10 years of NIFTY 50 daily market data to determine historical breach frequency and win rates.

4. **Step 4 — Suitability Evaluation & Audit Trail:**
   - Deterministic rules evaluate client risk appetite, time horizon, portfolio concentration, liquidity, and loss tolerance.
   - Displays an **Overall Suitability Verdict**: `SUITABLE`, `SUITABLE_WITH_CAUTION`, or `NOT_SUITABLE`.
   - Transparently displays the **Three Loss Measures** and identifies which one drove the decision.
   - If `NOT_SUITABLE`, an RM exception override can be logged with mandatory justification.
   - Generates an official, print-friendly **Compliance Audit Report** appended to local audit storage.

---

## 3. Mathematical Models & Supported Products

### A. Equity-Linked Note (ELN)
- **Concept:** Yield-enhancement debt instrument paying an above-market coupon in exchange for taking downside equity risk below a barrier.
- **Payoff Logic:**
  - **Coupon:** Always paid regardless of index performance:
    $$\text{Coupon} = \text{Investment} \times \text{Coupon Rate (p.a.)} \times \text{Tenor}$$
  - **Redemption:**
    - If barrier is **never breached**: 100% principal is returned.
    - If barrier is **breached**, but final price recovers above strike: 100% principal is returned.
    - If barrier is **breached** and final price is below strike:
      $$\text{Redemption} = \text{Investment} \times \frac{S_T / S_0}{\text{Strike Level}}$$
  - **Monitoring Modes:**
    - **Daily Monitoring:** Checked against every trading day minimum.
    - **Maturity Monitoring:** Checked only on final valuation date.

### B. Capital-Protected Note (CPN)
- **Concept:** Defensive structured note providing 80% to 100% principal guarantee plus leveraged participation in equity index upside.
- **Payoff Logic:**
  - $\text{Protected Principal} = \text{Investment} \times \text{Protection Level } (e.g. 100\%)$
  - If underlying return $r > 0$:
    $$\text{Gain} = \min\left(\text{Investment} \times \text{Participation Rate} \times r, \; \text{Upside Cap}\right)$$
  - Total maturity value = Protected Principal + Participation Gain + Fixed Coupon.

### C. Dual-Currency Deposit (DCD)
- **Concept:** High-yield currency deposit where principal may be converted into an alternate currency if fixing rates cross a pre-agreed strike.
- **Data Honesty Design:** Labeled in UI and API as *"Scenario analysis only: no historical backtest"*, preventing speculative FX backtesting without real tick histories.

---

## 4. Key Engines Implemented

### 1. Portfolio Concentration Engine (PS Meaning)
Rather than solely evaluating product size, the system evaluates the client's **total aggregated exposure** to the underlying asset:
- $\text{Product Weight \%} = \frac{\text{Investment}}{\text{Total Portfolio Value}} \times 100$
- $\text{Combined Exposure \%} = \text{Existing Underlying Exposure \%} + \text{Product Weight \%}$
- **Rule Thresholds:**
  - Combined exposure $\le 20\% \rightarrow$ **MATCH**
  - $20\% < \text{Combined} \le 30\% \rightarrow$ **REVIEW**
  - Combined exposure $> 30\% \rightarrow$ **MISMATCH**
- Also tracks product size separately against a $15\%\text{--}25\%$ threshold.

### 2. Three-Measure Loss Tolerance Engine
To prevent relying solely on theoretical estimates, the system computes **three distinct loss metrics**:
1. **Max Loss at Barrier:** Theoretical loss when final price ratio touches the barrier.
2. **Worst Historical Loss:** Worst loss experienced in any rolling historical window over 10 years of NIFTY 50 data.
3. **5th Percentile Loss (p5):** The 95% confidence historical Value-at-Risk (VaR) equivalent.
- **Driving Factor:** The **strictest (highest)** of these three measures drives the suitability check against the client's stated tolerance:
  - Strictest loss $\le \text{Tolerance} \rightarrow$ **MATCH**
  - Strictest loss $\le 1.5 \times \text{Tolerance} \rightarrow$ **REVIEW** ($1.5\times$ buffer)
  - Strictest loss $> 1.5 \times \text{Tolerance} \rightarrow$ **MISMATCH**

### 3. Overall Verdict Engine
- **Hard Factors:** `RISK_APPETITE`, `LOSS_TOLERANCE`, `PORTFOLIO_CONCENTRATION`, `INVESTMENT_HORIZON`.
- **Verdict Rules:**
  - `NOT_SUITABLE`: Triggered if **any** hard factor is `MISMATCH`.
  - `SUITABLE_WITH_CAUTION`: Triggered if no `MISMATCH` exists, but at least one factor is in `REVIEW`.
  - `SUITABLE`: All factors are in `MATCH`.

### 4. Audit Trail & RM Override
- Every assessment creates an audit record saved to [`backend/data/audit_log.jsonl`](file:///d:/Team_AstraForge/backend/data/audit_log.jsonl) with a unique UUID, timestamp, inputs, thresholds, and per-factor outcomes.
- If a product is `NOT_SUITABLE`, an RM can apply an exception override **only by providing a formal written justification (minimum 15 characters)**.
- Full assessment histories can be reviewed at `/history` or viewed as printable audit sheets at `/reports`.

---

## 5. Mock Demo Personas (`GET /api/clients`)

The system includes 4 pre-configured client templates to demonstrate divergent regulatory outcomes:

| Client Persona | Risk Appetite | Horizon | Loss Tolerance | Existing Exposure | Expected Verdict for 70% Barrier ELN |
|---|---|---|---|---|---|
| **Conservative Retiree** | Conservative | 12m | 5% | 10% | ❌ **NOT SUITABLE** (Risk & loss tolerance mismatch) |
| **Balanced Professional** | Moderate | 24m | 15% | 15% | ⚠️ **SUITABLE WITH CAUTION** (Within 1.5x review buffer) |
| **Aggressive Trader** | Aggressive | 36m | 40% | 20% |  **SUITABLE** (High appetite & capacity) |
| **Concentrated Holder** | Moderate | 24m | 20% | 35% | ❌ **NOT SUITABLE** (Exceeds 30% concentration limit) |

---

## 6. Project Architecture & Live Endpoints

### Technology Stack
- **Backend:** Python 3.14 / 3.11+, FastAPI, Pydantic v2, Pandas, NumPy, Pytest, Uvicorn
- **Frontend:** React 19, Vite 8, React Router v7, Tailwind CSS v4, Recharts, Lucide Icons
- **Data Source:** Cached 10-year daily closes for NIFTY 50 (`^NSEI`, 2466 trading days) with automatic fallback generator

### Complete API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `GET` | `/underlyings` | Supported indices (`["NIFTY50"]`) |
| `GET` | `/prices/{underlying}` | Reference price ($S_0$), date ranges, data count |
| `POST` | `/payoff` | Generates ELN dual curves & scenario stress test table |
| `POST` | `/api/payoff/eln` | Discrete ELN valuation |
| `POST` | `/api/payoff/cpn` | Discrete CPN valuation |
| `POST` | `/api/payoff/dcd` | Discrete DCD valuation & FX conversion |
| `POST` | `/api/scenarios/simulate` | Multi-scenario hypothetical shock evaluation |
| `POST` | `/api/backtest/run` | 10-year rolling-window historical backtest |
| `POST` | `/api/suitability/check` | Rule-based investor suitability check & audit logger |
| `GET` | `/api/clients` | Returns 4 demo client profiles |
| `GET` | `/api/audit` | Retrieves all logged suitability assessment records |
| `GET` | `/api/audit/{id}` | Retrieves a single assessment record by ID |

---

## 7. Current System Status

- **Automated Tests:** **45 / 45 tests passing** in `backend/tests/` (covering payoff math, validation rules, multi-curve rendering, concentration thresholds, loss tolerance driving measures, overall verdicts, and audit persistence).
- **Backend Service:** Running live on `http://localhost:8000` (FastAPI + Swagger docs at `/docs`).
- **Frontend Service:** Running live on `http://localhost:5173` (React 19 + Vite).
- **Git Branch:** Clean working state on branch [`mark_42`](https://github.com/Krushna-Pisal/Team_AstraForge/tree/mark_42), synchronized with remote.
