import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, ShieldAlert, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useSimulator } from '../context/SimulatorContext';

export default function AssessmentHistory() {
  const navigate = useNavigate();
  const { setAuditRecord } = useSimulator();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/api/audit')
      .then(res => res.json())
      .then(data => {
        setHistory(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleView = (rec) => {
    setAuditRecord(rec);
    navigate('/reports');
  };

  const getVerdictBadge = (verdict, override) => {
    if (override) {
      return (
        <span className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 flex items-center w-fit space-x-1">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
          <span>OVERRIDDEN</span>
        </span>
      );
    }
    if (verdict === 'SUITABLE') {
      return (
        <span className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center w-fit space-x-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>SUITABLE</span>
        </span>
      );
    }
    if (verdict === 'SUITABLE_WITH_CAUTION') {
      return (
        <span className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-800 flex items-center w-fit space-x-1">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span>CAUTION</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-100 text-rose-800 flex items-center w-fit space-x-1">
        <XCircle className="w-3.5 h-3.5 text-rose-600" />
        <span>NOT SUITABLE</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 animate-pulse">
        Loading audit trail records...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Suitability Audit Trail Log</h2>
          <p className="text-slate-500 text-sm mt-1">Review all logged suitability assessments and regulatory compliance decisions.</p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <FileText className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No Assessment Logs Found</h3>
          <p className="text-sm text-slate-500">Run a suitability assessment from the Product Simulator to populate the audit trail.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Assessment ID</th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Client ID</th>
                <th className="px-6 py-4">Product Ref</th>
                <th className="px-6 py-4">Verdict</th>
                <th className="px-6 py-4">RM Name</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((row) => (
                <tr key={row.assessment_id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-900">
                    {row.assessment_id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-xs">
                    {new Date(row.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-slate-900 font-medium">{row.client_id || row.inputs?.client?.client_id || 'N/A'}</td>
                  <td className="px-6 py-4 text-slate-600 text-xs font-mono">{row.product_reference || row.inputs?.product_risk?.product_reference || 'N/A'}</td>
                  <td className="px-6 py-4">
                    {getVerdictBadge(row.overall_verdict, row.override)}
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-xs">{row.rm_name || 'Advisor'}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      className="btn-secondary py-1 px-2.5 text-xs flex items-center space-x-1 ml-auto"
                      onClick={() => handleView(row)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Report</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
