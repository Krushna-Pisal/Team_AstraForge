import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { PageTitle, ErrorNotice, Loading } from "../components/ui/Workflow";
import ShockComparisonTable from "../components/advanced_simulation/ShockComparisonTable";
import SensitivityCurveChart from "../components/advanced_simulation/SensitivityCurveChart";
import HistoricalReplayPanel from "../components/advanced_simulation/HistoricalReplayPanel";
import {
  ArrowLeft,
  Sliders,
  TrendingUp,
  History,
  Sparkles,
  PlusCircle,
  Trash2,
} from "lucide-react";

// Standard preset products for side-by-side comparison
const PRESET_PRODUCTS = [
  {
    product_id: "eln-std",
    product_name: "Equity-Linked Note (90/70)",
    product_type: "ELN",
    initial_price: 22000,
    strike_pct: 90,
    barrier_pct: 70,
    coupon_pct_pa: 10,
    tenor_years: 1,
    investment: 100000,
    investment_currency: "INR",
  },
  {
    product_id: "cpn-prot",
    product_name: "Capital-Protected Note (100% Floor)",
    product_type: "CPN",
    initial_price: 22000,
    protection_pct: 100,
    participation_pct: 85,
    cap_pct: 25,
    coupon_pct_pa: 2,
    tenor_years: 1,
    investment: 100000,
    investment_currency: "INR",
  },
  {
    product_id: "call-opt",
    product_name: "Long Call Option (ATM)",
    product_type: "OPTION",
    initial_price: 22000,
    strike_price: 22000,
    option_premium: 350,
    quantity: 4,
    multiplier: 50,
    option_type: "CALL",
    position: "LONG",
    investment: 70000, // 350 * 4 * 50 = 70,000
    investment_currency: "INR",
  },
];

export default function AdvancedSimulation({ isClientPortal = false }) {
  const [activeTab, setActiveTab] = useState("shocks"); // "shocks", "sensitivity", "historical"

  // Product Selection State
  const [selectedProducts, setSelectedProducts] = useState(PRESET_PRODUCTS);
  const [activeProductIndex, setActiveProductIndex] = useState(0);

  // Custom Shocks State
  const [customShockInput, setCustomShockInput] = useState("");
  const [customShocks, setCustomShocks] = useState([-40, -20, -10, 0, 10, 20]);

  // Sensitivity Settings
  const [rangeMinShock, setRangeMinShock] = useState(-50);
  const [rangeMaxShock, setRangeMaxShock] = useState(50);

  // Historical Settings
  const [lookbackObservations, setLookbackObservations] = useState(252);
  const [selectedTicker, setSelectedTicker] = useState("^NSEI");

  // Output States
  const [shocksResult, setShocksResult] = useState(null);
  const [sensitivityResult, setSensitivityResult] = useState(null);
  const [historicalResult, setHistoricalResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1. Run Market Shock Comparison
  const runShocksAnalysis = async () => {
    if (!selectedProducts.length) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api("/api/advanced-simulation/market-shocks", {
        body: {
          products: selectedProducts,
          custom_shocks_pct: customShocks,
        },
      });
      setShocksResult(data);
    } catch (err) {
      console.error("Shocks analysis failed:", err);
      setError(err.message || "Failed to run market shock analysis.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Run Sensitivity Analysis
  const runSensitivityAnalysis = async () => {
    const prod = selectedProducts[activeProductIndex] || selectedProducts[0];
    if (!prod) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api("/api/advanced-simulation/sensitivity", {
        body: {
          product: prod,
          range_min_shock_pct: Number(rangeMinShock),
          range_max_shock_pct: Number(rangeMaxShock),
          points_count: 60,
        },
      });
      setSensitivityResult(data);
    } catch (err) {
      console.error("Sensitivity analysis failed:", err);
      setError(err.message || "Failed to run sensitivity analysis.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Run Historical Scenario Replay
  const runHistoricalAnalysis = async () => {
    const prod = selectedProducts[activeProductIndex] || selectedProducts[0];
    if (!prod) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api("/api/advanced-simulation/historical-scenarios", {
        body: {
          product: prod,
          ticker: selectedTicker,
          lookback_observations: Number(lookbackObservations),
          source: "snapshot",
        },
      });
      setHistoricalResult(data);
    } catch (err) {
      console.error("Historical scenario replay failed:", err);
      setError(err.message || "Failed to execute historical scenario replay.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-run on tab change or parameters change
  useEffect(() => {
    if (activeTab === "shocks") {
      runShocksAnalysis();
    } else if (activeTab === "sensitivity") {
      runSensitivityAnalysis();
    } else if (activeTab === "historical") {
      runHistoricalAnalysis();
    }
  }, [activeTab, customShocks, activeProductIndex, rangeMinShock, rangeMaxShock, lookbackObservations, selectedTicker]);

  const handleAddShock = (e) => {
    e.preventDefault();
    const val = parseFloat(customShockInput);
    if (!isNaN(val) && !customShocks.includes(val)) {
      setCustomShocks([...customShocks, val].sort((a, b) => a - b));
      setCustomShockInput("");
    }
  };

  const resetStandardShocks = () => {
    setCustomShocks([-40, -20, -10, 0, 10, 20]);
    setCustomShockInput("");
  };

  const currentFocusProduct = selectedProducts[activeProductIndex] || selectedProducts[0];

  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="CROSS-PRODUCT VALUATION SUITE"
        title="Advanced Scenario Simulation & Comparison"
        description="Stress-test structured products under severe market shocks, examine payoff sensitivities, and replay historical observation windows."
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

      {/* Navigation Tabs */}
      <div className="segmented" style={{ width: "100%", padding: "4px" }}>
        <button
          type="button"
          className={activeTab === "shocks" ? "active" : ""}
          onClick={() => setActiveTab("shocks")}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
        >
          <Sliders size={16} /> Market Shocks & Side-by-Side
        </button>
        <button
          type="button"
          className={activeTab === "sensitivity" ? "active" : ""}
          onClick={() => setActiveTab("sensitivity")}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
        >
          <TrendingUp size={16} /> Sensitivity Curve & Thresholds
        </button>
        <button
          type="button"
          className={activeTab === "historical" ? "active" : ""}
          onClick={() => setActiveTab("historical")}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
        >
          <History size={16} /> Historical Scenario Replay
        </button>
      </div>

      {/* Product Selection Bar */}
      <div className="card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <strong style={{ fontSize: "14px", color: "#f8fafc" }}>
              {activeTab === "shocks" ? "Compared Products in Scenario Matrix:" : "Focus Product for Detailed Analysis:"}
            </strong>
            <p className="muted" style={{ margin: "2px 0 0 0", fontSize: "12px" }}>
              {activeTab === "shocks"
                ? "All selected products are evaluated under identical market shocks side-by-side."
                : "Select the specific structure to chart thresholds and historical rolling windows."}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {selectedProducts.map((p, idx) => (
              <button
                key={p.product_id}
                type="button"
                className={activeProductIndex === idx ? "btn-primary" : "btn-secondary"}
                onClick={() => setActiveProductIndex(idx)}
                style={{ fontSize: "12px", padding: "6px 12px", minHeight: "34px" }}
              >
                {p.product_name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab 1: Market Shocks Controls */}
      {activeTab === "shocks" && (
        <div className="card" style={{ padding: "16px 20px", display: "grid", gap: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles size={16} color="#38bdf8" />
              <strong style={{ fontSize: "13px" }}>Configurable Underlying Shocks:</strong>
            </div>
            <button
              type="button"
              className="text-link"
              onClick={resetStandardShocks}
              style={{ fontSize: "12px" }}
            >
              Reset to Standard (-40%, -20%, -10%, 0%, +10%, +20%)
            </button>
          </div>

          <form onSubmit={handleAddShock} style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="number"
              step="any"
              placeholder="e.g. -35 or 50"
              value={customShockInput}
              onChange={(e) => setCustomShockInput(e.target.value)}
              style={{ maxWidth: "160px", height: "36px" }}
            />
            <button type="submit" className="btn-secondary" style={{ height: "36px", fontSize: "12px" }}>
              Add Shock %
            </button>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {customShocks.map((s) => (
                <span
                  key={s}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "#1e293b",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                >
                  {s > 0 ? `+${s}%` : `${s}%`}
                  {customShocks.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setCustomShocks(customShocks.filter((x) => x !== s))}
                      style={{ background: "transparent", border: 0, color: "#94a3b8", cursor: "pointer", padding: 0 }}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Sensitivity Controls */}
      {activeTab === "sensitivity" && (
        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
            <label className="field" style={{ margin: 0 }}>
              Minimum Shock (%)
              <input
                type="number"
                step="5"
                value={rangeMinShock}
                onChange={(e) => setRangeMinShock(parseFloat(e.target.value) || -50)}
                style={{ width: "120px" }}
              />
            </label>
            <label className="field" style={{ margin: 0 }}>
              Maximum Shock (%)
              <input
                type="number"
                step="5"
                value={rangeMaxShock}
                onChange={(e) => setRangeMaxShock(parseFloat(e.target.value) || 50)}
                style={{ width: "120px" }}
              />
            </label>
            <div style={{ fontSize: "12px", color: "#94a3b8", paddingTop: "14px" }}>
              Plots 60 evaluation points to trace non-linear kinks, caps, and barrier triggers.
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Historical Controls */}
      {activeTab === "historical" && (
        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
            <label className="field" style={{ margin: 0 }}>
              Lookback Observations
              <select
                value={lookbackObservations}
                onChange={(e) => setLookbackObservations(parseInt(e.target.value, 10))}
                style={{ height: "40px", padding: "0 10px", borderRadius: "8px" }}
              >
                <option value={126}>126 Trading Days (~6 Months)</option>
                <option value={252}>252 Trading Days (~1 Year)</option>
                <option value={504}>504 Trading Days (~2 Years)</option>
                <option value={1260}>1,260 Trading Days (~5 Years)</option>
              </select>
            </label>

            <label className="field" style={{ margin: 0 }}>
              Underlying Market Symbol
              <input
                type="text"
                value={selectedTicker}
                onChange={(e) => setSelectedTicker(e.target.value.toUpperCase())}
                style={{ width: "120px" }}
              />
            </label>

            <div style={{ fontSize: "12px", color: "#94a3b8", paddingTop: "14px" }}>
              Applies rolling windows of observed market data to reprice this structure.
            </div>
          </div>
        </div>
      )}

      {/* Error notice */}
      <ErrorNotice error={error} retry={() => setActiveTab(activeTab)} />

      {/* Loading state */}
      {loading && <Loading text="Simulating advanced scenario matrix…" />}

      {/* View 1: Market Shocks Comparison Table */}
      {activeTab === "shocks" && shocksResult && !loading && (
        <ShockComparisonTable
          shocks={shocksResult.shocks}
          products={shocksResult.products}
          rows={shocksResult.rows}
          summaryBestWorst={shocksResult.summary_best_worst}
        />
      )}

      {/* View 2: Sensitivity Curve & Thresholds */}
      {activeTab === "sensitivity" && sensitivityResult && !loading && (
        <SensitivityCurveChart
          curve={sensitivityResult.curve}
          thresholds={sensitivityResult.thresholds}
          productName={sensitivityResult.product_name}
        />
      )}

      {/* View 3: Historical Scenario Replay Panel */}
      {activeTab === "historical" && historicalResult && !loading && (
        <HistoricalReplayPanel replayData={historicalResult} />
      )}
    </div>
  );
}
