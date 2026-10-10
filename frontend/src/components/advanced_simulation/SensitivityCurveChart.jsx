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

function CustomSensTooltip({ active, payload, currency }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isPositive = data.net_profit_loss >= 0;
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
          minWidth: "200px",
        }}
      >
        <div style={{ fontWeight: 600, color: "#93c5fd", marginBottom: "6px" }}>
          Price: {currency} {data.underlying_price.toLocaleString()}
          <span style={{ fontSize: "11px", color: "#94a3b8", marginLeft: "6px" }}>
            ({data.shock_pct >= 0 ? `+${data.shock_pct}%` : `${data.shock_pct}%`})
          </span>
        </div>
        <div style={{ display: "grid", gap: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8" }}>Gross Payoff:</span>
            <span style={{ fontWeight: 500 }}>
              {currency} {data.gross_payoff.toLocaleString()}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8" }}>Net Profit/Loss:</span>
            <span style={{ fontWeight: 650, color: isPositive ? "#34d399" : "#f87171" }}>
              {data.net_profit_loss >= 0 ? `+` : ``}{currency} {data.net_profit_loss.toLocaleString()}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8" }}>Return %:</span>
            <span style={{ fontWeight: 600, color: isPositive ? "#34d399" : "#f87171" }}>
              {data.return_pct >= 0 ? `+` : ``}{data.return_pct}%
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default function SensitivityCurveChart({
  curve = [],
  thresholds = [],
  productName = "Product",
  currency = "INR",
}) {
  const [metricView, setMetricView] = useState("both"); // "both", "net_pl", "gross_payoff"

  if (!curve || curve.length === 0) {
    return (
      <div className="card empty-state" style={{ padding: "30px 20px" }}>
        <p className="muted">No sensitivity curve data available.</p>
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 650 }}>
            Payoff Sensitivity Profile: {productName}
          </h3>
          <p className="muted" style={{ margin: "4px 0 0 0", fontSize: "13px" }}>
            Visualizes payout response across shock spectrum and identifies contractual threshold triggers.
          </p>
        </div>
        <div className="segmented" style={{ padding: "3px" }}>
          <button
            type="button"
            className={metricView === "both" ? "active" : ""}
            onClick={() => setMetricView("both")}
            style={{ padding: "5px 12px", minHeight: "32px", fontSize: "12px" }}
          >
            Gross & Net
          </button>
          <button
            type="button"
            className={metricView === "net_pl" ? "active" : ""}
            onClick={() => setMetricView("net_pl")}
            style={{ padding: "5px 12px", minHeight: "32px", fontSize: "12px" }}
          >
            Net Profit/Loss Only
          </button>
          <button
            type="button"
            className={metricView === "gross_payoff" ? "active" : ""}
            onClick={() => setMetricView("gross_payoff")}
            style={{ padding: "5px 12px", minHeight: "32px", fontSize: "12px" }}
          >
            Gross Payoff Only
          </button>
        </div>
      </div>

      <div style={{ width: "100%", height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={curve} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid stroke="#1e2c3d" strokeDasharray="3 4" vertical={false} />
            <XAxis
              dataKey="shock_pct"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => `${v}%`}
              stroke="#64748b"
              fontSize={11}
              label={{
                value: "Underlying Price Movement / Shock (%)",
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
            <Tooltip content={<CustomSensTooltip currency={currency} />} />
            <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 10, fontSize: 12 }} />

            {/* Zero Baseline */}
            <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
            <ReferenceLine x={0} stroke="#334155" strokeDasharray="3 3" />

            {/* Contractual Threshold Reference Lines */}
            {thresholds.map((th, i) => (
              <ReferenceLine
                key={i}
                x={th.shock_pct}
                stroke={th.color}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: th.label,
                  fill: th.color,
                  fontSize: 11,
                  position: "top",
                }}
              />
            ))}

            {(metricView === "both" || metricView === "gross_payoff") && (
              <Line
                type="monotone"
                dataKey="gross_payoff"
                name="Gross Payoff"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, fill: "#a855f7" }}
              />
            )}

            {(metricView === "both" || metricView === "net_pl") && (
              <Line
                type="monotone"
                dataKey="net_profit_loss"
                name="Net Profit / Loss"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6, fill: "#38bdf8" }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Threshold Key Badges */}
      {thresholds.length > 0 && (
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", paddingTop: "8px", borderTop: "1px solid #1e2c3d" }}>
          {thresholds.map((th, i) => (
            <div
              key={i}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                background: "#0c1726",
                padding: "4px 10px",
                borderRadius: "6px",
                border: `1px solid ${th.color}40`,
              }}
            >
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: th.color }} />
              <strong style={{ color: "#f8fafc" }}>{th.label}</strong>
              <span style={{ color: "#94a3b8" }}>({currency} {th.price_level.toLocaleString()})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
