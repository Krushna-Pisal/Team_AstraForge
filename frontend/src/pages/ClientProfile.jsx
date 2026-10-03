import { useState, useEffect } from 'react';
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
  objective: 'Growth',
  rm_name: 'Wealth Management Team'
};

export default function ClientProfile({ flow }) {
  const { workflowState, updateWorkflow } = useAppWorkflow();
  const [profile, setProfile] = useState(() => {
    return workflowState?.client_profile || defaults;
  });
  
  const navigate = useNavigate();
  const [mockClients, setMockClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');

  useEffect(() => {
    fetch('http://localhost:8000/api/clients')
      .then(res => res.json())
      .then(data => {
        setMockClients(data);
      })
      .catch(() => {});
  }, []);

  const handleSelectMock = (e) => {
    const id = e.target.value;
    setSelectedClientId(id);
    const mock = mockClients.find(c => c.client_id === id);
    if (mock) {
      setProfile(prev => ({
        ...prev,
        id: mock.client_id,
        name: mock.client_name,
        risk_appetite: mock.risk_appetite,
        investment_horizon: mock.investment_horizon_months,
        max_loss_tolerance: mock.max_acceptable_loss_pct,
        existing_exposure: mock.existing_underlying_exposure_pct,
        portfolio_value: mock.total_portfolio_value,
        proposed_investment: mock.proposed_investment_amount,
        liquidity_requirement: mock.liquidity_requirement_months === 12 ? 'Low' : (mock.liquidity_requirement_months === 6 ? 'Medium' : 'High'),
        objective: mock.investment_objective || 'Growth',
        rm_name: mock.rm_name || 'Wealth Management Team'
      }));
    }
  };

  const set = (k, v) => setProfile(prev => ({...prev, [k]: v}));

  const handleNext = () => {
    updateWorkflow('client_profile', profile);
    if (flow === 'simulator') navigate('/simulator/results');
    else navigate('/discovery/results');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Client Profile</h2>
          <p className="text-sm text-slate-500">Configure investor suitability metrics or choose a mock client template.</p>
        </div>
        {flow === 'simulator' && <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-sm font-medium">Step 2 of 4</span>}
      </div>
      
      {/* Mock client selector */}
      <div className="bg-brand/5 border border-brand/20 rounded-lg p-4 space-y-2">
        <label className="text-sm font-semibold text-brand-dark block">⚡ Load Demo Client Template</label>
        <select
          className="input bg-white"
          value={selectedClientId}
          onChange={handleSelectMock}
        >
          <option value="">-- Choose a pre-configured client profile --</option>
          {mockClients.map(c => (
            <option key={c.client_id} value={c.client_id}>
              {c.client_name} ({c.risk_appetite}, {c.max_acceptable_loss_pct}% loss tol, {c.existing_underlying_exposure_pct}% exposure)
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500">Selecting a client template auto-fills the form below. All fields remain fully editable.</p>
      </div>

      <div className="card p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Client Name</label>
            <input type="text" className="input" value={profile.name || ''} onChange={e => set('name', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Client ID</label>
            <input type="text" className="input" value={profile.id || ''} onChange={e => set('id', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Risk Appetite</label>
            <select className="input" value={profile.risk_appetite || 'Moderate'} onChange={e => set('risk_appetite', e.target.value)}>
              <option value="Conservative">Conservative</option>
              <option value="Moderate">Moderate</option>
              <option value="Aggressive">Aggressive</option>
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Investment Horizon (Months)</label>
            <input type="number" className="input" value={profile.investment_horizon || ''} onChange={e => set('investment_horizon', Number(e.target.value))} />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Max Loss Tolerance (%)</label>
            <input type="number" className="input" value={profile.max_loss_tolerance || ''} onChange={e => set('max_loss_tolerance', Number(e.target.value))} />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Total Portfolio Value (₹)</label>
            <input type="number" className="input" value={profile.portfolio_value || ''} onChange={e => set('portfolio_value', Number(e.target.value))} />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Existing Underlying Exposure (%)</label>
            <input type="number" className="input" value={profile.existing_exposure || 0} onChange={e => set('existing_exposure', Number(e.target.value))} />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Proposed Investment Amount (₹)</label>
            <input type="number" className="input" value={profile.proposed_investment || ''} onChange={e => set('proposed_investment', Number(e.target.value))} />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Liquidity Requirement</label>
            <select className="input" value={profile.liquidity_requirement || 'Medium'} onChange={e => set('liquidity_requirement', e.target.value)}>
              <option value="Low">Low (12+ months)</option>
              <option value="Medium">Medium (6 months)</option>
              <option value="High">High (Immediate)</option>
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Relationship Manager (RM) Name</label>
            <input type="text" className="input" value={profile.rm_name || ''} onChange={e => set('rm_name', e.target.value)} />
          </div>
          
          <div className="space-y-1.5 col-span-2">
            <label className="text-sm font-medium text-slate-700">Investment Objective</label>
            <select className="input" value={profile.objective || 'Growth'} onChange={e => set('objective', e.target.value)}>
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
