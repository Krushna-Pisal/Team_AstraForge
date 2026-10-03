import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, XCircle, Info, ShieldAlert, FileCheck, ArrowRight } from 'lucide-react';
import { useSimulator } from '../context/SimulatorContext';

export default function SuitabilityResults() {
  const navigate = useNavigate();
  const { productConfig, clientProfile, setSuitabilityAssessment, setAuditRecord } = useSimulator();
  
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Override state
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideError, setOverrideError] = useState('');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  const fetchSuitability = (overridePayload = null) => {
    setLoading(true);
    setError(null);

    const payload = overridePayload || {
      client: {
        client_id: clientProfile.client_id || 'CLI-001',
        client_name: clientProfile.client_name || 'Client',
        risk_appetite: (clientProfile.risk_appetite || 'MODERATE').toUpperCase(),
        investment_horizon_months: clientProfile.investment_horizon_months || 12,
        max_acceptable_loss_pct: clientProfile.max_acceptable_loss_pct || 15.0,
        total_portfolio_value: clientProfile.total_portfolio_value || 10000000,
        existing_underlying_exposure_pct: clientProfile.existing_underlying_exposure_pct || 0.0,
        proposed_investment_amount: clientProfile.proposed_investment_amount || productConfig.investment || 1000000,
        existing_structured_product_exposure: clientProfile.existing_structured_product_exposure || 0.0,
        liquidity_requirement_months: clientProfile.liquidity_requirement_months || 6
      },
      product_risk: {
        product_type: productConfig.product_type || 'ELN',
        product_reference: `${productConfig.product_type || 'ELN'}-${productConfig.underlying || 'NIFTY50'}-${productConfig.strike_pct || 90}-${productConfig.barrier_pct || 70}`,
        tenor_years: productConfig.tenor_years || 1.0,
        underlying_asset: productConfig.underlying || 'NIFTY50',
        issuer: 'AstraForge Bank',
        strike_pct: productConfig.strike_pct || 90.0,
        barrier_pct: productConfig.barrier_pct || 70.0,
        coupon_pct_pa: productConfig.coupon_pct_pa || 12.0,
        barrier_monitoring: productConfig.barrier_monitoring || 'daily',
        early_exit_available: false
      },
      rm_name: clientProfile.rm_name || 'Wealth Advisor'
    };

    fetch('http://localhost:8000/api/suitability/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(errData => { throw new Error(errData.detail || 'Suitability assessment failed'); });
        }
        return res.json();
      })
      .then(data => {
        setAssessment(data);
        setSuitabilityAssessment(data);
        if (data.audit_record) {
          setAuditRecord(data.audit_record);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSuitability();
  }, []);

  const handleApplyOverride = () => {
    if (!overrideReason || overrideReason.trim().length < 15) {
      setOverrideError('Override reason must be at least 15 characters long.');
      return;
    }
    setOverrideError('');
    setOverrideSubmitting(true);

    const payload = {
      client: {
        client_id: clientProfile.client_id || 'CLI-001',
        client_name: clientProfile.client_name || 'Client',
        risk_appetite: (clientProfile.risk_appetite || 'MODERATE').toUpperCase(),
        investment_horizon_months: clientProfile.investment_horizon_months || 12,
        max_acceptable_loss_pct: clientProfile.max_acceptable_loss_pct || 15.0,
        total_portfolio_value: clientProfile.total_portfolio_value || 10000000,
        existing_underlying_exposure_pct: clientProfile.existing_underlying_exposure_pct || 0.0,
        proposed_investment_amount: clientProfile.proposed_investment_amount || productConfig.investment || 1000000,
        existing_structured_product_exposure: clientProfile.existing_structured_product_exposure || 0.0,
        liquidity_requirement_months: clientProfile.liquidity_requirement_months || 6
      },
      product_risk: {
        product_type: productConfig.product_type || 'ELN',
        product_reference: `${productConfig.product_type || 'ELN'}-${productConfig.underlying || 'NIFTY50'}-${productConfig.strike_pct || 90}-${productConfig.barrier_pct || 70}`,
        tenor_years: productConfig.tenor_years || 1.0,
        underlying_asset: productConfig.underlying || 'NIFTY50',
        issuer: 'AstraForge Bank',
        strike_pct: productConfig.strike_pct || 90.0,
        barrier_pct: productConfig.barrier_pct || 70.0,
        coupon_pct_pa: productConfig.coupon_pct_pa || 12.0,
        barrier_monitoring: productConfig.barrier_monitoring || 'daily',
        early_exit_available: false
      },
      rm_name: clientProfile.rm_name || 'Wealth Advisor',
      override: true,
      override_reason: overrideReason.trim()
    };

    fetch('http://localhost:8000/api/suitability/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(errData => { throw new Error(errData.detail || 'Override submission failed'); });
        }
        return res.json();
      })
      .then(data => {
        setAssessment(data);
        setSuitabilityAssessment(data);
        if (data.audit_record) {
          setAuditRecord(data.audit_record);
        }
        setOverrideSubmitting(false);
      })
      .catch(err => {
        setOverrideError(err.message);
        setOverrideSubmitting(false);
      });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-600 font-medium">Evaluating Client Suitability Engine...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto card p-8 text-center space-y-4 border-rose-200 bg-rose-50">
        <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-rose-900">Suitability Evaluation Error</h3>
        <p className="text-sm text-rose-700">{error}</p>
        <button className="btn-secondary" onClick={() => fetchSuitability()}>Retry Evaluation</button>
      </div>
    );
  }

  const verdict = assessment?.overall_verdict || 'SUITABLE';
  const lossMeasures = assessment?.loss_measures;

  const getVerdictBadge = (v) => {
    if (v === 'SUITABLE') {
      return (
        <div className="flex items-center space-x-3 bg-emerald-50 border border-emerald-300 rounded-lg p-4 text-emerald-900">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
          <div>
            <div className="text-xl font-bold tracking-wide">SUITABLE</div>
            <p className="text-xs text-emerald-700">Product aligns with client risk appetite, horizon, loss tolerance, and portfolio concentration limits.</p>
          </div>
        </div>
      );
    }
    if (v === 'SUITABLE_WITH_CAUTION') {
      return (
        <div className="flex items-center space-x-3 bg-amber-50 border border-amber-300 rounded-lg p-4 text-amber-900">
          <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0" />
          <div>
            <div className="text-xl font-bold tracking-wide">SUITABLE WITH CAUTION</div>
            <p className="text-xs text-amber-700">No hard mismatches detected, but one or more factors require review or fall near threshold limits.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center space-x-3 bg-rose-50 border border-rose-300 rounded-lg p-4 text-rose-900">
        <XCircle className="w-8 h-8 text-rose-600 shrink-0" />
        <div>
          <div className="text-xl font-bold tracking-wide">NOT SUITABLE</div>
          <p className="text-xs text-rose-700">Product violates one or more hard client constraints (risk appetite, loss tolerance, concentration, or horizon).</p>
        </div>
      </div>
    );
  };

  const getStatusBadge = (status) => {
    if (status === 'MATCH' || status === 'PASS') {
      return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-semibold rounded text-xs">MATCH</span>;
    }
    if (status === 'REVIEW' || status === 'WARNING') {
      return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-semibold rounded text-xs">REVIEW</span>;
    }
    if (status === 'MISMATCH') {
      return <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-semibold rounded text-xs">MISMATCH</span>;
    }
    return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded text-xs">INSUFFICIENT DATA</span>;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Suitability Assessment Results</h2>
          <p className="text-sm text-slate-500">Evaluation ID: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">{assessment?.assessment_id}</code></p>
        </div>
        <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-sm font-medium">Step 4 of 4</span>
      </div>

      {/* Overall Verdict Badge */}
      {getVerdictBadge(verdict)}

      {/* Override Badge if applied */}
      {assessment?.override_applied && (
        <div className="bg-amber-100 border border-amber-300 text-amber-900 rounded-lg p-3 text-xs flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0" />
          <div>
            <strong>RM Exception Override Applied:</strong> {assessment.override_reason}
          </div>
        </div>
      )}

      {/* Per-Factor Breakdown Table */}
      <div className="card p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Per-Factor Suitability Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-xs">
                <th className="py-2.5 px-3">Factor</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Product Value</th>
                <th className="py-2.5 px-3">Client Limit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assessment?.factors?.map((f) => (
                <tr key={f.factor} className="hover:bg-slate-50">
                  <td className="py-3 px-3 font-semibold text-slate-800">{f.factor.replace('_', ' ')}</td>
                  <td className="py-3 px-3">{getStatusBadge(f.status)}</td>
                  <td className="py-3 px-3 text-slate-700 font-mono text-xs">{typeof f.product_value === 'object' ? JSON.stringify(f.product_value) : String(f.product_value)}</td>
                  <td className="py-3 px-3 text-slate-700 font-mono text-xs">{typeof f.client_limit === 'object' ? JSON.stringify(f.client_limit) : String(f.client_limit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Three Loss Measures Breakdown */}
      {lossMeasures && (
        <div className="card p-6 space-y-4 bg-slate-900 text-white border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-lg font-bold text-white flex items-center">
              <Info className="w-5 h-5 text-brand-light mr-2" /> Three Loss Measures Evaluation
            </h3>
            {lossMeasures.driving_measure && (
              <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded text-xs font-semibold">
                Strictest: {lossMeasures.driving_measure} ({lossMeasures.strictest_loss_pct}%)
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className={`p-4 rounded-lg border ${lossMeasures.driving_measure === 'max_loss_at_barrier' ? 'bg-brand/20 border-brand text-brand-light' : 'bg-slate-800/80 border-slate-700'}`}>
              <div className="text-xs text-slate-400 mb-1">1. Max Loss at Barrier</div>
              <div className="text-2xl font-bold">{lossMeasures.max_loss_at_barrier !== null ? `${lossMeasures.max_loss_at_barrier}%` : 'N/A'}</div>
              <div className="text-[10px] text-slate-400 mt-1">Theoretical loss at barrier level</div>
            </div>

            <div className={`p-4 rounded-lg border ${lossMeasures.driving_measure === 'worst_historical_loss_pct' ? 'bg-brand/20 border-brand text-brand-light' : 'bg-slate-800/80 border-slate-700'}`}>
              <div className="text-xs text-slate-400 mb-1">2. Worst Historical Loss</div>
              <div className="text-2xl font-bold">{lossMeasures.worst_historical_loss_pct !== null ? `${lossMeasures.worst_historical_loss_pct}%` : 'N/A'}</div>
              <div className="text-[10px] text-slate-400 mt-1">Worst rolling window from backtest</div>
            </div>

            <div className={`p-4 rounded-lg border ${lossMeasures.driving_measure === 'p5_loss_pct' ? 'bg-brand/20 border-brand text-brand-light' : 'bg-slate-800/80 border-slate-700'}`}>
              <div className="text-xs text-slate-400 mb-1">3. 5th Percentile Loss (p5)</div>
              <div className="text-2xl font-bold">{lossMeasures.p5_loss_pct !== null ? `${lossMeasures.p5_loss_pct}%` : 'N/A'}</div>
              <div className="text-[10px] text-slate-400 mt-1">5% value-at-risk equivalent</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-800/50 p-3 rounded border border-slate-800">
            <div><strong>Loss Frequency:</strong> {lossMeasures.loss_frequency_pct !== null ? `${lossMeasures.loss_frequency_pct}%` : 'N/A'} of windows</div>
            <div><strong>Barrier Breach Rate:</strong> {lossMeasures.barrier_breach_rate_pct !== null ? `${lossMeasures.barrier_breach_rate_pct}%` : 'N/A'} of windows</div>
          </div>

          {lossMeasures.data_note && (
            <p className="text-xs text-slate-400 italic">
              ℹ️ {lossMeasures.data_note}
            </p>
          )}
        </div>
      )}

      {/* Override Form if NOT_SUITABLE */}
      {verdict === 'NOT_SUITABLE' && !assessment?.override_applied && (
        <div className="card p-6 border-amber-300 bg-amber-50/50 space-y-4">
          <div className="flex items-center space-x-2 text-amber-900 font-bold">
            <ShieldAlert className="w-5 h-5 text-amber-700" />
            <span>Relationship Manager Exception Override</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            If the client insists on proceeding despite a NOT SUITABLE verdict, the Relationship Manager must document a valid business justification (minimum 15 characters) to override.
          </p>
          <textarea
            className="input w-full h-24 text-sm bg-white"
            placeholder="Enter minimum 15-character rationale for RM override..."
            value={overrideReason}
            onChange={e => setOverrideReason(e.target.value)}
          />
          {overrideError && <p className="text-xs font-semibold text-rose-600">{overrideError}</p>}
          <button
            className="btn-primary bg-amber-600 hover:bg-amber-700 text-white"
            disabled={overrideSubmitting}
            onClick={handleApplyOverride}
          >
            {overrideSubmitting ? 'Recording Audit Override...' : 'Submit Exception Override'}
          </button>
        </div>
      )}

      {/* Navigation Actions */}
      <div className="flex justify-between items-center pt-4">
        <button className="btn-secondary" onClick={() => navigate(-1)}>Back</button>
        <button className="btn-primary flex items-center space-x-2" onClick={() => navigate('/reports')}>
          <FileCheck className="w-4 h-4" />
          <span>View Audit Trail Report</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
