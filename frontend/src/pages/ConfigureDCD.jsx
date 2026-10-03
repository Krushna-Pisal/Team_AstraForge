import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ConfigureDCD() {
  const [product, setProduct] = useState({
    deposit_currency: 'INR',
    alternate_currency: 'USD',
    deposit_amount: 1000000,
    tenor_months: 3,
    initial_fx: 83.50,
    conversion_strike: 84.00,
    coupon_rate: 6.5,
    conversion_direction: 'base_to_alt',
    settlement_currency: 'variable',
    conversion_condition: 'at_maturity'
  });
  const navigate = useNavigate();
  const set = (k, v) => setProduct(prev => ({...prev, [k]: v}));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Configure DCD</h2>
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
            <select className="input" value={product.tenor_months} onChange={e => set('tenor_months', Number(e.target.value))}>
              <option value={1}>1 Month</option>
              <option value={3}>3 Months</option>
              <option value={6}>6 Months</option>
              <option value={12}>1 Year</option>
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Conversion Strike</label>
            <input type="number" className="input" value={product.conversion_strike} onChange={e => set('conversion_strike', Number(e.target.value))} />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Coupon Rate (% p.a.)</label>
            <input type="number" className="input" value={product.coupon_rate} onChange={e => set('coupon_rate', Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button className="btn-secondary" onClick={() => navigate('/simulator')}>Cancel</button>
        <button className="btn-primary" onClick={() => navigate('/simulator/client')}>Next: Client Profile</button>
      </div>
    </div>
  );
}
