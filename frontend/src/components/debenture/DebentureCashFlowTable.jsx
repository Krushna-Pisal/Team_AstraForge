import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function DebentureCashFlowTable({
  cashFlows = [],
  currency = "INR",
}) {
  const [expanded, setExpanded] = useState(false);

  if (!cashFlows || cashFlows.length === 0) {
    return null;
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
    }).format(val);
  };

  const displayedFlows = expanded ? cashFlows : cashFlows.slice(0, 8);

  return (
    <div className="card" style={{ padding: "20px", display: "grid", gap: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 650 }}>
            Scheduled Cash Flow Timeline
          </h3>
          <p className="muted" style={{ margin: "4px 0 0 0", fontSize: "13px" }}>
            Periodic coupon distributions and final principal redemption cash flows ({cashFlows.length} periods total).
          </p>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="table" style={{ width: "100%", fontSize: "13px" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "center" }}>Period</th>
              <th style={{ textAlign: "center" }}>Time (Years)</th>
              <th style={{ textAlign: "right" }}>Coupon Payment ({currency})</th>
              <th style={{ textAlign: "right" }}>Principal Redemption ({currency})</th>
              <th style={{ textAlign: "right" }}>Total Cash Flow ({currency})</th>
              <th style={{ textAlign: "right" }}>Discounted Cash Flow ({currency})</th>
            </tr>
          </thead>
          <tbody>
            {displayedFlows.map((cf) => (
              <tr key={cf.period} style={{ borderBottom: "1px solid #1e2c3d" }}>
                <td style={{ textAlign: "center", fontWeight: 600 }}>#{cf.period}</td>
                <td style={{ textAlign: "center", color: "#94a3b8" }}>{cf.time_years.toFixed(2)}y</td>
                <td style={{ textAlign: "right" }}>{formatCurrency(cf.coupon_payment)}</td>
                <td style={{ textAlign: "right", color: cf.redemption_payment > 0 ? "#38bdf8" : "#64748b" }}>
                  {cf.redemption_payment > 0 ? formatCurrency(cf.redemption_payment) : "-"}
                </td>
                <td style={{ textAlign: "right", fontWeight: 650, color: "#f8fafc" }}>
                  {formatCurrency(cf.total_cash_flow)}
                </td>
                <td style={{ textAlign: "right", color: "#cbd5e1" }}>
                  {formatCurrency(cf.discounted_cash_flow)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cashFlows.length > 8 && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: "8px" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setExpanded(!expanded)}
            style={{ fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            {expanded ? (
              <>
                <ChevronUp size={14} /> Show Fewer Periods
              </>
            ) : (
              <>
                <ChevronDown size={14} /> Show All {cashFlows.length} Periods
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
