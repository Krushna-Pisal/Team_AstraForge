import React from "react";

export default function DebentureScenarioTable({
  scenarios = [],
  currency = "INR",
}) {

  if (!scenarios || scenarios.length === 0) {
    return null;
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="card" style={{ padding: "20px", display: "grid", gap: "14px" }}>
      <div>
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 650 }}>
          Yield Sensitivity Matrix (Interest Rate Shocks)
        </h3>
        <p className="muted" style={{ margin: "4px 0 0 0", fontSize: "13px" }}>
          Impact of market interest rate movements on debenture present value and premium/discount status.
        </p>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="table" style={{ width: "100%", fontSize: "13px" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Market Yield (%)</th>
              <th style={{ textAlign: "right" }}>Yield Shock (bps)</th>
              <th style={{ textAlign: "right" }}>Present Value ({currency})</th>
              <th style={{ textAlign: "right" }}>Price Impact ({currency})</th>
              <th style={{ textAlign: "right" }}>Change (%)</th>
              <th style={{ textAlign: "center" }}>Pricing vs Par</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((sc, idx) => {
              const isBase = sc.shock_bps === 0;
              const isGain = sc.price_change_vs_pv > 0;
              const isDrop = sc.price_change_vs_pv < 0;

              return (
                <tr
                  key={idx}
                  style={{
                    backgroundColor: isBase ? "rgba(56, 189, 248, 0.08)" : "transparent",
                    borderBottom: "1px solid #1e2c3d",
                  }}
                >
                  <td style={{ fontWeight: isBase ? 650 : 400 }}>
                    {sc.yield_pct.toFixed(2)}%
                    {isBase && (
                      <span
                        style={{
                          marginLeft: "6px",
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "#0369a1",
                          color: "#e0f2fe",
                        }}
                      >
                        CURRENT
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      color: sc.shock_bps > 0 ? "#f87171" : sc.shock_bps < 0 ? "#34d399" : "#94a3b8",
                    }}
                  >
                    {sc.shock_bps > 0 ? `+${sc.shock_bps}` : `${sc.shock_bps}`} bps
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    {formatCurrency(sc.present_value)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: 500,
                      color: isGain ? "#34d399" : isDrop ? "#f87171" : "#94a3b8",
                    }}
                  >
                    {isGain ? `+` : ``}
                    {formatCurrency(sc.price_change_vs_pv)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: 600,
                      color: isGain ? "#34d399" : isDrop ? "#f87171" : "#94a3b8",
                    }}
                  >
                    {isGain ? `+` : ``}
                    {sc.price_change_pct.toFixed(2)}%
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontWeight: 500,
                        backgroundColor:
                          sc.price_status === "Premium"
                            ? "#312e81"
                            : sc.price_status === "Discount"
                            ? "#451a03"
                            : "#134e4a",
                        color:
                          sc.price_status === "Premium"
                            ? "#c7d2fe"
                            : sc.price_status === "Discount"
                            ? "#fed7aa"
                            : "#99f6e4",
                      }}
                    >
                      {sc.price_status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
