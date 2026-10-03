import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSimulator } from '../context/SimulatorContext';

export default function ClientProfile({ flow }) {
  const navigate = useNavigate();
  const { clientProfile, setClientProfile } = useSimulator();
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
      setClientProfile({
        client_id: mock.client_id,
        client_name: mock.client_name,
        risk_appetite: mock.risk_appetite,
        investment_horizon_months: mock.investment_horizon_months,
        max_acceptable_loss_pct: mock.max_acceptable_loss_pct,
        existing_underlying_exposure_pct: mock.existing_underlying_exposure_pct,
        total_portfolio_value: mock.total_portfolio_value,
        proposed_investment_amount: mock.proposed_investment_amount,
        existing_structured_product_exposure: mock.existing_structured_product_exposure || 0,
        liquidity_requirement_months: mock.liquidity_requirement_months,
        investment_objective: mock.investment_objective || 'Growth',
        rm_name: mock.rm_name || 'Wealth Management Team'
      });
    }
  };

  const set = (k, v) => setClientProfile(prev => ({ ...prev, [k]: v }));

  const handleNext = () => {
    if (flow === 'simulator') navigate('/simulator/results');
    else navigate('/simulator/results');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Client Profile Assessment</h2>
          <p className="text-sm text-slate-500">Configure investor suitability metrics or choose a mock client template.</p>
        </div>
        {flow === 'simulator' && (
          <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-sm font-medium">Step 2 of 4</span>
        )}
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
            <input
              type="text"
              className="input"
              value={clientProfile.client_name || ''}
              onChange={e => set('client_name', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Client Reference ID</label>
            <input
              type="text"
              className="input"
              value={clientProfile.client_id || ''}
              onChange={e => set('client_id', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Risk Appetite</label>
            <select
              className="input"
              value={clientProfile.risk_appetite || 'MODERATE'}
              onChange={e => set('risk_appetite', e.target.value)}
            >
              <option value="CONSERVATIVE">CONSERVATIVE (Low Risk Only)</option>
              <option value="MODERATE">MODERATE (Low/Medium Risk)</option>
              <option value="AGGRESSIVE">AGGRESSIVE (Any Risk Level)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Investment Horizon (Months)</label>
            <input
              type="number"
              className="input"
              value={clientProfile.investment_horizon_months || ''}
              onChange={e => set('investment_horizon_months', Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Max Acceptable Loss (%)</label>
            <input
              type="number"
              className="input"
              value={clientProfile.max_acceptable_loss_pct || ''}
              onChange={e => set('max_acceptable_loss_pct', Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Total Portfolio Value (₹)</label>
            <input
              type="number"
              className="input"
              value={clientProfile.total_portfolio_value || ''}
              onChange={e => set('total_portfolio_value', Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Existing Underlying Exposure (% of Portfolio)</label>
            <input
              type="number"
              className="input"
              value={clientProfile.existing_underlying_exposure_pct || 0}
              onChange={e => set('existing_underlying_exposure_pct', Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Proposed Investment Amount (₹)</label>
            <input
              type="number"
              className="input"
              value={clientProfile.proposed_investment_amount || ''}
              onChange={e => set('proposed_investment_amount', Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Liquidity Requirement (Months)</label>
            <input
              type="number"
              className="input"
              value={clientProfile.liquidity_requirement_months || ''}
              onChange={e => set('liquidity_requirement_months', Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Relationship Manager (RM) Name</label>
            <input
              type="text"
              className="input"
              value={clientProfile.rm_name || ''}
              onChange={e => set('rm_name', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button className="btn-secondary" onClick={() => navigate(-1)}>Back</button>
        <button className="btn-primary" onClick={handleNext}>
          Next: Simulation & Stress Test Results
        </button>
      </div>
    </div>
  );
}
