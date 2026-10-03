import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ConfigureCPN() {
  const [product, setProduct] = useState({
    underlying: 'NIFTY50',
    investment: 1000000,
    tenor_years: 3,
    protection_level: 100,
    participation_rate: 70,
    return_cap: 15,
    optional_coupon: 0,
    issuer: 'Top Tier Bank',
    settlement_method: 'cash'
  });
  const navigate = useNavigate();
  const set = (k, v) => setProduct(prev => ({...prev, [k]: v}));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Configure CPN</h2>
        <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-sm font-medium">Step 1 of 4</span>
      </div>
      
      <div className="card p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Underlying Asset</label>
            <input type="text" className="input" value={product.underlying} onChange={e => set('underlying', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Investment Amount</label>
            <input type="number" className="input" value={product.investment} onChange={e => set('investment', Number(e.target.value))} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Tenor (Years)</label>
            <select className="input" value={product.tenor_years} onChange={e => set('tenor_years', Number(e.target.value))}>
              <option value={1}>1 Year</option>
              <option value={2}>2 Years</option>
              <option value={3}>3 Years</option>
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Principal Protection Level (%)</label>
            <input type="number" className="input" value={product.protection_level} onChange={e => set('protection_level', Number(e.target.value))} />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Participation Rate (%)</label>
            <input type="number" className="input" value={product.participation_rate} onChange={e => set('participation_rate', Number(e.target.value))} />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Return Cap (%) - Optional</label>
            <input type="number" className="input" value={product.return_cap} onChange={e => set('return_cap', Number(e.target.value))} />
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
