import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { PageTitle, Metric, ErrorNotice, Loading } from "../components/ui/Workflow";
import DebentureYieldChart from "../components/debenture/DebentureYieldChart";
import DebentureScenarioTable from "../components/debenture/DebentureScenarioTable";
import DebentureCashFlowTable from "../components/debenture/DebentureCashFlowTable";
import {
  ArrowLeft,
  AlertTriangle,
  Info,
  Sparkles,
} from "lucide-react";

export default function DebentureSimulator({ isClientPortal = false }) {
  // Configurable Debenture Inputs
  const [faceValue, setFaceValue] = useState(100000);
  const [purchasePrice, setPurchasePrice] = useState(98500);
  const [couponRatePct, setCouponRatePct] = useState(8.5);
  const [frequency, setFrequency] = useState(2); // 1, 2, 4, 12
  const [yearsToMaturity, setYearsToMaturity] = useState(5);
  const [redemptionValue, setRedemptionValue] = useState(100000);
  const [marketYieldPct, setMarketYieldPct] = useState(8.25);
  const [currency] = useState("INR");

  // Output states
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Quick Strategy Presets
  const applyPreset = (preset) => {
    switch (preset) {
      case "PAR":
        setFaceValue(100000);
        setPurchasePrice(100000);
        setCouponRatePct(8.0);
        setFrequency(2);
        setYearsToMaturity(5);
        setRedemptionValue(100000);
        setMarketYieldPct(8.0);
        break;
      case "DISCOUNT":
        setFaceValue(100000);
        setPurchasePrice(95000);
        setCouponRatePct(7.5);
        setFrequency(2);
        setYearsToMaturity(4);
        setRedemptionValue(100000);
        setMarketYieldPct(8.5);
        break;
      case "PREMIUM":
        setFaceValue(100000);
        setPurchasePrice(104000);
        setCouponRatePct(9.5);
        setFrequency(2);
        setYearsToMaturity(6);
        setRedemptionValue(100000);
        setMarketYieldPct(8.0);
        break;
      case "ZERO_COUPON":
        setFaceValue(100000);
        setPurchasePrice(75000);
        setCouponRatePct(0.0);
        setFrequency(1);
        setYearsToMaturity(3);
        setRedemptionValue(100000);
        setMarketYieldPct(9.0);
        break;
      default:
        break;
    }
  };

  const runSimulation = async () => {
    if (
      faceValue <= 0 ||
      purchasePrice <= 0 ||
      couponRatePct < 0 ||
      yearsToMaturity <= 0 ||
      (redemptionValue !== null && redemptionValue <= 0) ||
      marketYieldPct < 0
    ) {
      setError("Please ensure all parameters are valid positive values.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        face_value: Number(faceValue),
        purchase_price: Number(purchasePrice),
        coupon_rate_pct: Number(couponRatePct),
        frequency: Number(frequency),
        years_to_maturity: Number(yearsToMaturity),
        redemption_value: redemptionValue ? Number(redemptionValue) : Number(faceValue),
        market_yield_pct: Number(marketYieldPct),
        currency: currency,
      };

      const data = await api("/api/debenture/simulate", { body: payload });
      setSimulation(data);
    } catch (err) {
      console.error("Debenture simulation failed:", err);
      setError(err.message || "Failed to execute debenture simulation.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [faceValue, purchasePrice, couponRatePct, frequency, yearsToMaturity, redemptionValue, marketYieldPct]);

  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="FIXED INCOME SUITE"
        title="Debenture Valuation & Yield Simulator"
        description="Model fixed-rate bullet debenture cash flows, purchase YTM, present value, and interest rate sensitivity."
      >
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {isClientPortal ? (
            <Link to="/client" className="btn-secondary">
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
          ) : (
            <Link to="/simulator" className="btn-secondary">
              <ArrowLeft size={16} /> All Simulators
            </Link>
          )}
        </div>
      </PageTitle>

      {/* Strategy Presets */}
      <div className="card" style={{ padding: "14px 18px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={16} color="#38bdf8" />
            <strong style={{ fontSize: "14px" }}>Preset Structures:</strong>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              className={purchasePrice === faceValue && couponRatePct > 0 ? "btn-primary" : "btn-secondary"}
              onClick={() => applyPreset("PAR")}
              style={{ fontSize: "12px", padding: "6px 12px", minHeight: "34px" }}
            >
              Par Debenture (8.0%)
            </button>
            <button
              type="button"
              className={purchasePrice < faceValue && couponRatePct > 0 ? "btn-primary" : "btn-secondary"}
              onClick={() => applyPreset("DISCOUNT")}
              style={{ fontSize: "12px", padding: "6px 12px", minHeight: "34px" }}
            >
              Discount Debenture
            </button>
            <button
              type="button"
              className={purchasePrice > faceValue ? "btn-primary" : "btn-secondary"}
              onClick={() => applyPreset("PREMIUM")}
              style={{ fontSize: "12px", padding: "6px 12px", minHeight: "34px" }}
            >
              Premium Debenture
            </button>
            <button
              type="button"
              className={couponRatePct === 0 ? "btn-primary" : "btn-secondary"}
              onClick={() => applyPreset("ZERO_COUPON")}
              style={{ fontSize: "12px", padding: "6px 12px", minHeight: "34px" }}
            >
              Zero-Coupon Debenture
            </button>
          </div>
        </div>
      </div>

      {/* Contract & Market Parameters Form */}
      <section className="card" style={{ padding: "22px", display: "grid", gap: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "16px", margin: 0, fontWeight: 650 }}>Debenture Terms & Market Parameters</h2>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
            Total Periods: {simulation ? simulation.total_periods : Math.round(yearsToMaturity * frequency)}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <label className="field">
            Face / Par Value ({currency})
            <input
              type="number"
              step="any"
              min="1"
              value={faceValue}
              onChange={(e) => setFaceValue(parseFloat(e.target.value) || 0)}
            />
          </label>

          <label className="field">
            Purchase Price ({currency})
            <input
              type="number"
              step="any"
              min="1"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
            />
          </label>

          <label className="field">
            Annual Coupon Rate (%)
            <input
              type="number"
              step="0.05"
              min="0"
              value={couponRatePct}
              onChange={(e) => setCouponRatePct(parseFloat(e.target.value) || 0)}
            />
          </label>

          <label className="field">
            Payment Frequency
            <select
              value={frequency}
              onChange={(e) => setFrequency(parseInt(e.target.value, 10))}
              style={{ height: "42px", padding: "0 10px", borderRadius: "8px" }}
            >
              <option value={1}>Annual (1x / year)</option>
              <option value={2}>Semi-Annual (2x / year)</option>
              <option value={4}>Quarterly (4x / year)</option>
              <option value={12}>Monthly (12x / year)</option>
            </select>
          </label>

          <label className="field">
            Years to Maturity
            <input
              type="number"
              step="0.5"
              min="0.5"
              value={yearsToMaturity}
              onChange={(e) => setYearsToMaturity(parseFloat(e.target.value) || 0)}
            />
          </label>

          <label className="field">
            Redemption Value ({currency})
            <input
              type="number"
              step="any"
              min="1"
              value={redemptionValue}
              onChange={(e) => setRedemptionValue(parseFloat(e.target.value) || 0)}
            />
          </label>

          <label className="field">
            Market Yield to Maturity (%)
            <input
              type="number"
              step="0.05"
              min="0"
              value={marketYieldPct}
              onChange={(e) => setMarketYieldPct(parseFloat(e.target.value) || 0)}
            />
          </label>
        </div>
      </section>

      {/* Error notice */}
      <ErrorNotice error={error} retry={runSimulation} />

      {/* Financial Metrics Cards */}
      {simulation && (
        <section className="stats-grid">
          <Metric
            label="Implied Purchase YTM"
            value={`${simulation.ytm_purchase_price_pct.toFixed(2)}%`}
            hint={`Effective Annual: ${simulation.effective_annual_ytm_pct.toFixed(2)}%`}
            tone="info"
          />

          <Metric
            label="Present Value at Market Yield"
            value={`${currency} ${simulation.present_value_market_yield.toLocaleString()}`}
            hint={`Discounted at ${simulation.market_yield_pct.toFixed(2)}%`}
          />

          <Metric
            label="Pricing vs Face Value"
            value={`${simulation.pricing_status} (${simulation.premium_discount_pct >= 0 ? "+" : ""}${simulation.premium_discount_pct.toFixed(2)}%)`}
            hint={
              simulation.premium_discount_amount >= 0
                ? `Premium: +${currency} ${simulation.premium_discount_amount.toLocaleString()}`
                : `Discount: ${currency} ${simulation.premium_discount_amount.toLocaleString()}`
            }
            tone={
              simulation.pricing_status === "Discount"
                ? "positive"
                : simulation.pricing_status === "Premium"
                ? "warning"
                : ""
            }
          />

          <Metric
            label="Periodic Coupon"
            value={`${currency} ${simulation.periodic_coupon.toLocaleString()}`}
            hint={`Total Coupons: ${currency} ${simulation.total_coupons.toLocaleString()}`}
          />

          <Metric
            label="Current Yield"
            value={`${simulation.current_yield_pct.toFixed(2)}%`}
            hint={`Annual Coupon ÷ Purchase Price`}
          />

          <Metric
            label="Modified Duration"
            value={`${simulation.modified_duration.toFixed(2)} yrs`}
            hint={`Macaulay: ${simulation.macaulay_duration_years.toFixed(2)} yrs`}
          />
        </section>
      )}

      {/* Loading state */}
      {loading && !simulation && <Loading text="Simulating debenture valuation & cash flows…" />}

      {/* Yield Sensitivity Chart */}
      {simulation && (
        <DebentureYieldChart
          curve={simulation.curve}
          marketYieldPct={simulation.market_yield_pct}
          ytmPct={simulation.ytm_purchase_price_pct}
          faceValue={simulation.face_value}
          purchasePrice={simulation.purchase_price}
          currency={currency}
        />
      )}

      {/* Yield Sensitivity Scenario Matrix */}
      {simulation && (
        <DebentureScenarioTable
          scenarios={simulation.scenarios}
          currency={currency}
          faceValue={simulation.face_value}
        />
      )}

      {/* Cash Flow Timeline Table */}
      {simulation && (
        <DebentureCashFlowTable
          cashFlows={simulation.cash_flows}
          currency={currency}
        />
      )}

      {/* Model Assumptions and Disclaimers */}
      <div
        className="card"
        style={{
          padding: "16px 20px",
          borderLeft: "4px solid #38bdf8",
          background: "#0c1726",
          display: "flex",
          gap: "12px",
          alignItems: "flex-start",
        }}
      >
        <Info size={20} color="#38bdf8" style={{ flexShrink: 0, marginTop: "2px" }} />
        <div style={{ display: "grid", gap: "4px", fontSize: "12px", color: "#94a3b8", lineHeight: 1.55 }}>
          <strong style={{ color: "#e0f2fe", fontSize: "13px" }}>
            Model Scope & Assumptions
          </strong>
          <p style={{ margin: 0 }}>
            {simulation?.assumptions_and_disclaimers ||
              "Standard Fixed-Rate Bullet Debenture Model. Excludes credit/default risk, rating downgrades, taxes, brokerage costs, and complex early redemption features (call/put/conversion provisions)."}
          </p>
        </div>
      </div>
    </div>
  );
}
