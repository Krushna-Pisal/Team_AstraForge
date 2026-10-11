"""
Tests for AstraForge Production Readiness & Commodity (Gold/Silver) Underlyings.
Verifies production config validation, JWT secret strength, CORS origin checks,
and Gold (GC=F) / Silver (SI=F) asset integration without formula modifications.
"""

import pytest
from app.config_validator import validate_production_config
from app.phase3_market_data import (
    validate_ticker,
    get_instrument,
    search_underlyings,
    MarketInstrument,
)
from app.products import ProductTemplate, validate_product, ELNTerms, CPNTerms, DCDTerms
from app.domain import DomainError


# ==============================================================================
# 1. PRODUCTION CONFIGURATION VALIDATION TESTS
# ==============================================================================

def test_production_config_passes_with_strong_settings():
    """Production configuration passes when valid JWT secret, prod environment, and HTTPS CORS origins are provided."""
    valid_env = {
        "ENVIRONMENT": "production",
        "SUPABASE_JWT_SECRET": "a-very-strong-production-jwt-secret-with-at-least-32-chars",
        "ALLOW_DEV_AUTH_BYPASS": "false",
        "FRONTEND_URL": "https://app.astraforge.example.com",
        "ALLOWED_ORIGINS": "https://app.astraforge.example.com,https://staging.astraforge.example.com",
        "GEMINI_API_KEY": "valid-gemini-key-12345",
    }
    report = validate_production_config(valid_env)
    assert report["valid"] is True
    assert report["is_production"] is True
    assert len(report["errors"]) == 0
    assert report["details"]["supabase_configured"] is True
    assert report["details"]["dev_bypass_disabled"] is True


def test_production_config_fails_when_secret_is_missing_or_placeholder():
    """Production configuration fails if JWT secret is missing, too short, or a placeholder."""
    # Missing secret
    missing_env = {"ENVIRONMENT": "production", "SUPABASE_JWT_SECRET": ""}
    report_missing = validate_production_config(missing_env)
    assert report_missing["valid"] is False
    assert any("SUPABASE_JWT_SECRET is required" in err for err in report_missing["errors"])

    # Placeholder secret
    placeholder_env = {"ENVIRONMENT": "production", "SUPABASE_JWT_SECRET": "your-jwt-secret-placeholder-value-here-1234"}
    report_placeholder = validate_production_config(placeholder_env)
    assert report_placeholder["valid"] is False
    assert any("placeholder" in err for err in report_placeholder["errors"])

    # Too short secret
    short_env = {"ENVIRONMENT": "production", "SUPABASE_JWT_SECRET": "short-secret-123"}
    report_short = validate_production_config(short_env)
    assert report_short["valid"] is False
    assert any("too short" in err for err in report_short["errors"])


def test_production_config_fails_if_dev_bypass_enabled():
    """Production configuration strictly rejects ALLOW_DEV_AUTH_BYPASS=true."""
    bypass_env = {
        "ENVIRONMENT": "production",
        "SUPABASE_JWT_SECRET": "a-strong-jwt-secret-longer-than-32-characters-test",
        "ALLOW_DEV_AUTH_BYPASS": "true",
    }
    report = validate_production_config(bypass_env)
    assert report["valid"] is False
    assert any("ALLOW_DEV_AUTH_BYPASS" in err for err in report["errors"])


def test_production_config_warns_on_missing_gemini_key():
    """Missing Gemini API key in production does not block release, but outputs advisory warning."""
    no_gemini_env = {
        "ENVIRONMENT": "production",
        "SUPABASE_JWT_SECRET": "a-strong-jwt-secret-longer-than-32-characters-test",
        "FRONTEND_URL": "https://app.astraforge.example.com",
    }
    report = validate_production_config(no_gemini_env)
    assert report["valid"] is True
    assert any("GEMINI_API_KEY" in warn for warn in report["warnings"])


# ==============================================================================
# 2. GOLD (XAU/USD) AND SILVER (XAG/USD) UNDERLYING SUPPORT TESTS
# ==============================================================================

def test_gold_and_silver_tickers_in_catalog():
    """Gold (GC=F) and Silver (SI=F) are present in the market catalog with commodity kind and USD currency."""
    gold = get_instrument("GC=F")
    assert gold.ticker == "GC=F"
    assert "Gold" in gold.label
    assert gold.currency == "USD"
    assert gold.kind == "commodity"
    assert gold.unit == "USD/oz"

    silver = get_instrument("SI=F")
    assert silver.ticker == "SI=F"
    assert "Silver" in silver.label
    assert silver.currency == "USD"
    assert silver.kind == "commodity"
    assert silver.unit == "USD/oz"


def test_gold_and_silver_aliases_resolved():
    """Common market aliases for Gold and Silver resolve to canonical continuous futures symbols."""
    assert validate_ticker("XAUUSD=X") == "GC=F"
    assert validate_ticker("XAU/USD") == "GC=F"
    assert validate_ticker("GOLD") == "GC=F"

    assert validate_ticker("XAGUSD=X") == "SI=F"
    assert validate_ticker("XAG/USD") == "SI=F"
    assert validate_ticker("SILVER") == "SI=F"


def test_search_underlyings_returns_gold_and_silver():
    """Searching for 'Gold' or 'Silver' in equity/notes mode returns commodity underlyings."""
    res_gold = search_underlyings("Gold", kind="equity")
    tickers_gold = [r.ticker for r in res_gold.results]
    assert "GC=F" in tickers_gold

    res_silver = search_underlyings("Silver", kind="equity")
    tickers_silver = [r.ticker for r in res_silver.results]
    assert "SI=F" in tickers_silver


def test_cpn_and_eln_support_commodity_underlyings():
    """CPN and ELN structured note products accept Gold and Silver with matching USD currency."""
    # CPN on Gold
    cpn_gold = ProductTemplate(
        name="Gold Capital Protected Note",
        product_type="CPN",
        ticker="GC=F",
        currency="USD",
        cpn_terms=CPNTerms(tenor_years=1.0, protection_pct=100.0, participation_rate=80.0),
    )
    validated_cpn = validate_product(cpn_gold)
    assert validated_cpn.instrument.ticker == "GC=F"
    assert validated_cpn.instrument.kind == "commodity"

    # ELN on Silver
    eln_silver = ProductTemplate(
        name="Silver Yield Note",
        product_type="ELN",
        ticker="SI=F",
        currency="USD",
        eln_terms=ELNTerms(tenor_years=1.0, strike_pct=95.0, barrier_pct=75.0, coupon_pct_pa=10.0),
    )
    validated_eln = validate_product(eln_silver)
    assert validated_eln.instrument.ticker == "SI=F"
    assert validated_eln.instrument.kind == "commodity"


def test_dcd_rejects_commodity_underlying():
    """DCD products require an FX currency pair and reject commodity underlyings."""
    dcd_gold = ProductTemplate(
        name="Invalid Gold DCD",
        product_type="DCD",
        ticker="GC=F",
        currency="USD",
        dcd_terms=DCDTerms(tenor_years=0.5, coupon_pct_pa=6.0, conversion_strike_rate=2500.0),
    )
    with pytest.raises(DomainError) as exc_info:
        validate_product(dcd_gold)
    assert exc_info.value.code == "CURRENCY_MISMATCH"


def test_commodity_currency_mismatch_rejected():
    """CPN on Gold quoted in USD rejects mismatched currency (e.g., INR without FX translation)."""
    cpn_inr_gold = ProductTemplate(
        name="Gold CPN in INR",
        product_type="CPN",
        ticker="GC=F",
        currency="INR",
        cpn_terms=CPNTerms(tenor_years=1.0, protection_pct=100.0, participation_rate=80.0),
    )
    with pytest.raises(DomainError) as exc_info:
        validate_product(cpn_inr_gold)
    assert exc_info.value.code == "CURRENCY_MISMATCH"
