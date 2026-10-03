import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimulator } from '../context/SimulatorContext';
import { AlertCircle } from 'lucide-react';

export default function ConfigureDCD() {
  const { setProductConfig } = useSimulator();
  const [product, setProduct] = useState({
    product_type: 'DCD',
    deposit_currency: 'INR',
    alternate_currency: 'USD',
    deposit_amount: 1000000,
    tenor_months: 3,
    tenor_years: 0.25,
    initial_fx: 83.50,
    conversion_strike: 84.00,
    coupon_rate: 6.5,
    conversion_direction: 'base_to_alt',
    settlement_currency: 'variable',
    conversion_condition: 'at_maturity'
  });
  const navigate = useNavigate();
  const set = (k, v) => setProduct(prev => ({ ...prev, [k]: v }));

  const handleNext = () => {
    setProductConfig({
      product_type: 'DCD',
      underlying: `${product.deposit_currency}/${product.alternate_currency}`,
      investment: product.deposit_amount,
      tenor_years: product.tenor_months / 12,
      coupon_pct_pa: product.coupon_rate,
      ...product
    });
    navigate('/simulator/client');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Configure Dual Currency Deposit (DCD)</h2>
          <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-600" />
            Scenario analysis only: no historical backtest
          </span>
        </div>
        <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-sm font-medium">Step 1 of 4</span>
      </div>

      <div className="card p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Deposit Currency</label>
            <select className="input" value={product.deposit_currency} onChange={e => set('deposit_currency', e.target.value)}>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Alternate Currency</label>
            <select className="input" value={product.alternate_currency} onChange={e => set('alternate_currency', e.target.value)}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="INR">INR</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Deposit Amount</label>
            <input type="number" className="input" value={product.deposit_amount} onChange={e => set('deposit_amount', Number(e.target.value))} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Tenor (Months)</label>
            <select className="input" value={product.tenor_months} onChange={e => {
              const m = Number(e.target.value);
              setProduct(p => ({ ...p, tenor_months: m, tenor_years: m / 12 }));
            }}>
              <option value={1}>1 Month</option>
              <option value={3}>3 Months</option>
              <option value={6}>6 Months</option>
              <option value={12}>1 Year</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Conversion Strike FX Rate</label>
            <input type="number" step="0.01" className="input" value={product.conversion_strike} onChange={e => set('conversion_strike', Number(e.target.value))} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Coupon Rate (% p.a.)</label>
            <input type="number" step="0.1" className="input" value={product.coupon_rate} onChange={e => set('coupon_rate', Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button className="btn-secondary" onClick={() => navigate('/simulator')}>Cancel</button>
        <button className="btn-primary" onClick={handleNext}>Next: Client Profile</button>
      </div>
    </div>
  );
}
