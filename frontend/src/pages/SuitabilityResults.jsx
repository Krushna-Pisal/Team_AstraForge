import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

const MOCK_CHECKS = [
  { id: 1, name: 'Risk Appetite Compatibility', status: 'Warning', reason: 'Client is Moderate, but product involves capital loss risk exceeding moderate bounds in severe scenarios.' },
  { id: 2, name: 'Investment Horizon Compatibility', status: 'Pass', reason: 'Product tenor (1 year) is within client horizon (12 months).' },
  { id: 3, name: 'Loss Tolerance Compatibility', status: 'Mismatch', reason: 'Client max loss tolerance is 15%, but product historical backtest shows -18.4% max drawdown.' },
  { id: 4, name: 'Portfolio Concentration', status: 'Pass', reason: 'Proposed investment (₹10L) is 2% of total portfolio (₹5Cr), well below the 10% limit.' },
  { id: 5, name: 'Liquidity Compatibility', status: 'Warning', reason: 'Client requires Medium liquidity; product is locked for 1 year.' }
];

export default function SuitabilityResults() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Suitability Assessment</h2>
        <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-sm font-medium">Step 4 of 4</span>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-800 text-sm flex items-center">
        <span className="mr-2">⚠️</span> DEMO DATA: These results are for UI demonstration only. Final rules engine is pending integration.
      </div>

      <div className="space-y-4">
        {MOCK_CHECKS.map((check) => (
          <div key={check.id} className="card p-5 flex items-start">
            <div className="mr-4 mt-0.5">
              {check.status === 'Pass' && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
              {check.status === 'Warning' && <AlertTriangle className="w-6 h-6 text-amber-500" />}
              {check.status === 'Mismatch' && <XCircle className="w-6 h-6 text-rose-500" />}
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-slate-900">{check.name}</h3>
              <p className="text-slate-600 text-sm mt-1">{check.reason}</p>
            </div>
            <div className="ml-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                check.status === 'Pass' ? 'bg-emerald-100 text-emerald-800' :
                check.status === 'Warning' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {check.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-6 bg-navy-50 border-navy-100">
        <div className="flex items-start">
          <Info className="w-6 h-6 text-brand mr-3 shrink-0" />
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">AI Suitability Explanation (Placeholder)</h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              Based on the deterministic evaluation above, this ELN presents a <strong>Mismatch</strong> primarily due to the client's strict 15% maximum loss tolerance compared against the product's historical drawdown profile. Furthermore, there are warnings regarding liquidity and risk appetite alignment. It is recommended to consider a Capital Protected Note (CPN) or reduce the investment tenor.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button className="btn-secondary" onClick={() => navigate(-1)}>Back</button>
        <button className="btn-primary" onClick={() => navigate('/history')}>Complete & Save Assessment</button>
      </div>
    </div>
  );
}
