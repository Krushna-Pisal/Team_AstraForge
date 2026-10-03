import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, XCircle, Info, HelpCircle } from 'lucide-react';

export default function SuitabilityResults() {
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // In a real app, this payload comes from global state/context based on previous forms
    const demoPayload = {
      client: {
        client_id: "C-9901",
        client_name: "John Doe",
        risk_appetite: "MODERATE",
        investment_horizon_months: 12,
        max_acceptable_loss_pct: 15.0,
        total_portfolio_value: 50000000.0,
        existing_underlying_exposure: 0.0,
        existing_issuer_exposure: 0.0,
        existing_structured_product_exposure: 1000000.0,
        proposed_investment_amount: 1000000.0,
        liquidity_requirement_months: 6
      },
      product_risk: {
        product_type: "ELN",
        product_reference: "ELN-NIFTY-90-70",
        tenor_years: 1.0,
        underlying_asset: "NIFTY50",
        issuer: "AstraForge Bank",
        max_contractual_loss_pct: 100.0,
        historical_worst_loss_pct: 18.4,
        early_exit_available: false,
        currency_conversion_risk: false
      }
    };

    fetch('http://localhost:8000/api/suitability/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(demoPayload)
    })
      .then(res => {
        if (!res.ok) throw new Error('API failed to return suitability assessment.');
        return res.json();
      })
      .then(data => {
        setAssessment(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Running Suitability Rules Engine...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-rose-500">Error: {error}</div>;
  }

  const getStatusIcon = (status) => {
    if (status === 'PASS') return <CheckCircle2 className="w-6 h-6 text-emerald-500" />;
    if (status === 'WARNING') return <AlertTriangle className="w-6 h-6 text-amber-500" />;
    if (status === 'MISMATCH') return <XCircle className="w-6 h-6 text-rose-500" />;
    return <HelpCircle className="w-6 h-6 text-slate-400" />; // INSUFFICIENT_DATA
  };

  const getBadgeClass = (status) => {
    if (status === 'PASS') return 'bg-emerald-100 text-emerald-800';
    if (status === 'WARNING') return 'bg-amber-100 text-amber-800';
    if (status === 'MISMATCH') return 'bg-rose-100 text-rose-800';
    return 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Suitability Assessment</h2>
        <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-sm font-medium">Step 4 of 4</span>
      </div>
      
      {assessment?.completeness === 'INCOMPLETE' && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-800 text-sm font-medium">
          ⚠️ Assessment Incomplete: One or more dimensions have INSUFFICIENT_DATA due to missing client/product inputs.
        </div>
      )}

      {/* RM Review Required Section */}
      <div className="bg-navy-50 border border-navy-200 rounded-lg p-5">
        <h3 className="text-lg font-bold text-slate-900 mb-2 uppercase tracking-wide">RM Review Required</h3>
        <p className="text-sm text-slate-700 leading-relaxed">
          This system provides deterministic decision support and rule-based constraint checking. It is <strong>not</strong> a formal regulatory approval or a substitute for institutional suitability policy. The Relationship Manager is responsible for reviewing the findings, investigating warnings or mismatches, and making the final investment decision in consultation with the client.
        </p>
        <div className="mt-3 text-xs text-slate-500">
          Assessment ID: {assessment?.assessment_id} | Client: {assessment?.client_reference} | Product: {assessment?.product_reference} | Time: {new Date(assessment?.timestamp).toLocaleString()}
        </div>
      </div>

      <div className="space-y-4">
        {assessment?.dimensions.map((check, idx) => (
          <div key={idx} className="card p-5 flex items-start">
            <div className="mr-4 mt-0.5">
              {getStatusIcon(check.status)}
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-slate-900">
                {check.dimension.replace('_', ' ')}
              </h3>
              <p className="text-slate-600 text-sm mt-1">{check.explanation}</p>
              
              {/* Detailed Data Expandable / Context */}
              <div className="mt-3 bg-slate-50 rounded p-2 text-xs font-mono text-slate-500">
                Rule Applied: {check.rule_applied}
              </div>
            </div>
            <div className="ml-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeClass(check.status)}`}>
                {check.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <button className="btn-secondary" onClick={() => navigate(-1)}>Back</button>
        <button className="btn-primary" onClick={() => navigate('/history')}>Complete & Save Assessment</button>
      </div>
    </div>
  );
}
