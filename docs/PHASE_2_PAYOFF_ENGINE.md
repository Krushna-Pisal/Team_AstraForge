# Phase 2 Payoff Engine Architecture

## Overview
This document outlines the architecture and financial assumptions of the Phase 2 backend payoff engines. Three distinct models have been added to simulate single-path maturity outcomes for Structured Investment Products: ELN, DCD, and CPN.

These engines are stateless, deterministic, and separate from front-end logic or LLM interpretations, ensuring regulatory safety and numerical precision.

## 1. Equity-Linked Note (ELN)
**Assumptions & Logic:**
- Models a path-dependent reverse convertible logic structure.
- **Barrier breached**: True/False is passed dynamically as an input (simplifying path dependency for this specific engine).
- **Rule A (No Breach, Final >= Strike)**: Full principal + coupon.
- **Rule B (No Breach, Final < Strike)**: Full principal, NO coupon.
- **Rule C (Breach)**: Principal is reduced linearly based on the ratio of `final_price / initial_price`, and NO coupon is paid.
- **Limitation**: The coupon condition differs slightly from typical unconditional fixed-coupon ELNs to illustrate logic variance.

## 2. Dual Currency Deposit (DCD)
**Assumptions & Logic:**
- Models a currency-linked deposit structured for yield enhancement.
- Convention: 1 unit of deposit currency = X units of alternate currency.
- Evaluates the maturity FX rate against a given conversion strike using the configured `conversion_condition` (`FX_AT_OR_ABOVE_STRIKE` or `FX_AT_OR_BELOW_STRIKE`).
- **Rule (Conversion)**: Repays principal converted into the Alternate Currency at the predefined strike rate.
- **Rule (No Conversion)**: Repays principal in original Deposit Currency.
- **Coupon**: Always paid in the original Deposit Currency regardless of the principal conversion outcome.
- **Effective Return**: Translates the converted principal (if any) back into Deposit Currency equivalents at the final Maturity FX rate to determine the true P&L.
- **Limitation**: Actual cross-currency settlement dates and discrete compounding are omitted.

## 3. Capital-Protected Note (CPN)
**Assumptions & Logic:**
- Designed for risk-averse client simulation scenarios.
- **Protection**: A specific percentage (e.g., 100%) of the principal is assumed structurally protected at maturity.
- **Upside Participation**: If the underlying return is positive, the investor receives a proportional share defined by `participation_rate`.
- **Capping**: An optional `upside_cap_pct` limits the maximum participation gain.
- **Coupon**: An optional fixed coupon can be applied.
- **Limitation**: Issuer credit risk (default), early redemption penalties, and inflation effects are not modelled. Principal protection is conditional on the issuer's solvency.

## Validation & Testing
Input validation is handled firmly by `pydantic`. 
- `backend/tests/test_phase2_engines.py` comprehensively verifies outcome branches and input guards.
- Expected errors (like negative investments or invalid FX quotes) result in HTTP 422 Unprocessable Entity with specific field-level messages.
