import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";

function CustomTooltip({ active, payload, currency }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isPositive = data.profit_loss >= 0;
    return (
      <div
        style={{
          background: "#0c1726",
          border: "1px solid #293d56",
          borderRadius: "8px",
          padding: "12px 14px",
          fontSize: "12px",
          color: "#e2e8f0",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          minWidth: "190px",
        }}
      >
        <div style={{ fontWeight: 600, color: "#93c5fd", marginBottom: "6px" }}>
          Underlying Price: {currency} {data.underlying_price.toLocaleString()}
          <span style={{ fontSize: "11px", color: "#94a3b8", marginLeft: "6px" }}>
            ({data.underlying_return_pct >= 0 ? `+${data.underlying_return_pct}%` : `${data.underlying_return_pct}%`})
          </span>
        </div>
        <div style={{ display: "grid", gap: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8" }}>Gross Payoff:</span>
            <span style={{ fontWeight: 500 }}>
              {currency} {data.payoff.toLocaleString()}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8" }}>Net Profit/Loss:</span>
            <span
              style={{
                fontWeight: 650,
                color: isPositive ? "#34d399" : "#f87171",
              }}
            >
              {data.profit_loss >= 0 ? `+${currency} ` : `-${currency} `}
              {Math.abs(data.profit_loss).toLocaleString()}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8" }}>Return %:</span>
            <span
              style={{
                fontWeight: 600,
                color: isPositive ? "#34d399" : "#f87171",
              }}
            >
              {data.return_pct >= 0 ? `+${data.return_pct}%` : `${data.return_pct}%`}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default function OptionsPayoffChart({
  curve,
  strikePrice,
  breakEvenPrice,
  currentPrice,
  position = "LONG",
  optionType = "CALL",
  currency = "INR",
}) {
  const [viewMode, setViewMode] = useState("profit_loss"); // "profit_loss", "payoff", "both"

  if (!curve || curve.length === 0) {
    return (
      <div className="card empty-state" style={{ padding: "40px 20px" }}>
        <p className="muted">No payoff curve data available.</p>
      </div>
    );
  }

  const formatNumber = (val) => {
    if (val === null || val === undefined) return "0";
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 1,
      notation: Math.abs(val) >= 100000 ? "compact" : "standard",
    }).format(val);
  };


  return (
    <div className="card" style={{ padding: "20px", display: "grid", gap: "16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 650 }}>
            Payoff & Profit/Loss Profile at Expiry
          </h3>
          <p className="muted" style={{ margin: "4px 0 0 0", fontSize: "13px" }}>
            European terminal valuation comparing Net P/L and Gross Payoff
          </p>
        </div>
        <div className="segmented" style={{ padding: "3px" }}>
          <button
            type="button"
            className={viewMode === "profit_loss" ? "active" : ""}
            onClick={() => setViewMode("profit_loss")}
            style={{ padding: "6px 12px", minHeight: "34px", fontSize: "13px" }}
          >
            Net Profit / Loss
          </button>
          <button
            type="button"
            className={viewMode === "payoff" ? "active" : ""}
            onClick={() => setViewMode("payoff")}
            style={{ padding: "6px 12px", minHeight: "34px", fontSize: "13px" }}
          >
            Gross Payoff
          </button>
          <button
            type="button"
            className={viewMode === "both" ? "active" : ""}
            onClick={() => setViewMode("both")}
            style={{ padding: "6px 12px", minHeight: "34px", fontSize: "13px" }}
          >
            Both Views
          </button>
        </div>
      </div>

      <div style={{ width: "100%", height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={curve}
            margin={{ top: 20, right: 25, left: 10, bottom: 20 }}
          >
            <CartesianGrid stroke="#1e2c3d" strokeDasharray="3 4" vertical={false} />
            <XAxis
              dataKey="underlying_price"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => formatNumber(v)}
              stroke="#64748b"
              fontSize={11}
              label={{
                value: `Underlying Asset Price (${currency})`,
                position: "insideBottom",
                offset: -12,
                fill: "#94a3b8",
                fontSize: 12,
              }}
            />
            <YAxis
              tickFormatter={(v) => formatNumber(v)}
              stroke="#64748b"
              fontSize={11}
              label={{
                value: `Value (${currency})`,
                angle: -90,
                position: "insideLeft",
                offset: 5,
                fill: "#94a3b8",
                fontSize: 12,
              }}
            />
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: 10, fontSize: 12 }}
            />

            {/* Zero P/L Baseline */}
            <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />

            {/* Strike Price Reference */}
            {strikePrice && (
              <ReferenceLine
                x={strikePrice}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Strike: ${strikePrice}`,
                  fill: "#f59e0b",
                  fontSize: 11,
                  position: "top",
                }}
              />
            )}

            {/* Break-Even Reference */}
            {breakEvenPrice && breakEvenPrice > 0 && (
              <ReferenceLine
                x={breakEvenPrice}
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `BE: ${breakEvenPrice}`,
                  fill: "#10b981",
                  fontSize: 11,
                  position: "insideTopLeft",
                }}
              />
            )}

            {/* Current Spot Reference */}
            {currentPrice && (
              <ReferenceLine
                x={currentPrice}
                stroke="#38bdf8"
                strokeDasharray="2 3"
                strokeWidth={1}
                label={{
                  value: `Spot: ${currentPrice}`,
                  fill: "#38bdf8",
                  fontSize: 10,
                  position: "bottom",
                }}
              />
            )}

            {(viewMode === "profit_loss" || viewMode === "both") && (
              <Line
                type="monotone"
                dataKey="profit_loss"
                name="Net Profit / Loss"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6, fill: "#38bdf8" }}
              />
            )}

            {(viewMode === "payoff" || viewMode === "both") && (
              <Line
                type="monotone"
                dataKey="payoff"
                name="Gross Payoff"
                stroke="#a855f7"
                strokeWidth={2}
                strokeDasharray={viewMode === "both" ? "4 4" : undefined}
                dot={false}
                activeDot={{ r: 5, fill: "#a855f7" }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div
        style={{
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          fontSize: "12px",
          color: "#94a3b8",
          paddingTop: "6px",
          borderTop: "1px solid #1e2c3d",
        }}
      >
        <span>
          <strong style={{ color: "#f59e0b" }}>---</strong> Strike ({strikePrice})
        </span>
        <span>
          <strong style={{ color: "#10b981" }}>---</strong> Break-even ({breakEvenPrice})
        </span>
        <span>
          <strong style={{ color: "#38bdf8" }}>---</strong> Current Spot ({currentPrice})
        </span>
        <span>
          Position: <strong style={{ color: "#e2e8f0" }}>{position} {optionType}</strong>
        </span>
      </div>
    </div>
  );
}
