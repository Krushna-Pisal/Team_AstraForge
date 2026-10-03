import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAssessment } from "../state/AssessmentContext";
import { api, productRequest, money, pct } from "../lib/api";
import {
  PageTitle,
  Steps,
  Loading,
  EmptyState,
  ErrorNotice,
  Metric,
} from "../components/ui/Workflow";
import PayoffChart from "../components/PayoffChart";
import ScenarioCards from "../components/ScenarioCards";

export default function SimulationResults() {
  const { state, dispatch } = useAssessment();
  const { product, simulation } = state;
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState("scenarios");
  useEffect(() => {
    if (!product || simulation) return;
    const controller = new AbortController();
    api("/api/simulation/run", {
      signal: controller.signal,
      body: productRequest(product),
    })
      .then((value) => {
        if (!controller.signal.aborted) dispatch({ type: "simulation", value });
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [product, simulation, attempt, dispatch]);
  if (!product)
    return (
      <EmptyState
        title="Configure a product first"
        description="Simulation results will appear once you have entered contract terms."
        to="/simulator"
        action="Choose a product"
      />
    );
  const currency =
    product.type === "DCD"
      ? product.config.deposit_currency
      : product.config.investment_currency || "INR";
  const metrics = simulation?.backtest?.metrics;
  const payoff = simulation?.payoff;
  const investment = product.config.investment ?? product.config.deposit_amount;
  const finalValue =
    payoff?.total_maturity_value ?? payoff?.total_value_deposit_currency;
  const ret = payoff?.return_pct ?? payoff?.effective_return_pct;
  return (
    <div className="page-stack">
      <PageTitle
        title="Investment results"
        eyebrow={product.type + " / " + product.ticker}
        description="See possible returns if the market stays flat, rises or falls. These are examples, not forecasts."
      />
      <Steps current={2} />
      {product.market && (
        <div className="notice">
          <div>
            <p>
              Reference price date: {product.market.as_of}.{" "}
              {product.market.source}.
            </p>
            {product.market.warnings?.map((w) => (
              <p className="muted" key={w}>
                {w}
              </p>
            ))}
          </div>
        </div>
      )}
      <ErrorNotice
        error={error}
        retry={() => {
          setError("");
          setAttempt((n) => n + 1);
        }}
      />
      {!simulation && !error && (
        <Loading text="Calculating payoff, evaluating shocks and running historical windows…" />
      )}
      {simulation && (
        <>
          <div className="stats-grid">
            <Metric
              label="Initial investment"
              value={money(investment, currency)}
              hint={product.config.tenor_years + " year tenor"}
            />
            <Metric
              label="Illustrative maturity value"
              value={money(finalValue, currency)}
              hint="Example: market stays unchanged until maturity"
            />
            <Metric
              label="Illustrative return"
              value={pct(ret)}
              tone={ret < 0 ? "negative" : ret > 0 ? "positive" : ""}
              hint="Total return over the tenor"
            />
          </div>
          <section className="card section-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">PAYOFF PROFILE</p>
                <h2>Market movement, investor outcome</h2>
              </div>
              <span className="badge">{product.type}</span>
            </div>
            <PayoffChart
              curve={simulation.curve.results.map((r) => ({
                underlying_return_pct: r.scenario_shock_pct,
                investor_return_pct: r.return_pct,
              }))}
              strikePct={
                product.type === "ELN"
                  ? product.config.strike_pct
                  : product.type === "DCD"
                    ? (product.config.conversion_strike_rate /
                        product.config.initial_fx_rate) *
                      100
                    : undefined
              }
              barrierPct={
                product.type === "ELN" ? product.config.barrier_pct : undefined
              }
              protectionPct={
                product.type === "CPN"
                  ? product.config.protection_pct
                  : undefined
              }
            />
            <p className="muted small">{simulation.curve.assumptions}</p>
          </section>
          {product.type === "DCD" && (
            <section className="card section-card">
              <h2>Actual settlement legs · illustrative maturity</h2>
              <div className="stats-grid">
                {payoff.cash_flows.map((leg) => (
                  <Metric
                    key={leg.type}
                    label={leg.type + " · " + leg.currency}
                    value={money(leg.amount, leg.currency)}
                  />
                ))}
              </div>
              <p className="muted">
                Combined value and P/L above are translated to {currency} at
                maturity FX {payoff.maturity_fx_rate}.
              </p>
            </section>
          )}
          <div className="tabs" role="tablist" aria-label="Analysis views">
            {["scenarios", "historical"].map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                aria-controls={"panel-" + t}
                onClick={() => setTab(t)}
                className={tab === t ? "active" : ""}
              >
                {t === "scenarios"
                  ? "Scenario analysis"
                  : "Historical backtest"}
              </button>
            ))}
          </div>
          {tab === "scenarios" ? (
            <section
              id="panel-scenarios"
              role="tabpanel"
              className="page-stack page-enter"
            >
              <ScenarioCards
                scenarios={simulation.scenarios.results}
                currency={currency}
              />
              <details className="card section-card">
                <summary>See all market scenarios</summary>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {[
                          "Market change",
                          "Start",
                          "Final",
                          "Principal value",
                          "Interest",
                          "Maturity value",
                          "Profit / loss",
                          "Investor return",
                          "Event",
                        ].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {simulation.scenarios.results.map((r) => (
                        <tr key={r.scenario_shock_pct}>
                          <td>{pct(r.scenario_shock_pct)}</td>
                          <td>{r.initial_price.toFixed(4)}</td>
                          <td>{r.underlying_final_level.toFixed(4)}</td>
                          <td>{money(r.principal_repayment, currency)}</td>
                          <td>{money(r.coupon_earned, currency)}</td>
                          <td>{money(r.maturity_value, currency)}</td>
                          <td
                            className={
                              r.profit_loss < 0
                                ? "negative"
                                : r.profit_loss > 0
                                  ? "positive"
                                  : ""
                            }
                          >
                            {money(r.profit_loss, currency)}
                          </td>
                          <td>{pct(r.return_pct)}</td>
                          <td>
                            {r.barrier_breached
                              ? "Barrier breached"
                              : r.conversion_occurred
                                ? "Converted to " + r.repayment_currency
                                : r.cap_applied
                                  ? "Upside capped"
                                  : r.protection_active
                                    ? "Protected base"
                                    : r.strike_touched_or_below
                                      ? "At/below strike"
                                      : "No trigger"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>
          ) : (
            <section
              id="panel-historical"
              role="tabpanel"
              className="page-stack page-enter"
            >
              {simulation.historical_error ? (
                <div className="notice warning">
                  <strong>Historical analysis unavailable</strong>
                  <p>
                    {simulation.historical_error.message} (
                    {simulation.historical_error.code})
                  </p>
                  <button
                    className="btn-secondary"
                    onClick={() =>
                      dispatch({ type: "simulation", value: null })
                    }
                  >
                    Retry analysis
                  </button>
                </div>
              ) : metrics ? (
                <>
                  <div className="stats-grid four">
                    <Metric
                      label="Historical windows"
                      value={metrics.total_windows.toLocaleString()}
                    />
                    <Metric
                      label="Positive-return frequency"
                      value={pct(metrics.win_frequency_pct)}
                    />
                    <Metric
                      label="Loss frequency"
                      value={pct(metrics.loss_frequency_pct)}
                    />
                    <Metric
                      label="Flat-return frequency"
                      value={pct(metrics.zero_return_frequency_pct)}
                    />
                    <Metric
                      label="Average return"
                      value={pct(metrics.average_return)}
                    />
                    <Metric
                      label="Median return"
                      value={pct(metrics.median_return)}
                    />
                    <Metric
                      label="Best observed return"
                      value={pct(metrics.best_return)}
                      tone={metrics.best_return > 0 ? "positive" : ""}
                    />
                    <Metric
                      label="Worst observed return"
                      value={pct(metrics.worst_return)}
                      tone={metrics.worst_return < 0 ? "negative" : ""}
                    />
                  </div>
                  {metrics.barrier_breach_freq_pct != null && (
                    <div className="notice">
                      Daily/maturity barrier breach frequency:{" "}
                      <strong>{pct(metrics.barrier_breach_freq_pct)}</strong>
                    </div>
                  )}
                  {metrics.conversion_frequency_pct != null && (
                    <div className="notice">
                      Currency conversion frequency:{" "}
                      <strong>{pct(metrics.conversion_frequency_pct)}</strong>
                    </div>
                  )}
                  <div className="card section-card">
                    <h2>Data & methodology</h2>
                    <p>
                      {simulation.backtest.data_source} · Through{" "}
                      {simulation.backtest.data_as_of}
                    </p>
                    <p className="muted">{simulation.backtest.assumptions}</p>
                  </div>
                </>
              ) : (
                <EmptyState
                  title="No historical analysis"
                  description="Run the analysis with historical data enabled."
                />
              )}
            </section>
          )}
          <details className="card explanation">
            <summary>Contract assumptions & modeled risk</summary>
            <p>{payoff.contract_assumptions}</p>
            <p>{simulation.product_risk.risk_scope}</p>
            <p>
              Gross principal market-loss bound:{" "}
              {pct(simulation.product_risk.max_contractual_loss_pct)}.
              Historical observations do not bound future loss.
            </p>
          </details>
          <div className="actions">
            <Link className="btn-secondary" to="/simulator">
              Change product
            </Link>
            <Link
              className="btn-primary"
              to={state.client ? "/simulator/suitability" : "/clients"}
            >
              {state.client
                ? "Check client suitability →"
                : "Add client profile →"}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
