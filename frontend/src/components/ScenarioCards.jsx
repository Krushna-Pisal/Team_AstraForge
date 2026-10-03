import { money, pct } from "../lib/api";
export default function ScenarioCards({ scenarios, currency = "INR" }) {
  return (
    <div className="scenario-grid">
      {scenarios
        .filter((row) => [-20, 0, 20].includes(row.scenario_shock_pct))
        .map((row) => (
          <div className="card scenario-card" key={row.scenario_shock_pct}>
            <span className="eyebrow">
              {row.scenario_shock_pct === 0
                ? "Market stays flat"
                : "Market " +
                  (row.scenario_shock_pct > 0 ? "rises " : "falls ") +
                  Math.abs(row.scenario_shock_pct) +
                  "%"}
            </span>
            <strong
              className={
                row.return_pct < 0
                  ? "negative"
                  : row.return_pct > 0
                    ? "positive"
                    : ""
              }
            >
              {pct(row.return_pct)}
            </strong>
            <span className="muted">Your return</span>
            <div>{money(row.maturity_value, currency)}</div>
            <small>
              {row.barrier_breached
                ? "Loss trigger hit"
                : row.conversion_occurred
                  ? "Currency conversion"
                  : row.protection_active
                    ? "Protected portion repaid"
                    : row.cap_applied
                      ? "Growth return capped"
                      : "No special trigger"}
            </small>
          </div>
        ))}
    </div>
  );
}
