import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimulator } from '../context/SimulatorContext';

export default function ConfigureELN() {
  const { productConfig, setProductConfig } = useSimulator();
  const [product, setProduct] = useState({
    product_type: 'ELN',
    underlying: productConfig.underlying || 'NIFTY50',
    investment: productConfig.investment || 1000000,
    tenor_years: productConfig.tenor_years || 1,
    strike_pct: productConfig.strike_pct || 90,
    barrier_pct: productConfig.barrier_pct || 70,
    barrier_monitoring: productConfig.barrier_monitoring || 'daily',
    coupon_pct_pa: productConfig.coupon_pct_pa || 12,
    coupon_condition: 'unconditional',
    settlement_method: 'cash'
  });
  const navigate = useNavigate();
  
  const set = (k, v) => setProduct(prev => ({...prev, [k]: v}));

  const handleNext = () => {
    setProductConfig(prev => ({ ...prev, ...product }));
    navigate('/simulator/client');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Configure ELN</h2>
        <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-sm font-medium">Step 1 of 4</span>
      </div>
      
      <div className="card p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Underlying Asset</label>
            <select className="input" value={product.underlying} onChange={e => set('underlying', e.target.value)}>
              <option value="NIFTY50">NIFTY 50</option>
              <option value="RELIANCE">Reliance</option>
              <option value="TCS">TCS</option>
              <option value="HDFCBANK">HDFC Bank</option>
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Investment Amount (₹)</label>
            <input type="number" min="1" className="input" value={product.investment} onChange={e => set('investment', Number(e.target.value))} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Tenor</label>
            <select className="input" value={product.tenor_years} onChange={e => set('tenor_years', Number(e.target.value))}>
              <option value={0.5}>6 Months</option>
              <option value={1}>1 Year</option>
              <option value={2}>2 Years</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Strike (%)</label>
            <input type="number" className="input" value={product.strike_pct} onChange={e => set('strike_pct', Number(e.target.value))} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Barrier (%)</label>
            <input type="number" className="input" value={product.barrier_pct} onChange={e => set('barrier_pct', Number(e.target.value))} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Barrier Monitoring</label>
            <select className="input" value={product.barrier_monitoring} onChange={e => set('barrier_monitoring', e.target.value)}>
              <option value="daily">Daily</option>
              <option value="maturity">At Maturity</option>
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Coupon Rate (% p.a.)</label>
            <input type="number" className="input" value={product.coupon_pct_pa} onChange={e => set('coupon_pct_pa', Number(e.target.value))} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Coupon Condition</label>
            <select className="input" value={product.coupon_condition} onChange={e => set('coupon_condition', e.target.value)}>
              <option value="unconditional">Unconditional</option>
              <option value="conditional">Conditional on Barrier</option>
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Settlement Method</label>
            <select className="input" value={product.settlement_method} onChange={e => set('settlement_method', e.target.value)}>
              <option value="cash">Cash</option>
              <option value="physical">Physical Delivery</option>
            </select>
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
