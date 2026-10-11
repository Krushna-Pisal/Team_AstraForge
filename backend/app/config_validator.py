"""
Production Configuration Validator for AstraForge.
Validates environment settings, Supabase JWT secrets, and CORS boundaries before release.
"""

from __future__ import annotations

import os
import sys
from typing import Dict, List, Any


def validate_production_config(env: Dict[str, str] | None = None) -> Dict[str, Any]:
    """
    Validate the configuration for production readiness.
    Can accept an explicit environment dictionary for deterministic testing.
    """
    env_source = env if env is not None else os.environ

    environment = env_source.get("ENVIRONMENT", env_source.get("APP_ENV", "")).strip().lower()
    is_prod = environment in ("production", "prod")

    jwt_secret = env_source.get("SUPABASE_JWT_SECRET", "").strip()
    dev_bypass = env_source.get("ALLOW_DEV_AUTH_BYPASS", "").strip().lower()
    frontend_url = env_source.get("FRONTEND_URL", "").strip()
    allowed_origins = env_source.get("ALLOWED_ORIGINS", "").strip()
    gemini_key = env_source.get("GEMINI_API_KEY", "").strip()

    errors: List[str] = []
    warnings: List[str] = []

    # 1. Production JWT Secret Validation
    placeholder_tokens = ("your-jwt-secret", "replace_with", "placeholder", "changeme", "test-secret")
    if is_prod:
        if not jwt_secret:
            errors.append("SUPABASE_JWT_SECRET is required in production but is unset or empty.")
        elif any(token in jwt_secret.lower() for token in placeholder_tokens):
            errors.append("SUPABASE_JWT_SECRET appears to be a placeholder or test token.")
        elif len(jwt_secret) < 32:
            errors.append(f"SUPABASE_JWT_SECRET is too short ({len(jwt_secret)} chars). Must be at least 32 characters.")

    # 2. Development Bypass Guard
    if is_prod and dev_bypass in ("true", "1", "yes"):
        errors.append("ALLOW_DEV_AUTH_BYPASS cannot be enabled in a production environment.")

    # 3. CORS & Origin Configuration
    if is_prod:
        configured_origins = []
        if frontend_url:
            configured_origins.append(frontend_url)
        if allowed_origins:
            configured_origins.extend([o.strip() for o in allowed_origins.split(",") if o.strip()])

        if not configured_origins:
            warnings.append("FRONTEND_URL / ALLOWED_ORIGINS not set. Defaulting to localhost:5173 which is insecure for production.")
        elif any("localhost" in o or "127.0.0.1" in o for o in configured_origins):
            warnings.append("One or more configured production CORS origins references localhost or 127.0.0.1.")

    # 4. Optional AI Enrichment
    if not gemini_key:
        warnings.append("GEMINI_API_KEY is not configured; deterministic fallback explanations will be used.")

    is_valid = len(errors) == 0

    return {
        "is_production": is_prod,
        "valid": is_valid,
        "environment": environment or "development",
        "errors": errors,
        "warnings": warnings,
        "details": {
            "supabase_configured": bool(jwt_secret and not any(token in jwt_secret.lower() for token in placeholder_tokens)),
            "dev_bypass_disabled": dev_bypass not in ("true", "1", "yes"),
            "ai_insights_enabled": bool(gemini_key and "replace_with" not in gemini_key),
        },
    }


def main():
    report = validate_production_config()
    print("=" * 60)
    print(" AstraForge Production Configuration Validation Report")
    print("=" * 60)
    print(f" Environment : {report['environment']} (is_production={report['is_production']})")
    print(f" Status      : {'PASS' if report['valid'] else 'FAIL'}")
    print("-" * 60)

    if report["errors"]:
        print("ERRORS (Must fix before production release):")
        for err in report["errors"]:
            print(f"  [X] {err}")
    else:
        print("No critical configuration errors detected.")

    if report["warnings"]:
        print("\nWARNINGS / ADVISORIES:")
        for warn in report["warnings"]:
            print(f"  [!] {warn}")

    print("=" * 60)
    sys.exit(0 if report["valid"] else 1)


if __name__ == "__main__":
    main()
