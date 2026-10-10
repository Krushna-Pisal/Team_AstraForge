import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { PageTitle, Metric, ErrorNotice, Loading } from "../components/ui/Workflow";
import OptionsPayoffChart from "../components/options/OptionsPayoffChart";
import OptionsScenarioTable from "../components/options/OptionsScenarioTable";
import {
  TrendingUp,
  ArrowLeft,
  AlertTriangle,
  Info,
  Sliders,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export default function OptionsSimulator({ isClientPortal = false }) {
  // Input states
  const [optionType, setOptionType] = useState("CALL"); // "CALL" or "PUT"
  const [position, setPosition] = useState("LONG"); // "LONG" or "SHORT"
  const [underlyingPrice, setUnderlyingPrice] = useState(22000);
  const [strikePrice, setStrikePrice] = useState(22000);
  const [premium, setPremium] = useState(250);
  const [quantity, setQuantity] = useState(2);
  const [multiplier, setMultiplier] = useState(50);
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split("T")[0];
  });
  const [currency, setCurrency] = useState("INR");
  const [ticker, setTicker] = useState("NIFTY 50");

  // Configurable Scenarios state
  const [customPriceInput, setCustomPriceInput] = useState("");
  const [customPrices, setCustomPrices] = useState([]);

  // Results state
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Quick preset selector
  const applyPreset = (presetType) => {
    switch (presetType) {
      case "LONG_CALL":
        setOptionType("CALL");
        setPosition("LONG");
        setUnderlyingPrice(22000);
        setStrikePrice(22000);
        setPremium(250);
        break;
      case "SHORT_CALL":
        setOptionType("CALL");
        setPosition("SHORT");
        setUnderlyingPrice(22000);
        setStrikePrice(22200);
        setPremium(180);
        break;
      case "LONG_PUT":
        setOptionType("PUT");
        setPosition("LONG");
        setUnderlyingPrice(22000);
        setStrikePrice(22000);
        setPremium(230);
        break;
      case "SHORT_PUT":
        setOptionType("PUT");
        setPosition("SHORT");
        setUnderlyingPrice(22000);
        setStrikePrice(21800);
        setPremium(190);
        break;
      default:
        break;
    }
  };

  const runSimulation = async () => {
    if (underlyingPrice <= 0 || strikePrice <= 0 || premium < 0 || quantity <= 0 || multiplier <= 0) {
      setError("Please ensure all parameters are valid positive numbers.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        underlying_price: Number(underlyingPrice),
        strike_price: Number(strikePrice),
        premium: Number(premium),
        quantity: Number(quantity),
        multiplier: Number(multiplier),
        expiry_date: expiryDate || "2026-11-30",
        option_type: optionType,
        position: position,
        ticker: ticker,
        custom_scenarios: customPrices.length > 0 ? customPrices : null,
      };

      const data = await api("/api/options/simulate", { body: payload });
      setSimulation(data);
    } catch (err) {
      console.error("Options simulation failed:", err);
      setError(err.message || "Failed to execute options simulation.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [optionType, position, underlyingPrice, strikePrice, premium, quantity, multiplier, customPrices]);

  const handleAddCustomPrice = (e) => {
    e.preventDefault();
    const val = parseFloat(customPriceInput);
    if (!isNaN(val) && val > 0 && !customPrices.includes(val)) {
      setCustomPrices([...customPrices, val].sort((a, b) => a - b));
      setCustomPriceInput("");
    }
  };

  const handleRemoveCustomPrice = (valToRemove) => {
    setCustomPrices(customPrices.filter((p) => p !== valToRemove));
  };

  const resetCustomPrices = () => {
    setCustomPrices([]);
    setCustomPriceInput("");
  };

  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="DERIVATIVES ENGINE"
        title="Options Payoff Simulator"
        description="Model European Call and Put expiry payoffs, break-even levels, scenarios, and net profit/loss profiles."
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

      {/* Quick Preset Buttons */}
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
            <strong style={{ fontSize: "14px" }}>Quick Strategies:</strong>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              className={optionType === "CALL" && position === "LONG" ? "btn-primary" : "btn-secondary"}
              onClick={() => applyPreset("LONG_CALL")}
              style={{ fontSize: "12px", padding: "6px 12px", minHeight: "34px" }}
            >
              Long Call
            </button>
            <button
              type="button"
              className={optionType === "CALL" && position === "SHORT" ? "btn-primary" : "btn-secondary"}
              onClick={() => applyPreset("SHORT_CALL")}
              style={{ fontSize: "12px", padding: "6px 12px", minHeight: "34px" }}
            >
              Short Call
            </button>
            <button
              type="button"
              className={optionType === "PUT" && position === "LONG" ? "btn-primary" : "btn-secondary"}
              onClick={() => applyPreset("LONG_PUT")}
              style={{ fontSize: "12px", padding: "6px 12px", minHeight: "34px" }}
            >
              Long Put
            </button>
            <button
              type="button"
              className={optionType === "PUT" && position === "SHORT" ? "btn-primary" : "btn-secondary"}
              onClick={() => applyPreset("SHORT_PUT")}
              style={{ fontSize: "12px", padding: "6px 12px", minHeight: "34px" }}
            >
              Short Put
            </button>
          </div>
        </div>
      </div>

      {/* Simulator Inputs Configuration */}
      <section className="card" style={{ padding: "22px", display: "grid", gap: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "16px", margin: 0, fontWeight: 650 }}>Contract Parameters</h2>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
            Contract Size: {quantity * multiplier} units ({quantity} contracts × {multiplier})
          </span>
        </div>

        <div className="choice-grid" style={{ gap: "16px" }}>
          {/* Option Type Selector */}
          <div className="field">
            <label>Option Type</label>
            <div className="segmented" style={{ width: "100%" }}>
              <button
                type="button"
                className={optionType === "CALL" ? "active" : ""}
                onClick={() => setOptionType("CALL")}
                style={{ flex: 1 }}
              >
                Call Option (Right to Buy)
              </button>
              <button
                type="button"
                className={optionType === "PUT" ? "active" : ""}
                onClick={() => setOptionType("PUT")}
                style={{ flex: 1 }}
              >
                Put Option (Right to Sell)
              </button>
            </div>
          </div>

          {/* Position Selector */}
          <div className="field">
            <label>Market Position</label>
            <div className="segmented" style={{ width: "100%" }}>
              <button
                type="button"
                className={position === "LONG" ? "active" : ""}
                onClick={() => setPosition("LONG")}
                style={{ flex: 1 }}
              >
                Long (Buyer / Holder)
              </button>
              <button
                type="button"
                className={position === "SHORT" ? "active" : ""}
                onClick={() => setPosition("SHORT")}
                style={{ flex: 1 }}
              >
                Short (Seller / Writer)
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <label className="field">
            Underlying Price S₀ ({currency})
            <input
              type="number"
              step="any"
              min="0.01"
              value={underlyingPrice}
              onChange={(e) => setUnderlyingPrice(parseFloat(e.target.value) || 0)}
            />
          </label>

          <label className="field">
            Strike Price K ({currency})
            <input
              type="number"
              step="any"
              min="0.01"
              value={strikePrice}
              onChange={(e) => setStrikePrice(parseFloat(e.target.value) || 0)}
            />
          </label>

          <label className="field">
            Option Premium per share ({currency})
            <input
              type="number"
              step="any"
              min="0"
              value={premium}
              onChange={(e) => setPremium(parseFloat(e.target.value) || 0)}
            />
          </label>

          <label className="field">
            Number of Contracts (Quantity)
            <input
              type="number"
              step="1"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
            />
          </label>

          <label className="field">
            Contract Multiplier
            <input
              type="number"
              step="1"
              min="1"
              value={multiplier}
              onChange={(e) => setMultiplier(parseInt(e.target.value, 10) || 1)}
            />
          </label>

          <label className="field">
            Expiration Date
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </label>
        </div>

        {/* Configurable scenario price tags */}
        <div style={{ paddingTop: "10px", borderTop: "1px solid #1e2c3d" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600 }}>Custom Underlying Scenarios (Optional)</span>
            {customPrices.length > 0 && (
              <button
                type="button"
                onClick={resetCustomPrices}
                className="text-link"
                style={{ fontSize: "12px" }}
              >
                Reset to standard shocks
              </button>
            )}
          </div>
          <form onSubmit={handleAddCustomPrice} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="number"
              placeholder="e.g. 23500"
              value={customPriceInput}
              onChange={(e) => setCustomPriceInput(e.target.value)}
              style={{ maxWidth: "180px", height: "38px" }}
            />
            <button type="submit" className="btn-secondary" style={{ height: "38px", fontSize: "13px" }}>
              Add Scenario Price
            </button>
            <span className="muted" style={{ fontSize: "12px" }}>
              Leave empty to automatically generate -40% to +40% range with strike & break-even points.
            </span>
          </form>

          {customPrices.length > 0 && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
              {customPrices.map((p) => (
                <span
                  key={p}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#1e293b",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                >
                  {currency} {p.toLocaleString()}
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomPrice(p)}
                    style={{ background: "transparent", border: 0, color: "#94a3b8", cursor: "pointer", padding: 0 }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Error Notice */}
      <ErrorNotice error={error} retry={runSimulation} />

      {/* Key Metrics / Financial Summaries */}
      {simulation && (
        <section className="stats-grid">
          <Metric
            label="Break-Even Price"
            value={`${currency} ${simulation.break_even_price.toLocaleString()}`}
            hint={
              optionType === "CALL"
                ? `Strike (${simulation.strike_price}) + Premium (${simulation.premium})`
                : `Strike (${simulation.strike_price}) - Premium (${simulation.premium})`
            }
            tone="info"
          />

          <Metric
            label="Total Premium Outlay"
            value={`${currency} ${simulation.total_premium.toLocaleString()}`}
            hint={
              position === "LONG"
                ? "Net debit paid upfront (Max loss)"
                : "Net credit collected upfront (Max profit)"
            }
          />

          <Metric
            label="Maximum Profit"
            value={simulation.max_profit_label === "Unlimited" ? "Unlimited ∞" : `${currency} ${simulation.max_profit_label}`}
            hint={
              position === "LONG" && optionType === "CALL"
                ? "Uncapped upside potential as price rises"
                : position === "SHORT"
                ? "Capped at total premium collected"
                : `Occurs at underlying price = 0`
            }
            tone={simulation.max_profit_label === "Unlimited" ? "positive" : ""}
          />

          <Metric
            label="Maximum Loss"
            value={simulation.max_loss_label === "Unlimited" ? "Unlimited ∞" : `${currency} ${simulation.max_loss_label}`}
            hint={
              position === "SHORT" && optionType === "CALL"
                ? "Uncapped risk if asset price surges"
                : position === "LONG"
                ? "Risk capped strictly to initial premium"
                : `Occurs if asset declines to zero`
            }
            tone={simulation.max_loss_label === "Unlimited" ? "negative" : "warning"}
          />
        </section>
      )}

      {/* Loading state */}
      {loading && !simulation && <Loading text="Simulating options payoff profile…" />}

      {/* Chart Section */}
      {simulation && (
        <OptionsPayoffChart
          curve={simulation.curve}
          strikePrice={simulation.strike_price}
          breakEvenPrice={simulation.break_even_price}
          currentPrice={simulation.underlying_price}
          position={simulation.position}
          optionType={simulation.option_type}
          currency={currency}
        />
      )}

      {/* Scenario Table Section */}
      {simulation && (
        <OptionsScenarioTable
          scenarios={simulation.scenarios}
          strikePrice={simulation.strike_price}
          breakEvenPrice={simulation.break_even_price}
          currency={currency}
        />
      )}

      {/* Formula & Rules Explanation */}
      {simulation && (
        <div className="card" style={{ padding: "18px", display: "grid", gap: "8px", background: "#0c1726" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#38bdf8" }}>
            <Info size={16} />
            <strong style={{ fontSize: "14px" }}>Formula & Mechanics at Expiry</strong>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "#cbd5e1", lineHeight: 1.6 }}>
            {simulation.formula_explanation}
          </p>
        </div>
      )}

      {/* Critical Assumptions & Disclaimers Warning */}
      <div
        className="card"
        style={{
          padding: "16px 20px",
          borderLeft: "4px solid #f59e0b",
          background: "#171821",
          display: "flex",
          gap: "12px",
          alignItems: "flex-start",
        }}
      >
        <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: "2px" }} />
        <div style={{ display: "grid", gap: "4px", fontSize: "12px", color: "#94a3b8", lineHeight: 1.55 }}>
          <strong style={{ color: "#fde68a", fontSize: "13px" }}>
            Simplified Expiry-Payoff Model Notice
          </strong>
          <p style={{ margin: 0 }}>
            {simulation?.assumptions_and_warnings ||
              "This simulator models European-style option payoff strictly at expiration based on intrinsic value. It is NOT a complete options-pricing model (such as Black-Scholes or Binomial Trees) and excludes Greeks (Delta, Gamma, Theta, Vega), time decay, implied volatility dynamics, borrowing costs, early exercise, exchange margins, and brokerage fees."}
          </p>
        </div>
      </div>
    </div>
  );
}
