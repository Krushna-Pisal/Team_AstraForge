import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, XCircle, Info, BookOpen, TrendingUp, TrendingDown, ShieldAlert, FileText, Loader2, Sparkles } from 'lucide-react';
import { useAppWorkflow } from '../AppContext';

export default function ClientExplanation() {
  const navigate = useNavigate();
  const { workflowState } = useAppWorkflow();
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [askLoading, setAskLoading] = useState(false);

  const activeContext = workflowState;

  const isContextValid = () => {
    return activeContext?.product && 
           activeContext?.client_profile && 
           activeContext?.suitability;
  };

  const getPayload = () => {
    const p = workflowState?.product || {};
    const cp = workflowState?.client_profile || {};
    const suit = workflowState?.suitability || {};
    const sim = workflowState?.simulation || [];
    const baseScenario = sim.find(s => (s.scenario_shock_pct === 0 || s.shock_pct === 0)) || sim[0] || {};
    const basePayoff = workflowState?.payoff || {};
    
    const payload = {
      product: {
        product_type: p.product_type || "ELN",
        product_reference: `${p.product_type}-${p.underlying || p.deposit_currency || 'ASSET'}`,
        underlying_asset: p.underlying || `${p.deposit_currency}/${p.alternate_currency}`,
        investment_amount: p.investment || p.deposit_amount || 1000000.0,
        tenor: p.tenor_years || (p.tenor_months ? p.tenor_months / 12 : 1.0),
        strike_percentage: p.strike_pct || 100.0,
        barrier_percentage: p.barrier_pct || 0.0,
        coupon_rate: p.coupon_pct_pa || p.coupon_rate || p.participation_rate || 0.0,
        barrier_monitoring_method: p.barrier_monitoring || "maturity",
        settlement_method: p.settlement_method || "cash"
      },
      payoff: {
        principal_repayment: p.investment || p.deposit_amount || 1000000.0,
        coupon_earned: baseScenario.coupon_amount || 0.0,
        total_maturity_value: basePayoff.total_maturity_value || baseScenario.maturity_value || baseScenario.final_amount || p.investment || p.deposit_amount || 1000000.0,
        absolute_profit_loss: baseScenario.profit_loss || 0.0,
        return_percentage: baseScenario.return_pct || 0.0,
        existing_backend_explanation: "Generated dynamically."
      },
      client_profile: {
        risk_appetite: cp.risk_appetite || "MODERATE",
        investment_horizon: cp.investment_horizon || 12,
        maximum_acceptable_loss: cp.max_loss_tolerance || 15.0,
        portfolio_value: cp.portfolio_value || 50000000.0,
        proposed_investment_amount: p.investment || p.deposit_amount || 1000000.0,
        liquidity_requirements: cp.liquidity_requirement === 'Low' ? 12 : (cp.liquidity_requirement === 'Medium' ? 6 : 1)
      },
      product_risk: {
        product_type: p.product_type || "ELN",
        product_reference: `${p.product_type}-${p.underlying || p.deposit_currency || 'ASSET'}`,
        risk_classification: suit.dimensions?.find(d => d.dimension === 'RISK_APPETITE')?.status === 'PASS' ? 'MODERATE' : 'HIGH',
        issuer: p.issuer || "AstraForge Bank",
        tenor: p.tenor_years || (p.tenor_months ? p.tenor_months / 12 : 1.0),
        historical_worst_loss: 18.4,
        early_exit_availability: false
      },
      suitability: {
        assessment_id: suit.assessment_id || "A123",
        completeness: suit.completeness || "COMPLETE",
        rule_set_version: suit.rule_set_version || "1.0.0",
        dimensions: (suit.dimensions || []).map(d => ({
          dimension: d.dimension,
          status: d.status,
          relevant_input_values: d.relevant_input_values || {},
          rule_applied: d.rule_applied || "",
          existing_explanation: d.existing_explanation || d.explanation || ""
        })),
        key_warnings_mismatches: suit.key_warnings_mismatches || []
      },
      metadata: {
        currency: p.deposit_currency || "INR",
        data_source: "Live Simulator",
        data_as_of_date: new Date().toISOString(),
        context_id: "ctx-" + Date.now(),
        assumptions: "Generated from live context"
      }
    };

    if (sim && sim.length > 0) {
      payload.simulation = {
        product_type: p.product_type || "ELN",
        scenarios: sim.map(s => ({
          scenario_shock_percentage: s.scenario_shock_pct !== undefined ? s.scenario_shock_pct : (s.shock_pct || 0),
          underlying_final_level: s.underlying_final_level || s.underlying_return_pct || 0,
          maturity_value: s.maturity_value || s.final_amount || 0,
          profit_loss: s.profit_loss || 0,
          return_percentage: s.return_pct || 0,
          conversion_status: s.barrier_breached || s.conversion_triggered || false,
          scenario_assumptions: s.scenario_assumptions || "Simulated shock"
        }))
      };
    }
    
    return payload;
  };

  const generateExplanation = () => {
    setLoading(true);
    setError(null);
    fetch('http://localhost:8000/api/explanation/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(getPayload())
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to generate explanation. Server returned ' + res.status);
        return res.json();
      })
      .then(data => {
        setExplanation(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!isContextValid()) {
      setLoading(false);
      setError("Missing information. Please complete Product Configuration, Client Profile, and Suitability stages before generating the explanation.");
      return;
    }
    generateExplanation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const askQuestion = () => {
    if (!question || !isContextValid()) return;
    setAskLoading(true);
    fetch('http://localhost:8000/api/explanation/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: getPayload(), client_question: question })
    })
      .then(res => res.json())
      .then(data => {
        setAnswer(data);
        setAskLoading(false);
      })
      .catch(err => {
        console.error(err);
        setAskLoading(false);
      });
  };

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Generating Client Explanation...</div>;
  if (error) return <div className="p-8 text-center text-rose-500">{error}</div>;
  if (!explanation) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold text-slate-900">Client Explanation Mode</h2>
          {explanation.generation_method?.includes("Gemini") ? (
            <span className="flex items-center text-xs font-medium bg-brand/10 text-brand px-2 py-1 rounded-full"><Sparkles className="w-3 h-3 mr-1"/> AI Generated</span>
          ) : (
            <span className="flex items-center text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full"><Info className="w-3 h-3 mr-1"/> Deterministic Template</span>
          )}
        </div>
        <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-sm font-medium">For RM & Client Review</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Your Investment */}
        <div className="card p-6 border-t-4 border-t-brand">
          <div className="flex items-center mb-4">
            <BookOpen className="w-6 h-6 text-brand mr-2" />
            <h3 className="text-xl font-bold text-slate-800">1. Your Investment</h3>
          </div>
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{explanation.product_summary}</p>
        </div>

        {/* How It Works */}
        <div className="card p-6">
          <div className="flex items-center mb-4">
            <Info className="w-6 h-6 text-slate-600 mr-2" />
            <h3 className="text-xl font-bold text-slate-800">2. How This Product Works</h3>
          </div>
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{explanation.how_it_works}</p>
        </div>
      </div>

      {/* Return & Loss */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6 bg-emerald-50 border-emerald-100">
          <div className="flex items-center mb-4">
            <TrendingUp className="w-6 h-6 text-emerald-600 mr-2" />
            <h3 className="text-xl font-bold text-slate-800">3. How Can I Earn Money?</h3>
          </div>
          <p className="text-emerald-900 leading-relaxed whitespace-pre-wrap">{explanation.potential_return_explanation}</p>
        </div>
        
        <div className="card p-6 bg-rose-50 border-rose-100">
          <div className="flex items-center mb-4">
            <TrendingDown className="w-6 h-6 text-rose-600 mr-2" />
            <h3 className="text-xl font-bold text-slate-800">4. How Can I Lose Money?</h3>
          </div>
          <p className="text-rose-900 leading-relaxed whitespace-pre-wrap">{explanation.potential_loss_explanation}</p>
        </div>
      </div>

      {/* Scenarios */}
      <div className="card p-6 border-t-4 border-t-slate-300">
        <div className="flex items-center mb-4">
          <TrendingUp className="w-6 h-6 text-slate-600 mr-2" />
          <h3 className="text-xl font-bold text-slate-800">Hypothetical Scenarios</h3>
        </div>
        <div className="whitespace-pre-line text-slate-700 leading-relaxed">
          {explanation.scenario_explanations}
        </div>
      </div>

      {/* Historical Performance */}
      <div className="card p-6 border-t-4 border-t-slate-300">
        <div className="flex items-center mb-4">
          <TrendingDown className="w-6 h-6 text-slate-600 mr-2" />
          <h3 className="text-xl font-bold text-slate-800">Historical Performance</h3>
        </div>
        <div className="whitespace-pre-line text-slate-700 leading-relaxed">
          {explanation.historical_performance_explanation || "No historical backtesting data available."}
        </div>
      </div>

      {/* Suitability */}
      <div className="card p-6 border-l-4 border-l-amber-500">
        <div className="flex items-center mb-4">
          <CheckCircle2 className="w-6 h-6 text-amber-600 mr-2" />
          <h3 className="text-xl font-bold text-slate-800">5. Does This Match Your Profile?</h3>
        </div>
        <div className="whitespace-pre-line text-slate-700 leading-relaxed">
          {explanation.suitability_explanation}
        </div>
      </div>

      {/* Disclosures */}
      <div className="card p-6 bg-slate-50 border-slate-200">
        <div className="flex items-center mb-4">
          <ShieldAlert className="w-6 h-6 text-slate-600 mr-2" />
          <h3 className="text-xl font-bold text-slate-800">Important Disclosures</h3>
        </div>
        <ul className="list-disc pl-5 text-sm text-slate-600 space-y-2">
          {explanation.key_risks_and_disclosures.map((risk, idx) => (
            <li key={idx}>{risk}</li>
          ))}
        </ul>
      </div>

      {/* Q&A */}
      <div className="card p-6 bg-navy-50 border-navy-100">
        <div className="flex items-center mb-4">
          <FileText className="w-6 h-6 text-brand mr-2" />
          <h3 className="text-xl font-bold text-slate-900">Ask a Question</h3>
        </div>
        <p className="text-sm text-slate-600 mb-4">Type a question about this investment structure in plain English.</p>
        <div className="flex space-x-2">
          <input 
            type="text" 
            className="flex-1 input-field"
            placeholder="e.g. Can I lose my principal?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button className="btn-primary min-w-[100px] flex items-center justify-center" onClick={askQuestion} disabled={askLoading}>
            {askLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ask"}
          </button>
        </div>
        {answer && (
          <div className="mt-4 p-4 bg-white border border-slate-200 rounded text-slate-800">
            <p className="font-semibold mb-2">Answer:</p>
            <p className="mb-2 whitespace-pre-wrap">{answer.answer}</p>
            {answer.supporting_facts_warnings.length > 0 && (
              <ul className="list-disc pl-5 text-rose-600 text-sm mt-2">
                {answer.supporting_facts_warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <button className="btn-secondary" onClick={() => navigate(-1)}>Back to Details</button>
        <button className="btn-secondary flex items-center" onClick={generateExplanation}>
          <Sparkles className="w-4 h-4 mr-2"/> Regenerate
        </button>
      </div>
    </div>
  );
}
