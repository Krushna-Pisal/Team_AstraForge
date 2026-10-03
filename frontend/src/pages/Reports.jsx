import { FileText, Download } from 'lucide-react';

export default function Reports() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reports Library</h2>
          <p className="text-slate-500 mt-1">Download generated term sheets and suitability reports.</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-amber-800 text-sm flex items-center mb-6">
        <span className="mr-2">⚠️</span> DEMO DATA: PDF generation will be implemented by the backend team.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-6 flex flex-col hover:border-brand transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded bg-brand/10 text-brand flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded">PDF</span>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Term Sheet - NIFTY50 ELN</h3>
            <p className="text-sm text-slate-500 mb-4">Generated on 2026-10-03 for Arjun Desai.</p>
            <button className="btn-secondary w-full mt-auto text-sm">
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
