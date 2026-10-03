const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export default function CpnScenarioCards({ scenarios }) {
  if (!scenarios || scenarios.length === 0) {
    return (
      <div className="h-32 bg-slate-100 flex items-center justify-center rounded-lg text-slate-400">
        Loading Scenarios...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
      {scenarios.map((s) => {
        const isGain = s.profit_loss >= 0;
        const shockStr = `${s.scenario_shock_pct > 0 ? '+' : ''}${s.scenario_shock_pct}%`;

        return (
          <div
            key={s.scenario_shock_pct}
            className={`flex flex-col p-4 rounded-xl border ${
              isGain ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-700">
                Index {shockStr}
              </span>
              <span
                className={`text-xs font-bold ${
                  isGain ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {s.return_pct >= 0 ? '+' : ''}{s.return_pct.toFixed(2)}%
              </span>
            </div>

            <div className="text-lg font-bold text-slate-900 mb-1">
              {INR.format(s.final_amount)}
            </div>

            <div
              className={`text-xs font-semibold mb-3 ${
                isGain ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {isGain ? '▲ Profit: +' : '▼ Loss: -'}
              {INR.format(Math.abs(s.profit_loss))}
            </div>

            <div className="mt-auto pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 space-y-0.5">
              <div className="flex justify-between">
                <span>Protected:</span>
                <span className="font-medium text-slate-700">{INR.format(s.protected_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Participation:</span>
                <span className="font-medium text-slate-700">+{INR.format(s.participation_gain)}</span>
              </div>
              {s.coupon_amount > 0 && (
                <div className="flex justify-between">
                  <span>Coupon:</span>
                  <span className="font-medium text-slate-700">+{INR.format(s.coupon_amount)}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
