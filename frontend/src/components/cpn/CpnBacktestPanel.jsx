const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export default function CpnBacktestPanel({ backtest, error }) {
  if (error) {
    return (
      <div className="card p-6 border-rose-200 bg-rose-50/50 space-y-2 text-rose-800">
        <h4 className="font-bold text-sm">Historical Backtest Error</h4>
        <p className="text-xs leading-relaxed">{error}</p>
      </div>
    );
  }

  if (!backtest) {
    return (
      <div className="h-48 bg-slate-100 flex items-center justify-center rounded-lg text-slate-400">
        Loading Historical Backtest...
      </div>
    );
  }

  const {
    total_windows,
    data_start_date,
    data_end_date,
    best_final_amount,
    best_return_pct,
    median_final_amount,
    median_return_pct,
    worst_final_amount,
    worst_return_pct,
    average_annualised_return_pct,
    no_upside_windows_pct,
    loss_windows_pct,
    histogram = [],
    fd_comparison,
    data_note,
    source,
  } = backtest;

  const maxFreq = Math.max(...histogram.map((b) => b.frequency_pct || 0), 1);

  return (
    <div className="space-y-6">
      {/* Key Backtest Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Total Rolling Windows</p>
          <p className="text-2xl font-bold text-slate-900">{total_windows}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {data_start_date} to {data_end_date}
          </p>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs text-emerald-700 mb-1">Best Historical Window</p>
          <p className="text-2xl font-bold text-emerald-800">
            {best_return_pct >= 0 ? '+' : ''}{best_return_pct.toFixed(2)}%
          </p>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">
            {INR.format(best_final_amount)}
          </p>
        </div>

        <div className="bg-sky-50/50 border border-sky-200 rounded-xl p-4">
          <p className="text-xs text-sky-700 mb-1">Median Window Return</p>
          <p className="text-2xl font-bold text-sky-800">
            {median_return_pct >= 0 ? '+' : ''}{median_return_pct.toFixed(2)}%
          </p>
          <p className="text-[11px] text-sky-600 mt-1 font-medium">
            {INR.format(median_final_amount)}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Worst Historical Window</p>
          <p className="text-2xl font-bold text-slate-800">
            {worst_return_pct >= 0 ? '+' : ''}{worst_return_pct.toFixed(2)}%
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            {INR.format(worst_final_amount)}
          </p>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
          <span className="text-slate-600">Avg Annualised Return:</span>
          <span className="font-bold text-slate-800 text-sm">
            {average_annualised_return_pct >= 0 ? '+' : ''}
            {average_annualised_return_pct.toFixed(2)}% p.a.
          </span>
        </div>
        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
          <span className="text-slate-600">No Upside Windows (r ≤ 0):</span>
          <span className="font-bold text-amber-700 text-sm">
            {no_upside_windows_pct.toFixed(1)}%
          </span>
        </div>
        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
          <span className="text-slate-600">Loss Windows (Return &lt; 0):</span>
          <span className="font-bold text-slate-800 text-sm">
            {loss_windows_pct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Fixed Deposit Comparison if requested */}
      {fd_comparison && (
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
              Fixed Deposit Benchmark Comparison
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
              Assumed FD Rate: {fd_comparison.fd_rate_pct_pa}% p.a.
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm pt-1">
            <div>
              <span className="text-slate-500 text-xs block">Maturity Value at FD Rate:</span>
              <span className="font-bold text-slate-800">{INR.format(fd_comparison.fd_final_amount)}</span>
            </div>
            <div>
              <span className="text-slate-500 text-xs block">Windows CPN Outperformed FD:</span>
              <span className="font-bold text-emerald-700 text-base">{fd_comparison.beat_fd_pct}%</span>
            </div>
          </div>
          <p className="text-[11px] text-amber-800 italic mt-1">
            ℹ️ {fd_comparison.disclaimer}
          </p>
        </div>
      )}

      {/* 10-Bucket Histogram */}
      {histogram.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Historical Return Distribution (10-Bucket Histogram)
            </h4>
            <span className="text-[11px] text-slate-400">Frequency (%)</span>
          </div>

          <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
            {histogram.map((bucket, idx) => {
              const widthPct = Math.max((bucket.frequency_pct / maxFreq) * 100, 1);
              const isGain = bucket.bin_start >= 0;

              return (
                <div key={idx} className="flex items-center text-xs gap-3">
                  <span className="w-28 text-slate-600 font-mono text-[11px] text-right shrink-0">
                    {bucket.bin_start >= 0 ? '+' : ''}{bucket.bin_start.toFixed(1)}% to {bucket.bin_end >= 0 ? '+' : ''}{bucket.bin_end.toFixed(1)}%
                  </span>
                  <div className="flex-1 bg-slate-200 h-4 rounded overflow-hidden">
                    <div
                      className={`h-full rounded transition-all duration-300 ${
                        isGain ? 'bg-sky-500' : 'bg-rose-400'
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="w-16 font-semibold text-slate-700 text-right text-[11px] shrink-0">
                    {bucket.frequency_pct.toFixed(1)}% ({bucket.count})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Data Note and Source Provenance */}
      <div className="text-[11px] text-slate-500 space-y-1 border-t border-slate-100 pt-3">
        <p><strong>Data Note:</strong> {data_note}</p>
        <p><strong>Source:</strong> {source}</p>
      </div>
    </div>
  );
}
