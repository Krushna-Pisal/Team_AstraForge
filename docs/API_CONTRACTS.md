# Phase 2: Payoff Engines API Contracts

## 1. Equity-Linked Note (ELN)
**Endpoint:** `POST /api/payoff/eln`

**Request:**
```json
{
  "investment": 1000000,
  "initial_price": 100.0,
  "final_price": 110.0,
  "strike_pct": 90.0,
  "barrier_pct": 70.0,
  "coupon_pct_pa": 12.0,
  "tenor_years": 1.0,
  "barrier_breached": false,
  "barrier_monitoring": "daily",
  "settlement_method": "cash"
}
```

**Response:**
```json
{
  "initial_price": 100.0,
  "final_price": 110.0,
  "strike_price": 90.0,
  "barrier_price": 70.0,
  "barrier_breached": false,
  "principal_repayment": 1000000,
  "coupon_earned": 120000,
  "total_maturity_value": 1120000,
  "absolute_profit_loss": 120000,
  "return_pct": 12.0,
  "payoff_explanation": "Barrier never breached and final price >= strike. Full principal returned + coupon.",
  "contract_assumptions": "Illustrative ELN contract..."
}
```

## 2. Dual Currency Deposit (DCD)
**Endpoint:** `POST /api/payoff/dcd`

**Request:**
```json
{
  "deposit_currency": "INR",
  "alternate_currency": "USD",
  "deposit_amount": 1000000,
  "initial_fx_rate": 83.0,
  "conversion_strike_rate": 84.0,
  "maturity_fx_rate": 85.0,
  "coupon_rate": 5.0,
  "tenor_years": 1.0,
  "conversion_condition": "FX_AT_OR_ABOVE_STRIKE"
}
```

**Response:**
```json
{
  "deposit_currency": "INR",
  "alternate_currency": "USD",
  "maturity_fx_rate": 85.0,
  "conversion_strike": 84.0,
  "conversion_occurred": true,
  "principal_repayment_amount": 84000000.0,
  "repayment_currency": "USD",
  "coupon_amount": 50000,
  "coupon_currency": "INR",
  "total_maturity_repayment": 84000000.0,
  "effective_return_pct": 1.2,
  "explanation": "Conversion condition satisfied (FX_AT_OR_ABOVE_STRIKE). Principal converted to USD at strike 84.0.",
  "contract_assumptions": "Simplified DCD model..."
}
```

## 3. Capital-Protected Note (CPN)
**Endpoint:** `POST /api/payoff/cpn`

**Request:**
```json
{
  "investment": 1000000,
  "initial_price": 100.0,
  "final_price": 120.0,
  "protection_pct": 100.0,
  "participation_rate": 80.0,
  "upside_cap_pct": 15.0,
  "coupon_rate": 0.0,
  "tenor_years": 1.0
}
```

**Response:**
```json
{
  "investment_amount": 1000000,
  "initial_price": 100.0,
  "final_price": 120.0,
  "underlying_return": 0.20,
  "protected_principal": 1000000,
  "participation_gain": 150000,
  "coupon": 0.0,
  "total_maturity_value": 1150000,
  "absolute_profit_loss": 150000,
  "return_pct": 15.0,
  "explanation": "CPN Payoff. Protected principal: 100.0%. Underlying return: 20.00%. Participation gain earned based on participation rate. Upside cap was applied.",
  "contract_assumptions": "Simplified CPN model..."
}
```
