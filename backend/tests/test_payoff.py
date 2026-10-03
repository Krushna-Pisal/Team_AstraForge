"""
Tests for the ELN payoff engine.

Covers all 8 specification test cases plus validation checks.
Run with:  pytest tests/test_payoff.py -v
"""

import pytest
from app.models import ProductInput
from app.payoff_engine import compute_payoff


# ---------------------------------------------------------------------------
# Shared product fixture (investment 1M, 1Y, coupon 12%, strike 90, barrier 70)
# ---------------------------------------------------------------------------

@pytest.fixture
def base_product() -> ProductInput:
    return ProductInput(
        underlying="NIFTY50",
        investment=1_000_000,
        tenor_years=1.0,
        strike_pct=90.0,
        barrier_pct=70.0,
        barrier_monitoring="daily",
        coupon_pct_pa=12.0,
    )


@pytest.fixture
def maturity_product() -> ProductInput:
    return ProductInput(
        underlying="NIFTY50",
        investment=1_000_000,
        tenor_years=1.0,
        strike_pct=90.0,
        barrier_pct=70.0,
        barrier_monitoring="maturity",
        coupon_pct_pa=12.0,
    )


# ---------------------------------------------------------------------------
# Test cases
# ---------------------------------------------------------------------------

class TestDailyMonitoring:
    def test_case_1_not_breached_positive_return(self, base_product):
        """TC1: r=1.10, min=1.0 → no breach → full redemption + coupon = 1,120,000."""
        result = compute_payoff(base_product, final_ratio=1.10, min_ratio=1.0)
        assert not result["barrier_breached"]
        assert result["redemption"] == pytest.approx(1_000_000.0, abs=0.01)
        assert result["final_amount"] == pytest.approx(1_120_000.0, abs=0.01)

    def test_case_2_breached_below_strike(self, base_product):
        """TC2: min=0.65 (breached), r=0.85 (< strike 0.90) → capital loss."""
        result = compute_payoff(base_product, final_ratio=0.85, min_ratio=0.65)
        assert result["barrier_breached"]
        assert result["redemption"] == pytest.approx(944_444.44, abs=0.01)
        assert result["final_amount"] == pytest.approx(1_064_444.44, abs=0.01)

    def test_case_3_breached_above_strike(self, base_product):
        """TC3: min=0.65 (breached), r=0.95 (>= strike 0.90) → full redemption."""
        result = compute_payoff(base_product, final_ratio=0.95, min_ratio=0.65)
        assert result["barrier_breached"]
        assert result["redemption"] == pytest.approx(1_000_000.0, abs=0.01)
        assert result["final_amount"] == pytest.approx(1_120_000.0, abs=0.01)

    def test_case_4_not_breached_below_S0(self, base_product):
        """TC4: r=0.80, min=0.80 → min > barrier 0.70 → not breached → full capital + coupon."""
        result = compute_payoff(base_product, final_ratio=0.80, min_ratio=0.80)
        assert not result["barrier_breached"]
        assert result["final_amount"] == pytest.approx(1_120_000.0, abs=0.01)

    def test_case_5_breached_deep_loss(self, base_product):
        """TC5: min=0.50 (breached), r=0.50 → severe capital loss."""
        result = compute_payoff(base_product, final_ratio=0.50, min_ratio=0.50)
        assert result["barrier_breached"]
        assert result["redemption"] == pytest.approx(555_555.56, abs=0.01)
        assert result["final_amount"] == pytest.approx(675_555.56, abs=0.01)


class TestMaturityMonitoring:
    def test_case_6_maturity_min_low_but_r_at_par(self, maturity_product):
        """TC6: maturity monitoring, min=0.60 but r=1.00 → only r matters → not breached."""
        result = compute_payoff(maturity_product, final_ratio=1.00, min_ratio=0.60)
        assert not result["barrier_breached"]
        assert result["final_amount"] == pytest.approx(1_120_000.0, abs=0.01)

    def test_case_7_maturity_r_below_barrier(self, maturity_product):
        """TC7: maturity monitoring, r=0.65 (< barrier 0.70) → breached + loss."""
        result = compute_payoff(maturity_product, final_ratio=0.65, min_ratio=0.65)
        assert result["barrier_breached"]
        assert result["redemption"] == pytest.approx(722_222.22, abs=0.01)
        assert result["final_amount"] == pytest.approx(842_222.22, abs=0.01)


class TestValidation:
    def test_case_8_barrier_ge_strike_raises(self):
        """TC8: barrier_pct >= strike_pct must raise ValidationError."""
        with pytest.raises(Exception) as exc_info:
            ProductInput(
                underlying="NIFTY50",
                investment=1_000_000,
                tenor_years=1.0,
                strike_pct=70.0,
                barrier_pct=75.0,  # barrier >= strike → invalid
                barrier_monitoring="daily",
                coupon_pct_pa=12.0,
            )
        assert "barrier_pct" in str(exc_info.value).lower() or "barrier" in str(exc_info.value).lower()

    def test_barrier_equal_to_strike_raises(self):
        """barrier_pct == strike_pct must also raise."""
        with pytest.raises(Exception):
            ProductInput(
                underlying="NIFTY50",
                investment=1_000_000,
                tenor_years=1.0,
                strike_pct=80.0,
                barrier_pct=80.0,
                barrier_monitoring="daily",
                coupon_pct_pa=12.0,
            )

    def test_invalid_tenor_raises(self):
        """Tenor must be 0.5, 1.0, or 2.0."""
        with pytest.raises(Exception):
            ProductInput(
                underlying="NIFTY50",
                investment=1_000_000,
                tenor_years=1.5,  # invalid
                strike_pct=90.0,
                barrier_pct=70.0,
                barrier_monitoring="daily",
                coupon_pct_pa=12.0,
            )

    def test_coupon_always_paid(self):
        """Coupon is included in final_amount regardless of barrier breach."""
        product = ProductInput(
            underlying="NIFTY50",
            investment=1_000_000,
            tenor_years=1.0,
            strike_pct=90.0,
            barrier_pct=70.0,
            barrier_monitoring="daily",
            coupon_pct_pa=12.0,
        )
        # Even in the worst case (deep breach), coupon is paid
        result = compute_payoff(product, final_ratio=0.30, min_ratio=0.30)
        assert result["coupon_amount"] == pytest.approx(120_000.0, abs=0.01)
        assert result["final_amount"] == pytest.approx(result["redemption"] + 120_000.0, abs=0.01)
