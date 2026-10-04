import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api } from "../../lib/api";
import { ErrorNotice } from "../ui/Workflow";
export default function HistoricalPriceChart({ ticker }) {
  const [period, setPeriod] = useState("1y");
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const key = ticker + ":" + period + ":" + attempt;

  useEffect(() => {
    const controller = new AbortController();
    api(
      "/api/market-data/history?ticker=" +
        encodeURIComponent(ticker) +
        "&period=" +
        period +
        "&source=online&refresh=" +
        (attempt > 0),
      { signal: controller.signal },
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setData({ key, result });
          setError("");
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [ticker, period, attempt, key]);

  const current = data?.key === key ? data.result : null;
  const summary = useMemo(() => {
    const prices = current?.prices || [];
    if (!prices.length) return null;
    const first = prices[0].close;
    const latest = prices[prices.length - 1].close;
    return {
      first,
      latest,
      change: ((latest - first) / first) * 100,
    };
  }, [current]);
  const number = (value) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
  const priceLabel =
    current?.instrument?.kind === "fx"
      ? "Exchange rate"
      : `Price (${current?.currency || "market currency"})`;

  return (
    <section className="card section-card historical-price-panel page-stack">
      <div className="section-heading historical-price-heading">
        <div>
          <p className="eyebrow">REAL MARKET HISTORY</p>
          <h2>How has {ticker} moved over time?</h2>
          <p className="muted">
            This chart shows actual daily closing observations fetched from
            Yahoo Finance for the selected underlying. It is separate from the
            hypothetical product payoff scenarios above.
          </p>
        </div>
        <div className="historical-chart-controls">
          <label>
            Period
            <select
              aria-label="Historical price period"
              value={period}
              onChange={(e) => {
                setError("");
                setAttempt(0);
                setPeriod(e.target.value);
              }}
            >
              {["1mo", "1y", "5y", "10y"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <button
            className="btn-secondary"
            onClick={() => {
              setError("");
              setAttempt((a) => a + 1);
            }}
          >
            Refresh data
          </button>
        </div>
      </div>
      <div className="historical-chart-guide">
        <strong>How to read this:</strong> the horizontal axis is time and the
        vertical axis is the underlying price. A rising line means the
        underlying closed at higher prices; a falling line means it closed at
        lower prices. This does not predict the product return.
      </div>
      <ErrorNotice
        error={error}
        retry={() => {
          setError("");
          setAttempt((a) => a + 1);
        }}
      />
      {!current && !error && (
        <div className="skeleton tall" role="status" aria-label="Loading historical prices" />
      )}
      {current && (
        <>
          {current.warnings.map((w) => (
            <p className="notice warning" key={w}>
              {w}
            </p>
          ))}
          {current.prices.length ? (
            <>
              <div
                className="historical-chart"
                role="img"
                aria-label={`Historical closing price chart for ${ticker}`}
              >
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart
                    data={current.prices}
                    margin={{ top: 12, right: 18, bottom: 22, left: 12 }}
                  >
                    <CartesianGrid stroke="#dce7e7" strokeDasharray="3 4" vertical={false} />
                    <XAxis dataKey="date" minTickGap={55} stroke="#718096" fontSize={11} />
                    <YAxis
                      domain={["auto", "auto"]}
                      stroke="#718096"
                      width={72}
                      tickFormatter={number}
                      fontSize={11}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#ffffff",
                        border: "1px solid #c6d8d8",
                        borderRadius: 10,
                        color: "#0b1f3a",
                      }}
                      labelFormatter={(value) => `Date: ${value}`}
                      formatter={(value) => [number(value), priceLabel]}
                    />
                    <Line
                      type="monotone"
                      dataKey="close"
                      name={priceLabel}
                      stroke="#0f766e"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: "#06b6d4" }}
                      animationDuration={250}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {summary && (
                <div className="historical-chart-summary">
                  <div>
                    <span>First close</span>
                    <strong>{number(summary.first)}</strong>
                  </div>
                  <div>
                    <span>Latest close</span>
                    <strong>{number(summary.latest)}</strong>
                  </div>
                  <div>
                    <span>Change across selected period</span>
                    <strong className={summary.change < 0 ? "negative" : "positive"}>
                      {summary.change >= 0 ? "+" : ""}
                      {number(summary.change)}%
                    </strong>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p>No observations are available for this period.</p>
          )}
          <dl className="insight-facts historical-chart-meta">
            <div>
              <dt>Data source</dt>
              <dd>{current.source}</dd>
            </div>
            <div>
              <dt>Observation range</dt>
              <dd>
                {current.prices[0]?.date} to {current.as_of}
              </dd>
            </div>
            <div>
              <dt>Data status</dt>
              <dd>
                {current.cache_status} · {current.count.toLocaleString()} daily
                closes
              </dd>
            </div>
          </dl>
          <p className="muted small">
            Daily closing prices are historical observations, not live executable
            quotes and not a forecast of future performance.
          </p>
        </>
      )}
    </section>
  );
}
