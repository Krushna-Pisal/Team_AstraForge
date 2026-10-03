import { useState, useEffect } from 'react';
import CpnPayoffChart from './CpnPayoffChart';
import CpnScenarioCards from './CpnScenarioCards';
import CpnBacktestPanel from './CpnBacktestPanel';
import CpnRiskNotes from './CpnRiskNotes';
export default function CpnResultsView({ product }) {

  const [loadingCurve, setLoadingCurve] = useState(true);
  const [loadingScenarios, setLoadingScenarios] = useState(true);
  const [loadingBacktest, setLoadingBacktest] = useState(true);

  const [curveData, setCurveData] = useState([]);
  const [breakpoints, setBreakpoints] = useState(null);
  const [curveError, setCurveError] = useState(null);

  const [scenarios, setScenarios] = useState([]);
  const [scenariosError, setScenariosError] = useState(null);

  const [backtest, setBacktest] = useState(null);
  const [backtestError, setBacktestError] = useState(null);

  const [riskNotes, setRiskNotes] = useState([]);

  useEffect(() => {
    if (!product) return;

    const payload = {
      underlying: product.underlying || 'NIFTY50',
      investment: product.investment || 1000000,
      tenor_years: product.tenor_years || 3,
      protection_pct: product.protection_pct ?? 100,
      participation_pct: product.participation_pct ?? 100,
      cap_pct: product.cap_pct ? Number(product.cap_pct) : null,
      coupon_pct_pa: product.coupon_pct_pa ? Number(product.coupon_pct_pa) : 0,
      fd_rate_pct_pa: product.fd_rate_pct_pa ? Number(product.fd_rate_pct_pa) : null,
    };

    // 1. Fetch Curve
    setLoadingCurve(true);
    setCurveError(null);
    fetch('http://localhost:8000/api/cpn/curve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((d) => {
            throw new Error(d.detail || 'Curve calculation failed.');
          });
        }
        return res.json();
      })
      .then((data) => {
        setCurveData(data.points || []);
        setBreakpoints(data.breakpoints || null);
        if (data.risk_notes) setRiskNotes(data.risk_notes);
        setLoadingCurve(false);
      })
      .catch((err) => {
        setCurveError(err.message);
        setLoadingCurve(false);
      });

    // 2. Fetch Scenarios
    setLoadingScenarios(true);
    setScenariosError(null);
    fetch('http://localhost:8000/api/cpn/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((d) => {
            throw new Error(d.detail || 'Scenario simulation failed.');
          });
        }
        return res.json();
      })
      .then((data) => {
        setScenarios(data.results || []);
        setLoadingScenarios(false);
      })
      .catch((err) => {
        setScenariosError(err.message);
        setLoadingScenarios(false);
      });

    // 3. Fetch Backtest
    setLoadingBacktest(true);
    setBacktestError(null);
    fetch('http://localhost:8000/api/cpn/backtest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((d) => {
            throw new Error(d.detail || 'Backtest analysis failed.');
          });
        }
        return res.json();
      })
      .then((data) => {
        setBacktest(data);
        setLoadingBacktest(false);
      })
      .catch((err) => {
        setBacktestError(err.message);
        setLoadingBacktest(false);
      });
  }, [
    product?.underlying,
    product?.investment,
    product?.tenor_years,
    product?.protection_pct,
    product?.participation_pct,
    product?.cap_pct,
    product?.coupon_pct_pa,
    product?.fd_rate_pct_pa,
  ]);

  return (
    <div className="space-y-6">
      {/* (a) Payoff Chart drawn ONLY from /api/cpn/curve */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Deterministic CPN Payoff Curve
            </h3>
            <p className="text-xs text-slate-500">
              Contractual maturity return across underlying price shocks (-50% to +60%).
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded">
            Floor: {product.protection_pct ?? 100}% Protection
          </span>
        </div>

        {curveError ? (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
            <strong>Curve Generation Error:</strong> {curveError}
          </div>
        ) : loadingCurve ? (
          <div className="h-80 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 animate-pulse">
            Generating Payoff Curve...
          </div>
        ) : (
          <CpnPayoffChart curveData={curveData} breakpoints={breakpoints} />
        )}
      </div>

      {/* (b) Scenario Cards from /api/cpn/scenarios */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Hypothetical Market Scenarios
            </h3>
            <p className="text-xs text-slate-500">
              Detailed payoffs at maturity for standard market shock movements.
            </p>
          </div>
          <span className="text-xs text-slate-400">All figures in INR (en-IN)</span>
        </div>

        {scenariosError ? (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
            <strong>Scenario Simulation Error:</strong> {scenariosError}
          </div>
        ) : loadingScenarios ? (
          <div className="h-32 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 animate-pulse">
            Simulating Scenarios...
          </div>
        ) : (
          <CpnScenarioCards scenarios={scenarios} />
        )}
      </div>

      {/* (c) Backtest Panel with stats, histogram, data_note and source */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Historical Rolling-Window Backtest
            </h3>
            <p className="text-xs text-slate-500">
              Backtested on real historical daily adjusted closes. No synthetic data.
            </p>
          </div>
        </div>

        <CpnBacktestPanel backtest={backtest} error={backtestError} />
      </div>

      {/* (d) Risk Notes */}
      <CpnRiskNotes notes={riskNotes} />

      {/* (e) Disclaimer */}
      <div className="text-center py-2 text-xs text-slate-400 italic">
        Past performance is not a guarantee. Illustrative only.
      </div>
    </div>
  );
}
