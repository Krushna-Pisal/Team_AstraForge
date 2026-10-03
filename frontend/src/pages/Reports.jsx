import { useState, useEffect } from 'react';
import { useSimulator } from '../context/SimulatorContext';
import { Printer, ShieldCheck, FileText, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export default function Reports() {
  const { auditRecord } = useSimulator();
  const [record, setRecord] = useState(auditRecord);
  const [historyList, setHistoryList] = useState([]);

  useEffect(() => {
    fetch('http://localhost:8000/api/audit')
      .then(res => res.json())
      .then(data => {
        setHistoryList(data);
        if (!record && data.length > 0) {
          setRecord(data[0]);
        }
      })
      .catch(() => {});
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (!record) {
    return (
      <div className="max-w-4xl mx-auto card p-12 text-center space-y-4">
        <FileText className="w-12 h-12 text-slate-400 mx-auto" />
        <h3 className="text-xl font-bold text-slate-800">No Assessment Record Loaded</h3>
        <p className="text-sm text-slate-500">Run a suitability assessment or select an audit record from history to generate a report.</p>
      </div>
    );
  }

  const verdict = record.overall_verdict || 'SUITABLE';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Controls (Hidden during print) */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Suitability Audit Report</h2>
          <p className="text-sm text-slate-500">Compliance & Advisory Record Log</p>
        </div>

        <div className="flex items-center space-x-3">
          {historyList.length > 1 && (
            <select
              className="input bg-white text-xs py-1.5"
              value={record.assessment_id}
              onChange={e => {
                const found = historyList.find(r => r.assessment_id === e.target.value);
                if (found) setRecord(found);
              }}
            >
              {historyList.map(h => (
                <option key={h.assessment_id} value={h.assessment_id}>
                  {h.assessment_id.slice(0, 8)}... ({h.overall_verdict}) - {new Date(h.timestamp).toLocaleTimeString()}
                </option>
              ))}
            </select>
          )}

          <button className="btn-primary flex items-center space-x-2" onClick={handlePrint}>
            <Printer className="w-4 h-4" />
            <span>Print Compliance Report</span>
          </button>
        </div>
      </div>

      {/* Print-friendly Report Card */}
      <div className="card p-8 bg-white border border-slate-200 text-slate-900 space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="border-b border-slate-200 pb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2 text-brand font-bold text-xl mb-1">
              <ShieldCheck className="w-6 h-6 text-brand" />
              <span>AstraForge Wealth Management</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Structured Product Suitability Report</h1>
            <p className="text-xs text-slate-500 mt-1">Official Regulatory Compliance Audit Record</p>
          </div>
          <div className="text-right text-xs text-slate-500 space-y-1">
            <div><strong>Assessment ID:</strong> <span className="font-mono">{record.assessment_id}</span></div>
            <div><strong>Date:</strong> {new Date(record.timestamp).toUTCString()}</div>
            <div><strong>RM Name:</strong> {record.rm_name || 'Advisor'}</div>
          </div>
        </div>

        {/* Verdict Box */}
        <div className={`p-4 rounded-lg border ${verdict === 'SUITABLE' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : verdict === 'SUITABLE_WITH_CAUTION' ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-rose-50 border-rose-300 text-rose-900'}`}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-1">Overall Suitability Verdict</div>
          <div className="text-2xl font-bold flex items-center space-x-2">
            {verdict === 'SUITABLE' && <CheckCircle2 className="w-7 h-7 text-emerald-600" />}
            {verdict === 'SUITABLE_WITH_CAUTION' && <AlertTriangle className="w-7 h-7 text-amber-600" />}
            {verdict === 'NOT_SUITABLE' && <XCircle className="w-7 h-7 text-rose-600" />}
            <span>{verdict.replace('_', ' ')}</span>
          </div>
          {record.override && (
            <div className="mt-2 text-xs font-semibold bg-amber-200/60 p-2 rounded text-amber-900 border border-amber-300">
              ⚠️ Exception Override Applied: {record.override_reason}
            </div>
          )}
        </div>

        {/* Client & Product Summary Grid */}
        <div className="grid grid-cols-2 gap-6 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 border-b border-slate-200 pb-1">Client Profile Snapshot</h4>
            <div><span className="text-slate-500">Client ID / Name:</span> <strong>{record.client_id}</strong></div>
            <div><span className="text-slate-500">Risk Appetite:</span> <strong>{record.inputs?.client?.risk_appetite}</strong></div>
            <div><span className="text-slate-500">Investment Horizon:</span> <strong>{record.inputs?.client?.investment_horizon_months} months</strong></div>
            <div><span className="text-slate-500">Max Loss Tolerance:</span> <strong>{record.inputs?.client?.max_acceptable_loss_pct}%</strong></div>
            <div><span className="text-slate-500">Portfolio Value:</span> <strong>₹{record.inputs?.client?.total_portfolio_value?.toLocaleString('en-IN')}</strong></div>
            <div><span className="text-slate-500">Existing Exposure:</span> <strong>{record.inputs?.client?.existing_underlying_exposure_pct}%</strong></div>
          </div>

          <div className="space-y-1.5">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 border-b border-slate-200 pb-1">Product Parameters</h4>
            <div><span className="text-slate-500">Product Ref:</span> <strong>{record.product_reference}</strong></div>
            <div><span className="text-slate-500">Product Type:</span> <strong>{record.inputs?.product_risk?.product_type}</strong></div>
            <div><span className="text-slate-500">Underlying Asset:</span> <strong>{record.inputs?.product_risk?.underlying_asset}</strong></div>
            <div><span className="text-slate-500">Tenor:</span> <strong>{record.inputs?.product_risk?.tenor_years} years</strong></div>
            <div><span className="text-slate-500">Strike / Barrier:</span> <strong>{record.inputs?.product_risk?.strike_pct}% / {record.inputs?.product_risk?.barrier_pct}%</strong></div>
            <div><span className="text-slate-500">Coupon (p.a.):</span> <strong>{record.inputs?.product_risk?.coupon_pct_pa}%</strong></div>
          </div>
        </div>

        {/* Per Factor Matrix Table */}
        <div className="space-y-3">
          <h4 className="font-bold text-slate-900 text-sm">Factor Evaluation Audit Matrix</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-2 border-b border-r border-slate-200 font-bold">Factor</th>
                  <th className="p-2 border-b border-r border-slate-200 font-bold">Status</th>
                  <th className="p-2 border-b border-r border-slate-200 font-bold">Evaluated Product Value</th>
                  <th className="p-2 border-b border-slate-200 font-bold">Client Limit / Threshold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {record.per_factor_results?.map((f, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-2 border-r border-slate-200 font-semibold">{f.factor}</td>
                    <td className="p-2 border-r border-slate-200 font-bold">{f.status}</td>
                    <td className="p-2 border-r border-slate-200">{typeof f.product_value === 'object' ? JSON.stringify(f.product_value) : String(f.product_value)}</td>
                    <td className="p-2">{typeof f.client_limit === 'object' ? JSON.stringify(f.client_limit) : String(f.client_limit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signatures Footer */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-12 text-xs">
          <div>
            <div className="border-b border-slate-400 h-10 mb-1" />
            <div className="font-bold text-slate-800">Relationship Manager Signature</div>
            <div className="text-slate-500">{record.rm_name || 'Advisor'}</div>
          </div>
          <div>
            <div className="border-b border-slate-400 h-10 mb-1" />
            <div className="font-bold text-slate-800">Compliance Officer Sign-Off</div>
            <div className="text-slate-500">AstraForge Wealth Compliance</div>
          </div>
        </div>
      </div>
    </div>
  );
}
