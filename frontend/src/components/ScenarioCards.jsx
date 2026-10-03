const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const INR_COMPACT = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 2,
});

const SHOCK_LABELS = {
  20:  { label: '+20%',  emoji: '🚀' },
  10:  { label: '+10%',  emoji: '📈' },
  0:   { label: '0%',    emoji: '➡️' },
  '-10': { label: '-10%', emoji: '📉' },
  '-20': { label: '-20%', emoji: '⬇️' },
  '-25': { label: '-25%', emoji: '⚠️' },
  '-40': { label: '-40%', emoji: '💥' },
};

export default function ScenarioCards({ scenarios }) {
  if (!scenarios || scenarios.length === 0) {
    return (
      <div className="h-32 bg-slate-100 animate-pulse rounded-lg" />
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {scenarios.map(s => {
        const key = String(s.shock_pct);
        const meta = SHOCK_LABELS[key] || { label: `${s.shock_pct > 0 ? '+' : ''}${s.shock_pct}%`, emoji: '📊' };
        const isPositivePnl = s.profit_loss >= 0;

        return (
          <div
            key={key}
            id={`scenario-card-${key.replace('-', 'neg')}`}
            className={`flex flex-col p-4 rounded-xl border ${isPositivePnl ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}
          >
            <div className="text-sm font-semibold text-slate-800 flex items-center mb-1">
              <span className="mr-1.5">{meta.emoji}</span> {meta.label}
            </div>
            <div className="text-xs text-slate-500 mb-3">
              Inv: {s.return_pct >= 0 ? '+' : ''}{s.return_pct.toFixed(2)}%
            </div>
            
            <div className="text-lg font-bold text-slate-900 mb-1">
              {INR_COMPACT.format(s.final_amount)}
            </div>
            
            <div className={`text-sm font-medium mb-4 ${isPositivePnl ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isPositivePnl ? '▲' : '▼'} {INR.format(Math.abs(s.profit_loss))}
            </div>
            
            <div className="mt-auto">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.barrier_breached ? 'bg-rose-200 text-rose-800' : 'bg-emerald-200 text-emerald-800'}`}>
                {s.barrier_breached ? '⛔ Breached' : '✅ Safe'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
