import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

export default function DcdRiskNotes({ riskNotes }) {
  const notes = riskNotes && riskNotes.length > 0 ? riskNotes : [
    "DCD is a structured currency deposit and not a capital-protected fixed deposit.",
    "If conversion triggers, principal is returned in the alternate currency which has weakened against the deposit currency.",
    "Translating alternate currency back to the deposit currency at maturity spot may result in a substantial capital loss.",
    "The higher coupon rate compensates for the underlying currency conversion risk.",
    "Early withdrawal prior to maturity is subject to market break costs and issuer terms.",
    "Taxes and conversion transaction fees are excluded.",
  ];

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <h3 className="text-base font-bold text-slate-900">
          Important Product Disclosures & Currency Risk Notes
        </h3>
      </div>

      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
        <p className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
          <span>⚠️ Risk Classification:</span>
          <span>High currency conversion risk; principal not capital protected at maturity.</span>
        </p>
      </div>

      <ul className="space-y-2 text-xs text-slate-600 pl-4 list-disc">
        {notes.map((note, idx) => (
          <li key={idx} className="leading-relaxed">
            {note}
          </li>
        ))}
      </ul>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Illustrative structured deposit scenario modeling.</span>
        <span className="font-semibold text-slate-500">Past performance is not a guarantee. Illustrative only.</span>
      </div>
    </div>
  );
}
