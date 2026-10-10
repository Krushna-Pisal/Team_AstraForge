import React from "react";

export default function ShockComparisonTable({
  shocks = [],
  products = [],
  rows = [],
  summaryBestWorst = [],
  currency = "INR",
}) {
  if (!rows || rows.length === 0) {
    return (
      <div className="card empty-state" style={{ padding: "30px 20px" }}>
        <p className="muted">No shock comparisons generated yet.</p>
      </div>
    );
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="card" style={{ padding: "20px", display: "grid", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 650 }}>
            Side-by-Side Market Shock Comparison Matrix
          </h3>
          <p className="muted" style={{ margin: "4px 0 0 0", fontSize: "13px" }}>
            Terminal Gross Payoff vs Net Profit/Loss across standardized underlying price movements.
          </p>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="table" style={{ width: "100%", fontSize: "13px" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", width: "130px" }}>Market Shock</th>
              {products.map((p) => (
                <th key={p.product_id} style={{ textAlign: "right", minWidth: "190px" }}>
                  <div style={{ fontWeight: 650, color: "#f8fafc" }}>{p.product_name}</div>
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      backgroundColor: "#1e293b",
                      color: "#94a3b8",
                      fontWeight: 500,
                    }}
                  >
                    {p.product_type} ({p.currency})
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => {
              const isBase = Math.abs(row.shock_pct) < 0.01;
              return (
                <tr
                  key={rIdx}
                  style={{
                    backgroundColor: isBase ? "rgba(56, 189, 248, 0.08)" : "transparent",
                    borderBottom: "1px solid #1e2c3d",
                  }}
                >
                  <td style={{ fontWeight: isBase ? 650 : 500 }}>
                    <div style={{ fontSize: "14px", color: row.shock_pct > 0 ? "#38bdf8" : row.shock_pct < 0 ? "#f87171" : "#e2e8f0" }}>
                      {row.shock_pct > 0 ? `+${row.shock_pct}%` : `${row.shock_pct}%`}
                    </div>
                    {isBase && (
                      <span style={{ fontSize: "10px", color: "#38bdf8", fontWeight: 600 }}>
                        BASE SCENARIO
                      </span>
                    )}
                  </td>
                  {products.map((p) => {
                    const out = row.outcomes[p.product_id];
                    if (!out) return <td key={p.product_id} style={{ textAlign: "right" }}>-</td>;

                    const isProfit = out.net_profit_loss > 0;
                    const isLoss = out.net_profit_loss < 0;

                    return (
                      <td key={p.product_id} style={{ textAlign: "right", padding: "10px 12px" }}>
                        <div style={{ display: "grid", gap: "2px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8" }}>
                            <span>Payoff (Gross):</span>
                            <span>{p.currency} {formatCurrency(out.gross_payoff)}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                            <span style={{ color: "#94a3b8" }}>Net P/L:</span>
                            <span style={{ color: isProfit ? "#34d399" : isLoss ? "#f87171" : "#cbd5e1" }}>
                              {out.net_profit_loss >= 0 ? `+` : ``}{p.currency} {formatCurrency(out.net_profit_loss)}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 700 }}>
                            <span style={{ color: "#94a3b8" }}>Return %:</span>
                            <span style={{ color: isProfit ? "#34d399" : isLoss ? "#f87171" : "#cbd5e1" }}>
                              {out.return_pct >= 0 ? `+` : ``}{out.return_pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Best and Worst Outcome Highlights */}
      {summaryBestWorst && summaryBestWorst.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px", paddingTop: "8px" }}>
          {summaryBestWorst.map((bw) => (
            <div
              key={bw.product_id}
              style={{
                background: "#0c1726",
                border: "1px solid #1e2c3d",
                borderRadius: "8px",
                padding: "12px 14px",
                fontSize: "12px",
              }}
            >
              <strong style={{ color: "#f8fafc", fontSize: "13px" }}>{bw.product_name}</strong>
              <div style={{ display: "grid", gap: "4px", marginTop: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Best Outcome ({bw.best_shock_pct >= 0 ? "+" : ""}{bw.best_shock_pct}%):</span>
                  <span style={{ fontWeight: 650, color: "#34d399" }}>
                    +{bw.best_return_pct.toFixed(1)}%
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Worst Outcome ({bw.worst_shock_pct >= 0 ? "+" : ""}{bw.worst_shock_pct}%):</span>
                  <span style={{ fontWeight: 650, color: "#f87171" }}>
                    {bw.worst_return_pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
