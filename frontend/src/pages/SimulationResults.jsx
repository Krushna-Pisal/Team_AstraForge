import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PayoffChart from '../components/PayoffChart';
import ScenarioCards from '../components/ScenarioCards';
import { useAppWorkflow } from '../AppContext';

export default function SimulationResults() {
  const navigate = useNavigate();
  const { workflowState, updateWorkflow } = useAppWorkflow();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ curve: [], scenarios: [] });

  useEffect(() => {
    const product = workflowState?.product;
    if (!product) {
      setError("No product configured. Please start from Step 1.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        if (product.product_type === 'ELN') {
          const res = await fetch('http://localhost:8000/payoff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
          });
          if (!res.ok) throw new Error('API failed to simulate ELN.');
          const resData = await res.json();
          setData({ curve: resData.curve, scenarios: resData.scenarios });
          updateWorkflow('simulation', resData.scenarios);
          updateWorkflow('payoff', resData);
        } else {
          const configKey = product.product_type.toLowerCase() + '_config';
          const configObj = { ...product };
          
          if (product.product_type === 'CPN' && !configObj.initial_price) {
            configObj.initial_price = 100.0;
            configObj.final_price = 100.0;
          }
          if (product.product_type === 'DCD') {
            configObj.initial_fx_rate = configObj.initial_fx || 83.50;
            configObj.conversion_strike_rate = configObj.conversion_strike || 84.00;
            configObj.maturity_fx_rate = configObj.initial_fx || 83.50;
          }
          
          const payload = {
            product_type: product.product_type,
            [configKey]: configObj
          };

          const res = await fetch('http://localhost:8000/api/scenarios/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          if (!res.ok) throw new Error(`API failed to simulate ${product.product_type}.`);
          const resData = await res.json();
          setData({ curve: [], scenarios: resData.results });
          updateWorkflow('simulation', resData.results);
          updateWorkflow('payoff', {
            total_maturity_value: resData.results.find(s => s.scenario_shock_pct === 0)?.maturity_value || 0
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Only run once on mount

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Running Simulation...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-rose-500">Error: {error}</div>;
  }

  const p = workflowState?.product || {};

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Simulation Results</h2>
        <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-sm font-medium">Step 3 of 4</span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Initial Investment</p>
          <p className="text-lg font-bold text-slate-900">₹{p.investment?.toLocaleString() || p.deposit_amount?.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Max Potential Yield</p>
          <p className="text-lg font-bold text-emerald-600">{p.coupon_pct_pa || p.coupon_rate || p.participation_rate || 0}%</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Downside Protection</p>
          <p className="text-lg font-bold text-slate-900">{p.barrier_pct ? `Up to -${100 - p.barrier_pct}%` : (p.protection_level ? `${p.protection_level}%` : 'N/A')}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Risk Metric (Historical)</p>
          <p className="text-lg font-bold text-slate-900">N/A</p>
        </div>
      </div>

      {data.curve.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Payoff Curve</h3>
          <PayoffChart curve={data.curve} strikePct={p.strike_pct || 100} barrierPct={p.barrier_pct || 0} />
        </div>
      )}

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Scenario Analysis</h3>
        <ScenarioCards scenarios={data.scenarios} />
      </div>

      <div className="flex justify-between">
        <button className="btn-secondary" onClick={() => navigate(-1)}>Back</button>
        <button className="btn-primary" onClick={() => navigate('/simulator/suitability')}>Next: Suitability Results</button>
      </div>
    </div>
  );
}
