# Phase 4 Client Suitability Assessment Engine

## Overview
Phase 4 implements a deterministic, rule-based client suitability assessment engine designed to assist Relationship Managers (RMs) in evaluating if a structured investment product aligns with an individual client's financial profile.

**Disclaimer:** This prototype is a decision-support tool. It is not formal regulatory approval or a substitute for an institution's suitability policy. An RM must review the findings.

## Data Schemas

### Client Profile
The client profile captures the essential financial profile of the investor:
- `client_id` (str)
- `risk_appetite` (str): CONSERVATIVE, MODERATE, AGGRESSIVE
- `investment_horizon_months` (int)
- `max_acceptable_loss_pct` (float)
- `total_portfolio_value` (float)
- `existing_underlying_exposure` (float)
- `existing_issuer_exposure` (float)
- `existing_structured_product_exposure` (float)
- `proposed_investment_amount` (float)
- `liquidity_requirement_months` (int)

### Product Risk Characteristics
The product characteristics outline the risk profile of the structured product:
- `product_type` (str): ELN, DCD, CPN
- `product_reference` (str)
- `tenor_years` (float)
- `underlying_asset` (str)
- `issuer` (str)
- `principal_protection_pct` (float, optional)
- `max_contractual_loss_pct` (float, optional)
- `early_exit_available` (bool)
- `historical_worst_loss_pct` (float, optional): Injected from Phase 3 backtesting
- `currency_conversion_risk` (bool, for DCDs)

## Assessment Dimensions

The engine evaluates five independent dimensions:

1. **Risk Appetite Compatibility**:
   - Classifies CPN (100% protected) as LOW risk, CPN (<100%) as MEDIUM, and ELN/DCD as HIGH risk.
   - Maps client appetite to product risk. (e.g. Conservative client cannot buy High risk products).
2. **Investment Horizon Compatibility**:
   - Ensures the product tenor does not exceed the client's stated investment timeframe.
3. **Loss Tolerance Compatibility**:
   - Assesses the worst of the `max_contractual_loss_pct` and the `historical_worst_loss_pct`.
   - If the potential loss exceeds the client's `max_acceptable_loss_pct`, it triggers a MISMATCH.
4. **Portfolio Concentration**:
   - Aggregates the existing structured product exposure plus the proposed investment amount as a percentage of the total portfolio value.
   - Thresholds: <20% (PASS), 20-30% (WARNING), >30% (MISMATCH).
5. **Liquidity Compatibility**:
   - Evaluates if the product can be exited early (`early_exit_available`) or if the natural tenor matures before the client's liquidity requirement in months.

### Assessment Statuses
- **PASS**: The condition is safely met.
- **WARNING**: The condition exceeds safe bounds but is not a hard stop.
- **MISMATCH**: The condition violates the client's profile rules.
- **INSUFFICIENT_DATA**: Critical client or product data is missing to evaluate this rule.

## API Usage

**Endpoint:** `POST /api/suitability/check`

**Request Example:**
```json
{
  "client": {
    "client_id": "C-9901",
    "risk_appetite": "MODERATE",
    "investment_horizon_months": 12,
    "max_acceptable_loss_pct": 15.0,
    "total_portfolio_value": 50000000.0,
    "proposed_investment_amount": 1000000.0,
    "liquidity_requirement_months": 6
  },
  "product_risk": {
    "product_type": "ELN",
    "product_reference": "ELN-NIFTY-90-70",
    "tenor_years": 1.0,
    "underlying_asset": "NIFTY50",
    "issuer": "AstraForge Bank",
    "max_contractual_loss_pct": 100.0,
    "historical_worst_loss_pct": 18.4,
    "early_exit_available": false
  }
}
```

**Response Overview:**
Returns a complete suite of dimensional tests along with an `assessment_id` mapped to an audit trail. An overall numerical suitability score is explicitly omitted to force the Relationship Manager to review individual flags manually.

## Audit Trail

An in-memory persistence adapter (`AuditStore`) writes immutable logs containing:
- ID, Client Reference, Timestamp
- Rule version
- Original inputs mapping
- Explanations and status history

This serves as a compliance trail ensuring every finding can be traced backward through deterministic rules.
