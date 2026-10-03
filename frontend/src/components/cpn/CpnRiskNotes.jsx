import { AlertCircle, ShieldAlert } from 'lucide-react';

const CPN_DEFAULT_RISK_NOTES = [
  "Protection applies only at maturity and depends on the issuer's ability to pay. Issuer credit risk is not modelled here.",
  "Selling before maturity may return less than the protected amount.",
  "Upside is limited by the participation rate and any cap.",
  "Taxes and fees are ignored."
];

export default function CpnRiskNotes({ notes = CPN_DEFAULT_RISK_NOTES }) {
  const displayNotes = notes && notes.length > 0 ? notes : CPN_DEFAULT_RISK_NOTES;

  return (
    <div className="card p-5 bg-slate-50 border-slate-200 space-y-3">
      <div className="flex items-center space-x-2 text-slate-800 font-semibold text-sm">
        <ShieldAlert className="w-4 h-4 text-brand" />
        <span>Important Product Disclosures &amp; Risk Notes</span>
      </div>

      <div className="p-2.5 bg-sky-50 border border-sky-200 rounded text-xs text-sky-900 font-medium">
        🛡️ Risk Classification: Principal protected at maturity, subject to issuer credit risk
      </div>

      <ul className="space-y-1.5 text-xs text-slate-600 pl-4 list-disc">
        {displayNotes.map((note, idx) => (
          <li key={idx} className="leading-relaxed">
            {note}
          </li>
        ))}
      </ul>
    </div>
  );
}
