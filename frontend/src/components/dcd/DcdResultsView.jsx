import { useState, useEffect } from 'react';
import DcdPayoffChart from './DcdPayoffChart';
import DcdScenarioCards from './DcdScenarioCards';
import DcdBacktestPanel from './DcdBacktestPanel';
import DcdRiskNotes from './DcdRiskNotes';
import { api } from '../../lib/api';

export default function DcdResultsView({ product }) {
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
      pair: product.pair || product.ticker || 'USDINR=X',
      deposit_currency: product.deposit_currency || 'USD',
      alternate_currency: product.alternate_currency || 'INR',
      deposit_amount: Number(product.deposit_amount || product.investment || 100000),
      tenor_years: Number(product.tenor_years || 0.25),
      conversion_strike_rate: Number(product.conversion_strike_rate || 85.0),
      initial_fx_rate: product.initial_fx_rate ? Number(product.initial_fx_rate) : null,
      conversion_condition: product.conversion_condition || 'FX_AT_OR_ABOVE_STRIKE',
      coupon_pct_pa: product.coupon_pct_pa ? Number(product.coupon_pct_pa) : 0,
      fd_rate_pct_pa: product.fd_rate_pct_pa ? Number(product.fd_rate_pct_pa) : null,
    };

    // 1. Fetch Curve
    setLoadingCurve(true);
    setCurveError(null);
    api('/api/dcd/curve', { body: payload })
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
    api('/api/dcd/scenarios', { body: payload })
      .then((data) => {
        setScenarios(data.scenarios || []);
        setLoadingScenarios(false);
      })
      .catch((err) => {
        setScenariosError(err.message);
        setLoadingScenarios(false);
      });

    // 3. Fetch Historical Backtest
    setLoadingBacktest(true);
    setBacktestError(null);
    api('/api/dcd/backtest', { body: payload })
      .then((data) => {
        setBacktest(data);
        setLoadingBacktest(false);
      })
      .catch((err) => {
        setBacktestError(err.message);
        setLoadingBacktest(false);
      });
  }, [product]);

  const depositCurr = product?.deposit_currency || 'USD';
  const altCurr = product?.alternate_currency || 'INR';

  return (
    <div className="space-y-6">
      {/* (a) Payoff Chart */}
      <section>
        {loadingCurve ? (
          <div className="card p-8 text-center text-slate-500">
            <div className="inline-block animate-spin h-6 w-6 border-2 border-brand border-t-transparent rounded-full mb-2" />
            <p className="text-xs">Computing deterministic DCD payoff curve...</p>
          </div>
        ) : curveError ? (
          <div className="card p-6 border-rose-200 bg-rose-50 text-rose-700 text-xs">
            <p className="font-bold mb-1">Payoff Curve Calculation Error</p>
            <p>{curveError}</p>
          </div>
        ) : (
          <DcdPayoffChart
            points={curveData}
            breakpoints={breakpoints}
            depositCurrency={depositCurr}
            alternateCurrency={altCurr}
          />
        )}
      </section>

      {/* (b) Scenario Cards */}
      <section>
        {loadingScenarios ? (
          <div className="card p-8 text-center text-slate-500">
            <div className="inline-block animate-spin h-6 w-6 border-2 border-brand border-t-transparent rounded-full mb-2" />
            <p className="text-xs">Evaluating market shock scenarios...</p>
          </div>
        ) : scenariosError ? (
          <div className="card p-6 border-rose-200 bg-rose-50 text-rose-700 text-xs">
            <p className="font-bold mb-1">Scenario Evaluation Error</p>
            <p>{scenariosError}</p>
          </div>
        ) : (
          <DcdScenarioCards
            scenarios={scenarios}
            depositCurrency={depositCurr}
            alternateCurrency={altCurr}
          />
        )}
      </section>

      {/* (c) Historical Backtest Panel */}
      <section>
        {loadingBacktest ? (
          <div className="card p-8 text-center text-slate-500">
            <div className="inline-block animate-spin h-6 w-6 border-2 border-brand border-t-transparent rounded-full mb-2" />
            <p className="text-xs">Running rolling-window historical backtest on real FX exchange rates...</p>
          </div>
        ) : backtestError ? (
          <div className="card p-6 border-amber-200 bg-amber-50 text-amber-800 text-xs">
            <p className="font-bold mb-1">Historical Backtest Notice</p>
            <p>{backtestError}</p>
          </div>
        ) : (
          <DcdBacktestPanel backtest={backtest} depositCurrency={depositCurr} />
        )}
      </section>

      {/* (d) Risk Notes */}
      <section>
        <DcdRiskNotes riskNotes={riskNotes} />
      </section>
    </div>
  );
}
