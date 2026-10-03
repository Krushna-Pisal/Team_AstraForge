import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PayoffChart from '../components/PayoffChart';
import ScenarioCards from '../components/ScenarioCards';

const MOCK_SCENARIOS = [
  { scenario: 'Strong Positive', shock_pct: 20, underlying_return_pct: 20, redemption: 1000000, coupon_amount: 120000, final_amount: 1120000, profit_loss: 120000, return_pct: 12, barrier_breached: false },
  { scenario: 'Moderate Positive', shock_pct: 10, underlying_return_pct: 10, redemption: 1000000, coupon_amount: 120000, final_amount: 1120000, profit_loss: 120000, return_pct: 12, barrier_breached: false },
  { scenario: 'Flat Market', shock_pct: 0, underlying_return_pct: 0, redemption: 1000000, coupon_amount: 120000, final_amount: 1120000, profit_loss: 120000, return_pct: 12, barrier_breached: false },
  { scenario: 'Moderate Decline', shock_pct: -15, underlying_return_pct: -15, redemption: 1000000, coupon_amount: 120000, final_amount: 1120000, profit_loss: 120000, return_pct: 12, barrier_breached: false },
  { scenario: 'Severe Decline', shock_pct: -35, underlying_return_pct: -35, redemption: 650000, coupon_amount: 120000, final_amount: 770000, profit_loss: -230000, return_pct: -23, barrier_breached: true },
];

const MOCK_CURVE = Array.from({length: 41}, (_, i) => {
  const ret = -40 + (i * 2);
  let invRet = 12;
  if (ret < -30) invRet = ret + 12;
  return { underlying_return_pct: ret, investor_return_pct: invRet };
});

export default function SimulationResults() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Simulation Results</h2>
        <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-sm font-medium">Step 3 of 4</span>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-800 text-sm flex items-center">
        <span className="mr-2">⚠️</span> DEMO DATA: These simulation outputs are for UI demonstration only. Final calculations will be provided by the Python financial engine.
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Initial Investment</p>
          <p className="text-lg font-bold text-slate-900">₹10,00,000</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Max Potential Yield</p>
          <p className="text-lg font-bold text-emerald-600">12.0%</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Downside Protection</p>
          <p className="text-lg font-bold text-slate-900">Up to -30%</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Risk Metric (Historical)</p>
          <p className="text-lg font-bold text-rose-600">-18.4% max drawdown</p>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Payoff Curve</h3>
        <PayoffChart curve={MOCK_CURVE} strikePct={90} barrierPct={70} />
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Scenario Analysis</h3>
        <ScenarioCards scenarios={MOCK_SCENARIOS} />
      </div>

      <div className="flex justify-between">
        <button className="btn-secondary" onClick={() => navigate(-1)}>Back</button>
        <button className="btn-primary" onClick={() => navigate('/simulator/suitability')}>Next: Suitability Results</button>
      </div>
    </div>
  );
}
