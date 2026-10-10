from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd

from app.domain import DomainError
from app.phase2_models import (
    ElnPayoffRequest,
    CpnPayoffRequest,
    DcdPayoffRequest,
)
from app.phase2_engines import (
    calculate_eln_payoff,
    calculate_cpn_payoff,
    calculate_dcd_payoff,
)
from app.options.schemas import OptionType, PositionType
from app.options.payoff import calculate_option_payoff_single, calculate_break_even
from app.phase3_market_data import (
    get_historical_market_data,
    clean_prices,
    get_instrument,
    validate_ticker,
)
from app.advanced_simulation.schemas import (
    ProductSimulationSpec,
    ShockOutcomeItem,
    ShockComparisonRow,
    ProductBestWorst,
    MarketShockRequest,
    MarketShockResponse,
    ThresholdItem,
    SensitivityPoint,
    SensitivityRequest,
    SensitivityResponse,
    HistoricalScenarioWindowItem,
    HistoricalScenarioRequest,
    HistoricalScenarioResponse,
)

DEFAULT_SHOCKS = [-40.0, -20.0, -10.0, 0.0, 10.0, 20.0]


def evaluate_single_product_at_price(
    prod: ProductSimulationSpec,
    final_price: float,
    observed_path: Optional[List[float]] = None,
) -> ShockOutcomeItem:
    """Evaluate a product spec at a given final price using its canonical engine."""
    p_type = prod.product_type.upper()
    initial = prod.initial_fx_rate if p_type == "DCD" else prod.initial_price
    path = observed_path if observed_path is not None else [initial, final_price]

    if p_type == "ELN":
        strike_pct = prod.strike_pct or 90.0
        barrier_pct = prod.barrier_pct or 70.0
        variant = "unconditional_strike" if prod.contract_variant == "unconditional_strike" else "phase2_contingent"
        b_mon = "daily" if prod.barrier_monitoring == "daily" and len(path) > 2 else "maturity"
        req = ElnPayoffRequest(
            initial_price=initial,
            final_price=final_price,
            strike_pct=strike_pct,
            barrier_pct=barrier_pct,
            coupon_pct_pa=prod.coupon_pct_pa,
            tenor_years=prod.tenor_years,
            investment=prod.investment,
            investment_currency=prod.investment_currency,
            barrier_monitoring=b_mon,
            contract_variant=variant,
            observed_prices=path if len(path) >= 2 else None,
        )
        res = calculate_eln_payoff(req)
        return ShockOutcomeItem(
            product_id=prod.product_id,
            product_name=prod.product_name,
            product_type=p_type,
            final_underlying_price=round(final_price, 2),
            gross_payoff=round(res.total_maturity_value, 2),
            net_profit_loss=round(res.absolute_profit_loss, 2),
            return_pct=round(res.return_pct, 2),
            explanation=res.payoff_explanation,
            is_protected_or_barrier_safe=not res.barrier_breached,
        )

    elif p_type == "CPN":
        req = CpnPayoffRequest(
            initial_price=initial,
            final_price=final_price,
            protection_pct=prod.protection_pct if prod.protection_pct is not None else 100.0,
            participation_rate=prod.participation_pct if prod.participation_pct is not None else 100.0,
            upside_cap_pct=prod.cap_pct,
            coupon_pct_pa=prod.coupon_pct_pa,
            tenor_years=prod.tenor_years,
            investment=prod.investment,
            investment_currency=prod.investment_currency,
        )
        res = calculate_cpn_payoff(req)

        return ShockOutcomeItem(
            product_id=prod.product_id,
            product_name=prod.product_name,
            product_type=p_type,
            final_underlying_price=round(final_price, 2),
            gross_payoff=round(res.total_maturity_value, 2),
            net_profit_loss=round(res.absolute_profit_loss, 2),
            return_pct=round(res.return_pct, 2),
            explanation=res.explanation,
            is_protected_or_barrier_safe=True,
        )

    elif p_type == "DCD":
        strike = prod.conversion_strike_rate or 85.0
        req = DcdPayoffRequest(
            initial_fx_rate=initial,
            maturity_fx_rate=final_price,
            deposit_currency=prod.deposit_currency or "USD",
            alternate_currency=prod.alternate_currency or "INR",
            deposit_amount=prod.investment,
            coupon_pct_pa=prod.coupon_pct_pa,
            tenor_years=prod.tenor_years,
            conversion_strike_rate=strike,
            conversion_condition=prod.conversion_condition or "FX_AT_OR_ABOVE_STRIKE",
        )
        res = calculate_dcd_payoff(req)
        return ShockOutcomeItem(
            product_id=prod.product_id,
            product_name=prod.product_name,
            product_type=p_type,
            final_underlying_price=round(final_price, 4),
            gross_payoff=round(res.total_value_deposit_currency, 2),
            net_profit_loss=round(res.absolute_profit_loss, 2),
            return_pct=round(res.effective_return_pct, 2),
            explanation=res.explanation,
            is_protected_or_barrier_safe=not res.conversion_occurred,
        )

    else:
        # OPTION
        strike = prod.strike_price or initial
        premium = prod.option_premium or 0.0
        qty = prod.quantity or 1.0
        mult = prod.multiplier or 100.0
        opt_type = OptionType.CALL if (prod.option_type or "").upper() == "CALL" else OptionType.PUT
        pos = PositionType.LONG if (prod.position_type if hasattr(prod, 'position_type') else prod.position or "").upper() == "LONG" else PositionType.SHORT

        res = calculate_option_payoff_single(
            s=final_price,
            strike_price=strike,
            premium=premium,
            quantity=qty,
            multiplier=mult,
            option_type=opt_type,
            position=pos,
        )
        total_prem = premium * qty * mult
        explanation = f"{pos.value} {opt_type.value} at K={strike}: Intrinsic={res['intrinsic_value']}"
        return ShockOutcomeItem(
            product_id=prod.product_id,
            product_name=prod.product_name,
            product_type=p_type,
            final_underlying_price=round(final_price, 2),
            gross_payoff=res["payoff"],
            net_profit_loss=res["profit_loss"],
            return_pct=res["return_pct"],
            explanation=explanation,
            is_protected_or_barrier_safe=res["profit_loss"] >= 0,
        )


def evaluate_market_shocks(req: MarketShockRequest) -> MarketShockResponse:
    """Run market shock analysis across multiple products with side-by-side comparison."""
    shocks = req.custom_shocks_pct if req.custom_shocks_pct is not None else DEFAULT_SHOCKS
    # Clean and sort unique shocks
    shocks = sorted(list(set(round(float(s), 2) for s in shocks)))

    rows: List[ShockComparisonRow] = []
    # Track best/worst per product
    product_stats: Dict[str, Dict[str, Any]] = {
        p.product_id: {
            "name": p.product_name,
            "best": {"shock": None, "return": -float("inf"), "pl": -float("inf")},
            "worst": {"shock": None, "return": float("inf"), "pl": float("inf")},
        }
        for p in req.products
    }

    for sh in shocks:
        row_outcomes: Dict[str, ShockOutcomeItem] = {}
        for p in req.products:
            initial = p.initial_fx_rate if p.product_type == "DCD" else p.initial_price
            final = initial * (1.0 + sh / 100.0)
            outcome = evaluate_single_product_at_price(p, final)
            row_outcomes[p.product_id] = outcome

            # Update best / worst
            stats = product_stats[p.product_id]
            if outcome.return_pct > stats["best"]["return"]:
                stats["best"] = {"shock": sh, "return": outcome.return_pct, "pl": outcome.net_profit_loss}
            if outcome.return_pct < stats["worst"]["return"]:
                stats["worst"] = {"shock": sh, "return": outcome.return_pct, "pl": outcome.net_profit_loss}

        rows.append(ShockComparisonRow(shock_pct=sh, outcomes=row_outcomes))

    summary_bw: List[ProductBestWorst] = []
    for pid, s in product_stats.items():
        summary_bw.append(
            ProductBestWorst(
                product_id=pid,
                product_name=s["name"],
                best_shock_pct=s["best"]["shock"],
                best_return_pct=s["best"]["return"],
                best_profit_loss=s["best"]["pl"],
                worst_shock_pct=s["worst"]["shock"],
                worst_return_pct=s["worst"]["return"],
                worst_profit_loss=s["worst"]["pl"],
            )
        )

    products_meta = [
        {
            "product_id": p.product_id,
            "product_name": p.product_name,
            "product_type": p.product_type,
            "currency": p.deposit_currency if p.product_type == "DCD" else p.investment_currency,
            "initial_level": p.initial_fx_rate if p.product_type == "DCD" else p.initial_price,
        }
        for p in req.products
    ]

    assumptions = (
        "Market Shock Model: Shocks represent hypothetical terminal underlying changes relative to initial levels. "
        "Intraperiod path volatility and barrier touches are evaluated assuming monotonic price movements between endpoints. "
        "Gross Payoff is total cash distributed at maturity; Net Profit/Loss accounts for initial capital invested or premium paid. "
        "Excludes issuer default risk, dividends, tax liabilities, and transaction costs."
    )

    return MarketShockResponse(
        shocks=shocks,
        products=products_meta,
        rows=rows,
        summary_best_worst=summary_bw,
        assumptions_and_risks=assumptions,
    )


def evaluate_sensitivity(req: SensitivityRequest) -> SensitivityResponse:
    """Generate payoff curves and extract key contractual thresholds."""
    prod = req.product
    initial = prod.initial_fx_rate if prod.product_type == "DCD" else prod.initial_price
    min_sh = min(req.range_min_shock_pct, req.range_max_shock_pct)
    max_sh = max(req.range_min_shock_pct, req.range_max_shock_pct)

    step = (max_sh - min_sh) / max(1, req.points_count - 1)
    shocks = [min_sh + i * step for i in range(req.points_count)]

    # Add 0% shock if not already present
    if not any(abs(s) < 1e-4 for s in shocks):
        shocks.append(0.0)
    shocks = sorted(list(set(round(s, 2) for s in shocks)))

    curve: List[SensitivityPoint] = []
    for sh in shocks:
        final = initial * (1.0 + sh / 100.0)
        outcome = evaluate_single_product_at_price(prod, final)
        curve.append(
            SensitivityPoint(
                underlying_price=round(final, 2),
                shock_pct=round(sh, 2),
                gross_payoff=outcome.gross_payoff,
                net_profit_loss=outcome.net_profit_loss,
                return_pct=outcome.return_pct,
            )
        )

    # Threshold identification
    thresholds: List[ThresholdItem] = []
    p_type = prod.product_type.upper()

    if p_type == "ELN":
        strike_lvl = initial * (prod.strike_pct or 90.0) / 100.0
        barrier_lvl = initial * (prod.barrier_pct or 70.0) / 100.0
        thresholds.append(
            ThresholdItem(
                label=f"Strike ({prod.strike_pct}%)",
                price_level=round(strike_lvl, 2),
                shock_pct=round((prod.strike_pct or 90.0) - 100.0, 2),
                color="#f59e0b",
                description="Principal repaid in full if underlying expires at or above this level.",
            )
        )
        thresholds.append(
            ThresholdItem(
                label=f"Barrier ({prod.barrier_pct}%)",
                price_level=round(barrier_lvl, 2),
                shock_pct=round((prod.barrier_pct or 70.0) - 100.0, 2),
                color="#ef4444",
                description="Knock-in barrier. Breaching this triggers equity downside conversion.",
            )
        )

    elif p_type == "CPN":
        prot_pct = prod.protection_pct or 100.0
        prot_lvl = initial * prot_pct / 100.0
        thresholds.append(
            ThresholdItem(
                label=f"Protection Floor ({prot_pct}%)",
                price_level=round(prot_lvl, 2),
                shock_pct=round(prot_pct - 100.0, 2),
                color="#10b981",
                description="Contractual capital protection floor at maturity.",
            )
        )
        if prod.cap_pct is not None:
            cap_lvl = initial * (1.0 + prod.cap_pct / 100.0)
            thresholds.append(
                ThresholdItem(
                    label=f"Upside Cap (+{prod.cap_pct}%)",
                    price_level=round(cap_lvl, 2),
                    shock_pct=round(prod.cap_pct, 2),
                    color="#38bdf8",
                    description="Maximum participation gain cap level.",
                )
            )

    elif p_type == "OPTION":
        strike_lvl = prod.strike_price or initial
        thresholds.append(
            ThresholdItem(
                label="Strike K",
                price_level=round(strike_lvl, 2),
                shock_pct=round(((strike_lvl - initial) / initial) * 100.0, 2),
                color="#f59e0b",
                description="Option strike price.",
            )
        )
        be = calculate_break_even(
            strike_lvl,
            prod.option_premium or 0.0,
            OptionType.CALL if (prod.option_type or "CALL").upper() == "CALL" else OptionType.PUT,
        )
        if be > 0:
            thresholds.append(
                ThresholdItem(
                    label="Break-Even",
                    price_level=round(be, 2),
                    shock_pct=round(((be - initial) / initial) * 100.0, 2),
                    color="#10b981",
                    description="Net profit/loss equals zero at this terminal underlying price.",
                )
            )

    elif p_type == "DCD":
        strike = prod.conversion_strike_rate or 85.0
        thresholds.append(
            ThresholdItem(
                label="Conversion Strike",
                price_level=round(strike, 4),
                shock_pct=round(((strike - initial) / initial) * 100.0, 2),
                color="#f59e0b",
                description="Conversion trigger exchange rate at maturity.",
            )
        )

    return SensitivityResponse(
        product_id=prod.product_id,
        product_name=prod.product_name,
        product_type=p_type,
        curve=curve,
        thresholds=thresholds,
        assumptions=f"Sensitivity curve generated across {len(curve)} points ({min_sh}% to +{max_sh}% shock range). Evaluated strictly at maturity.",
    )


def evaluate_historical_scenarios(req: HistoricalScenarioRequest) -> HistoricalScenarioResponse:
    """
    Run historical scenario replay using observed market windows.
    Adheres strictly to the requirement:
    - Never label synthetic or bundled fallback data as live.
    - Show observation count, source, date range, and missing-data warnings.
    - Distinguish historical scenario replay from a true strategy backtest.
    """
    ticker = validate_ticker(req.ticker)
    instrument = get_instrument(ticker)
    prod = req.product

    df_raw = get_historical_market_data(ticker=ticker, period="10y", source=req.source)
    df = clean_prices(df_raw)

    raw_source = df.attrs.get("source", "Historical observation dataset")
    is_live = "yahoo" in raw_source.lower() and "snapshot" not in raw_source.lower()

    warnings: List[str] = []
    if "snapshot" in raw_source.lower() or "bundled" in raw_source.lower():
        warnings.append("Data source is a bundled snapshot. This is NOT a verified live market feed.")

    # Apply date filters if provided
    if req.start_date:
        df = df[df["date"] >= req.start_date]
    if req.end_date:
        df = df[df["date"] <= req.end_date]
    df = df.reset_index(drop=True)

    obs_avail = len(df)
    if obs_avail < 20:
        raise DomainError("INSUFFICIENT_HISTORY", f"Insufficient observations for {ticker}: only {obs_avail} available.", 422)

    # Use requested lookback window
    lookback = min(req.lookback_observations, obs_avail)
    if lookback < req.lookback_observations:
        warnings.append(f"Requested lookback of {req.lookback_observations} observations; only {obs_avail} available. Using {lookback} observations.")

    df_window = df.tail(lookback).reset_index(drop=True)
    obs_used = len(df_window)

    # Determine tenor intervals
    intervals = max(5, min(obs_used - 1, math.ceil((prod.tenor_years or 1.0) * 252)))
    if obs_used <= intervals:
        intervals = max(2, obs_used // 2)
        warnings.append(f"Adjusted interval window to {intervals} trading days to fit available observations.")

    # Rolling window replay
    step = max(1, (obs_used - intervals) // 50)  # Up to 50 sample windows
    windows: List[HistoricalScenarioWindowItem] = []

    for i in range(0, obs_used - intervals, step):
        sub_df = df_window.iloc[i : i + intervals + 1]
        path = sub_df["close"].tolist()
        s0 = path[0]
        s_end = path[-1]
        chg_pct = ((s_end - s0) / s0) * 100.0

        # Scale product relative to window's starting price
        scaled_prod = prod.model_copy()
        if scaled_prod.product_type == "DCD":
            scaled_prod.initial_fx_rate = s0
            if prod.conversion_strike_rate and prod.initial_fx_rate:
                scaled_prod.conversion_strike_rate = s0 * (prod.conversion_strike_rate / prod.initial_fx_rate)
        else:
            scaled_prod.initial_price = s0
            if scaled_prod.product_type == "OPTION" and prod.strike_price and prod.initial_price:
                scaled_prod.strike_price = s0 * (prod.strike_price / prod.initial_price)

        outcome = evaluate_single_product_at_price(scaled_prod, s_end, observed_path=path)

        key_event = "Standard Settlement"
        if outcome.is_protected_or_barrier_safe is False:
            key_event = "Barrier Breach / Downside Conversion"
        elif outcome.return_pct > 10.0:
            key_event = "High Participation Gain"

        windows.append(
            HistoricalScenarioWindowItem(
                start_date=sub_df["date"].iloc[0],
                end_date=sub_df["date"].iloc[-1],
                initial_price=round(s0, 2),
                final_price=round(s_end, 2),
                price_change_pct=round(chg_pct, 2),
                min_observed_price=round(min(path), 2),
                gross_payoff=outcome.gross_payoff,
                net_profit_loss=outcome.net_profit_loss,
                return_pct=outcome.return_pct,
                key_event=key_event,
            )
        )

    returns = np.array([w.return_pct for w in windows]) if windows else np.array([0.0])
    avg_ret = float(returns.mean())
    best_ret = float(returns.max())
    worst_ret = float(returns.min())
    loss_freq = float(np.mean(returns < -1e-4) * 100.0)
    win_freq = float(np.mean(returns > 1e-4) * 100.0)

    date_range_str = f"{df_window['date'].iloc[0]} to {df_window['date'].iloc[-1]}"

    disclosure = (
        "Historical Scenario Replay Notice: This analysis applies past observed market price movements "
        "to the contract parameters to evaluate hypothetical scenario performance. It is NOT an actual predictive "
        "backtest and does not imply future performance. Intraday price movements, execution slippage, fees, and dividends are excluded."
    )

    return HistoricalScenarioResponse(
        ticker=ticker,
        product_id=prod.product_id,
        product_name=prod.product_name,
        data_source=raw_source,
        is_verified_live=is_live,
        date_range=date_range_str,
        observations_available=obs_avail,
        observations_used=obs_used,
        windows_evaluated=len(windows),
        average_return_pct=round(avg_ret, 2),
        best_return_pct=round(best_ret, 2),
        worst_return_pct=round(worst_ret, 2),
        loss_frequency_pct=round(loss_freq, 2),
        win_frequency_pct=round(win_freq, 2),
        windows=windows,
        warnings=warnings,
        methodology_disclosure=disclosure,
    )
