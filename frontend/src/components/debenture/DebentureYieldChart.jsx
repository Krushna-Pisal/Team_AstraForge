import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

function CustomYieldTooltip({ active, payload, currency, faceValue }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isPremium = data.present_value > faceValue;
    const isDiscount = data.present_value < faceValue;
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
          Market Yield: {data.yield_pct.toFixed(2)}%
        </div>
        <div style={{ display: "grid", gap: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8" }}>Present Value:</span>
            <span style={{ fontWeight: 650, color: "#38bdf8" }}>
              {currency} {Number(data.present_value).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8" }}>Status:</span>
            <span
              style={{
                fontWeight: 600,
                color: isPremium ? "#a78bfa" : isDiscount ? "#f59e0b" : "#34d399",
              }}
            >
              {isPremium ? "Premium to Par" : isDiscount ? "Discount to Par" : "At Par"}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export default function DebentureYieldChart({
  curve,
  marketYieldPct,
  ytmPct,
  faceValue,
  purchasePrice,
  currency = "INR",
}) {
  if (!curve || curve.length === 0) {
    return (
      <div className="card empty-state" style={{ padding: "40px 20px" }}>
        <p className="muted">No yield curve data available.</p>
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
            Debenture Price vs Market Yield (Yield Sensitivity Curve)
          </h3>
          <p className="muted" style={{ margin: "4px 0 0 0", fontSize: "13px" }}>
            Inverse relationship between market interest rates and debenture present value
          </p>
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
              dataKey="yield_pct"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => v + "%"}
              stroke="#64748b"
              fontSize={11}
              label={{
                value: "Market Yield to Maturity (%)",
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
                value: `Present Value (${currency})`,
                angle: -90,
                position: "insideLeft",
                offset: 5,
                fill: "#94a3b8",
                fontSize: 12,
              }}
            />
            <Tooltip content={<CustomYieldTooltip currency={currency} faceValue={faceValue} />} />

            {/* Par Face Value Reference Line */}
            {faceValue && (
              <ReferenceLine
                y={faceValue}
                stroke="#64748b"
                strokeDasharray="4 4"
                label={{
                  value: `Par: ${formatNumber(faceValue)}`,
                  fill: "#94a3b8",
                  fontSize: 11,
                  position: "right",
                }}
              />
            )}

            {/* Purchase Price Reference Line */}
            {purchasePrice && Math.abs(purchasePrice - faceValue) > 0.01 && (
              <ReferenceLine
                y={purchasePrice}
                stroke="#a855f7"
                strokeDasharray="3 3"
                label={{
                  value: `Cost: ${formatNumber(purchasePrice)}`,
                  fill: "#a855f7",
                  fontSize: 11,
                  position: "left",
                }}
              />
            )}

            {/* Prevailing Market Yield Reference Line */}
            {marketYieldPct && (
              <ReferenceLine
                x={marketYieldPct}
                stroke="#38bdf8"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Market: ${marketYieldPct}%`,
                  fill: "#38bdf8",
                  fontSize: 11,
                  position: "top",
                }}
              />
            )}

            {/* Implied YTM Reference Line */}
            {ytmPct && (
              <ReferenceLine
                x={ytmPct}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={{
                  value: `Implied YTM: ${ytmPct.toFixed(2)}%`,
                  fill: "#f59e0b",
                  fontSize: 11,
                  position: "bottom",
                }}
              />
            )}

            <Line
              type="monotone"
              dataKey="present_value"
              name="Present Value"
              stroke="#38bdf8"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6, fill: "#38bdf8" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div
        style={{
          display: "flex",
          gap: "18px",
          flexWrap: "wrap",
          fontSize: "12px",
          color: "#94a3b8",
          paddingTop: "6px",
          borderTop: "1px solid #1e2c3d",
        }}
      >
        <span>
          <strong style={{ color: "#38bdf8" }}>---</strong> Market Yield ({marketYieldPct}%)
        </span>
        <span>
          <strong style={{ color: "#f59e0b" }}>---</strong> Implied YTM ({ytmPct ? ytmPct.toFixed(2) : "-"}%)
        </span>
        <span>
          <strong style={{ color: "#64748b" }}>---</strong> Face Value Par ({faceValue})
        </span>
        {purchasePrice && Math.abs(purchasePrice - faceValue) > 0.01 && (
          <span>
            <strong style={{ color: "#a855f7" }}>---</strong> Purchase Price ({purchasePrice})
          </span>
        )}
      </div>
    </div>
  );
}
