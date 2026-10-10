import React from "react";

export default function OptionsScenarioTable({
  scenarios = [],
  strikePrice,
  breakEvenPrice,
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 650 }}>
            Underlying Price Scenario Table
          </h3>
          <p className="muted" style={{ margin: "4px 0 0 0", fontSize: "13px" }}>
            Terminal outcome across hypothetical underlying movements, strike price, and break-even.
          </p>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="table" style={{ width: "100%", fontSize: "13px" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Underlying Price ({currency})</th>
              <th style={{ textAlign: "right" }}>Shock (%)</th>
              <th style={{ textAlign: "center" }}>Moneyness</th>
              <th style={{ textAlign: "right" }}>Intrinsic / Share</th>
              <th style={{ textAlign: "right" }}>Gross Payoff</th>
              <th style={{ textAlign: "right" }}>Net Profit / Loss</th>
              <th style={{ textAlign: "right" }}>Return (%)</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((sc, idx) => {
              const isStrike = Math.abs(sc.underlying_price - strikePrice) < 0.01;
              const isBreakEven = Math.abs(sc.underlying_price - breakEvenPrice) < 0.01;
              const isProfitable = sc.profit_loss > 0;
              const isLoss = sc.profit_loss < 0;

              let rowBg = "transparent";
              if (isStrike) rowBg = "rgba(245, 158, 11, 0.08)";
              else if (isBreakEven) rowBg = "rgba(16, 185, 129, 0.08)";

              return (
                <tr
                  key={idx}
                  style={{
                    backgroundColor: rowBg,
                    borderBottom: "1px solid #1e2c3d",
                  }}
                >
                  <td style={{ fontWeight: isStrike || isBreakEven ? 600 : 400 }}>
                    {formatCurrency(sc.underlying_price)}
                    {isStrike && (
                      <span
                        style={{
                          marginLeft: "6px",
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "#78350f",
                          color: "#fde68a",
                        }}
                      >
                        STRIKE
                      </span>
                    )}
                    {isBreakEven && (
                      <span
                        style={{
                          marginLeft: "6px",
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "#064e3b",
                          color: "#a7f3d0",
                        }}
                      >
                        BREAK-EVEN
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      color: sc.shock_pct > 0 ? "#38bdf8" : sc.shock_pct < 0 ? "#f87171" : "#94a3b8",
                    }}
                  >
                    {sc.shock_pct > 0 ? `+${sc.shock_pct}%` : `${sc.shock_pct}%`}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontWeight: 500,
                        backgroundColor:
                          sc.outcome_label.includes("ITM")
                            ? "#1e3a5f"
                            : sc.outcome_label.includes("ATM")
                            ? "#3b2d18"
                            : "#27272a",
                        color:
                          sc.outcome_label.includes("ITM")
                            ? "#93c5fd"
                            : sc.outcome_label.includes("ATM")
                            ? "#fcd34d"
                            : "#a1a1aa",
                      }}
                    >
                      {sc.outcome_label.split(" ")[0]}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {formatCurrency(sc.intrinsic_value)}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {formatCurrency(sc.payoff)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: 600,
                      color: isProfitable ? "#34d399" : isLoss ? "#f87171" : "#94a3b8",
                    }}
                  >
                    {sc.profit_loss >= 0 ? `+` : ``}
                    {formatCurrency(sc.profit_loss)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: 600,
                      color: isProfitable ? "#34d399" : isLoss ? "#f87171" : "#94a3b8",
                    }}
                  >
                    {sc.return_pct >= 0 ? `+` : ``}
                    {sc.return_pct}%
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
