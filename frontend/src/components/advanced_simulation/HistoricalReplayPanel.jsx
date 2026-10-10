import React, { useState } from "react";
import { AlertTriangle, Database, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Metric } from "../ui/Workflow";


export default function HistoricalReplayPanel({
  replayData,
  currency = "INR",
}) {
  const [showAllWindows, setShowAllWindows] = useState(false);

  if (!replayData) {
    return (
      <div className="card empty-state" style={{ padding: "30px 20px" }}>
        <p className="muted">Run historical scenario replay to inspect past observed market performance.</p>
      </div>
    );
  }

  const {
    ticker,
    data_source,
    is_verified_live,
    date_range,
    observations_available,
    observations_used,
    windows_evaluated,
    average_return_pct,
    best_return_pct,
    worst_return_pct,
    loss_frequency_pct,
    win_frequency_pct,
    windows = [],
    warnings = [],
    methodology_disclosure,
  } = replayData;

  const displayedWindows = showAllWindows ? windows : windows.slice(0, 10);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      {/* Provenance & Warnings Banner */}
      <div
        className="card"
        style={{
          padding: "16px 20px",
          borderLeft: is_verified_live ? "4px solid #10b981" : "4px solid #f59e0b",
          background: "#0c1726",
          display: "grid",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Database size={18} color={is_verified_live ? "#10b981" : "#f59e0b"} />
            <div>
              <strong style={{ color: "#f8fafc", fontSize: "14px" }}>
                Data Provenance: {data_source}
              </strong>
              <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                Underlying Symbol: <strong>{ticker}</strong> · Date Range: {date_range} · Observations Used: {observations_used} of {observations_available}
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: "11px",
              padding: "3px 8px",
              borderRadius: "4px",
              fontWeight: 600,
              backgroundColor: is_verified_live ? "#064e3b" : "#451a03",
              color: is_verified_live ? "#a7f3d0" : "#fde68a",
            }}
          >
            {is_verified_live ? "VERIFIED LIVE FEED" : "BUNDLED HISTORICAL SNAPSHOT"}
          </span>
        </div>

        {warnings.length > 0 && (
          <div style={{ display: "grid", gap: "4px", paddingTop: "6px", borderTop: "1px solid #1e2c3d" }}>
            {warnings.map((w, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#fde68a" }}>
                <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Metrics */}
      <section className="stats-grid">
        <Metric
          label="Average Hypothetical Return"
          value={`${average_return_pct >= 0 ? "+" : ""}${average_return_pct.toFixed(2)}%`}
          hint={`Across ${windows_evaluated} rolling scenario windows`}
          tone={average_return_pct >= 0 ? "positive" : "negative"}
        />

        <Metric
          label="Best Observed Window"
          value={`+${best_return_pct.toFixed(2)}%`}
          hint="Maximum historical return"
          tone="positive"
        />

        <Metric
          label="Worst Observed Window"
          value={`${worst_return_pct.toFixed(2)}%`}
          hint="Maximum historical drawdown"
          tone="negative"
        />

        <Metric
          label="Loss Frequency"
          value={`${loss_frequency_pct.toFixed(1)}%`}
          hint={`Profitable Windows: ${win_frequency_pct.toFixed(1)}%`}
          tone={loss_frequency_pct > 25 ? "warning" : ""}
        />
      </section>

      {/* Historical Sample Windows Table */}
      <div className="card" style={{ padding: "20px", display: "grid", gap: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 650 }}>
              Sample Historical Observation Windows
            </h3>
            <p className="muted" style={{ margin: "4px 0 0 0", fontSize: "13px" }}>
              Hypothetical payouts if the product was issued at various past market dates.
            </p>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", fontSize: "13px" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Window Dates</th>
                <th style={{ textAlign: "right" }}>Start Price</th>
                <th style={{ textAlign: "right" }}>End Price</th>
                <th style={{ textAlign: "right" }}>Underlying Change</th>
                <th style={{ textAlign: "right" }}>Gross Payoff</th>
                <th style={{ textAlign: "right" }}>Net Profit / Loss</th>
                <th style={{ textAlign: "right" }}>Return (%)</th>
                <th style={{ textAlign: "center" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayedWindows.map((w, idx) => {
                const isProfit = w.net_profit_loss > 0;
                const isLoss = w.net_profit_loss < 0;

                return (
                  <tr key={idx} style={{ borderBottom: "1px solid #1e2c3d" }}>
                    <td style={{ fontWeight: 500 }}>
                      <div>{w.start_date} → {w.end_date}</div>
                    </td>
                    <td style={{ textAlign: "right" }}>{formatCurrency(w.initial_price)}</td>
                    <td style={{ textAlign: "right" }}>{formatCurrency(w.final_price)}</td>
                    <td
                      style={{
                        textAlign: "right",
                        color: w.price_change_pct > 0 ? "#38bdf8" : w.price_change_pct < 0 ? "#f87171" : "#94a3b8",
                      }}
                    >
                      {w.price_change_pct > 0 ? `+` : ``}{w.price_change_pct.toFixed(1)}%
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {currency} {formatCurrency(w.gross_payoff)}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: 600,
                        color: isProfit ? "#34d399" : isLoss ? "#f87171" : "#cbd5e1",
                      }}
                    >
                      {w.net_profit_loss >= 0 ? `+` : ``}{currency} {formatCurrency(w.net_profit_loss)}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: 700,
                        color: isProfit ? "#34d399" : isLoss ? "#f87171" : "#cbd5e1",
                      }}
                    >
                      {w.return_pct >= 0 ? `+` : ``}{w.return_pct.toFixed(1)}%
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          backgroundColor: "#1e293b",
                          color: "#cbd5e1",
                        }}
                      >
                        {w.key_event}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {windows.length > 10 && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: "8px" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowAllWindows(!showAllWindows)}
              style={{ fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              {showAllWindows ? (
                <>
                  <ChevronUp size={14} /> Show Fewer Windows
                </>
              ) : (
                <>
                  <ChevronDown size={14} /> Show All {windows.length} Windows
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Methodology & Limitations Disclosure */}
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
        <Info size={18} color="#38bdf8" style={{ flexShrink: 0, marginTop: "2px" }} />
        <div style={{ display: "grid", gap: "4px", fontSize: "12px", color: "#94a3b8", lineHeight: 1.55 }}>
          <strong style={{ color: "#e0f2fe", fontSize: "13px" }}>
            Replay Methodology Disclosure & Limitations
          </strong>
          <p style={{ margin: 0 }}>
            {methodology_disclosure}
          </p>
        </div>
      </div>
    </div>
  );
}
