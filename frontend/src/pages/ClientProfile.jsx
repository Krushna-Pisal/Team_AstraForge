import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppWorkflow } from '../AppContext';

const defaults = {
  name: 'Arjun Desai',
  id: 'CL-88219',
  risk_appetite: 'Moderate',
  investment_horizon: 12,
  max_loss_tolerance: 15,
  portfolio_value: 50000000,
  proposed_investment: 1000000,
  existing_exposure: 5,
  liquidity_requirement: 'Medium',
  objective: 'Growth'
};

export default function ClientProfile({ flow }) {
  const { workflowState, updateWorkflow } = useAppWorkflow();
  const [profile, setProfile] = useState(() => {
    return workflowState?.client_profile || defaults;
  });
  
  const navigate = useNavigate();
  const set = (k, v) => setProfile(prev => ({...prev, [k]: v}));

  const handleNext = () => {
    updateWorkflow('client_profile', profile);
    if (flow === 'simulator') navigate('/simulator/results');
    else navigate('/discovery/results');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Client Profile</h2>
        {flow === 'simulator' && <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-sm font-medium">Step 2 of 4</span>}
      </div>
      
      <div className="card p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Client Name</label>
            <input type="text" className="input" value={profile.name} onChange={e => set('name', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Client ID</label>
            <input type="text" className="input" value={profile.id} onChange={e => set('id', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Risk Appetite</label>
            <select className="input" value={profile.risk_appetite} onChange={e => set('risk_appetite', e.target.value)}>
              <option value="Conservative">Conservative</option>
              <option value="Moderate">Moderate</option>
              <option value="Aggressive">Aggressive</option>
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Investment Horizon (Months)</label>
            <input type="number" className="input" value={profile.investment_horizon} onChange={e => set('investment_horizon', Number(e.target.value))} />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Max Loss Tolerance (%)</label>
            <input type="number" className="input" value={profile.max_loss_tolerance} onChange={e => set('max_loss_tolerance', Number(e.target.value))} />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Total Portfolio Value (₹)</label>
            <input type="number" className="input" value={profile.portfolio_value} onChange={e => set('portfolio_value', Number(e.target.value))} />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Existing Underlying Exposure (%)</label>
            <input type="number" className="input" value={profile.existing_exposure} onChange={e => set('existing_exposure', Number(e.target.value))} />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Liquidity Requirement</label>
            <select className="input" value={profile.liquidity_requirement} onChange={e => set('liquidity_requirement', e.target.value)}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          
          <div className="space-y-1.5 col-span-2">
            <label className="text-sm font-medium text-slate-700">Investment Objective</label>
            <select className="input" value={profile.objective} onChange={e => set('objective', e.target.value)}>
              <option value="Income">Income</option>
              <option value="Growth">Growth</option>
              <option value="Capital Preservation">Capital Preservation</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button className="btn-secondary" onClick={() => navigate(-1)}>Back</button>
        <button className="btn-primary" onClick={handleNext}>Next: {flow === 'simulator' ? 'Simulation Results' : 'Find Products'}</button>
      </div>
    </div>
  );
}
