import { FileText, Eye, Download } from 'lucide-react';

const HISTORY = [
  { id: 'ASM-1029', date: '2026-10-03', client: 'Arjun Desai', product: 'ELN - NIFTY50', status: 'Completed', result: 'Mismatch' },
  { id: 'ASM-1028', date: '2026-10-02', client: 'Priya Sharma', product: 'DCD - EUR/INR', status: 'Completed', result: 'Pass' },
  { id: 'ASM-1027', date: '2026-10-01', client: 'Tech Corp Trust', product: 'CPN - Reliance', status: 'Draft', result: 'Pending' },
];

export default function AssessmentHistory() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Assessment History</h2>
          <p className="text-slate-500 mt-1">Review past suitability assessments and simulations.</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Assessment ID</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Client</th>
              <th className="px-6 py-4">Product Type</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Suitability</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {HISTORY.map((row) => (
              <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">{row.id}</td>
                <td className="px-6 py-4 text-slate-600">{row.date}</td>
                <td className="px-6 py-4 text-slate-900">{row.client}</td>
                <td className="px-6 py-4 text-slate-600">{row.product}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${row.status === 'Completed' ? 'bg-slate-100 text-slate-700' : 'bg-brand/10 text-brand'}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    row.result === 'Pass' ? 'bg-emerald-100 text-emerald-800' :
                    row.result === 'Mismatch' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {row.result}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-3">
                  <button className="text-slate-400 hover:text-brand transition-colors" title="View Details">
                    <Eye className="w-4 h-4 inline" />
                  </button>
                  <button className="text-slate-400 hover:text-brand transition-colors" title="Download Report">
                    <Download className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
