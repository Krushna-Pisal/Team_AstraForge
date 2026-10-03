import React from 'react';

export default function DcdBacktestPanel({ backtest, depositCurrency = 'USD' }) {
  if (!backtest) return null;

  const {
    total_windows,
    data_start_date,
    data_end_date,
    conversion_frequency_pct,
    win_frequency_pct,
    loss_frequency_pct,
    best_return_pct,
    median_return_pct,
    worst_return_pct,
    average_annualized_return_pct,
    histogram,
    fd_outperformed_pct,
    data_note,
    source,
  } = backtest;

  const maxCount = histogram && histogram.length > 0 ? Math.max(...histogram.map((b) => b.count)) : 1;

  return (
    <div className="card p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Historical Rolling-Window Backtest
          </h3>
          <p className="text-xs text-slate-500">
            Simulated performance across rolling calendar-tenor windows on real historical exchange rates. Zero synthetic data.
          </p>
        </div>
        <div className="text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
          Period: <span className="font-semibold text-slate-800">{data_start_date}</span> to{' '}
          <span className="font-semibold text-slate-800">{data_end_date}</span>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
          <p className="text-[11px] text-slate-500 font-medium mb-1">Total Windows</p>
          <p className="text-xl font-bold text-slate-900">{total_windows?.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Overlapping periods</p>
        </div>

        <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200">
          <p className="text-[11px] text-amber-800 font-medium mb-1">Conversion Frequency</p>
          <p className="text-xl font-bold text-amber-700">{conversion_frequency_pct?.toFixed(2)}%</p>
          <p className="text-[10px] text-amber-600 mt-0.5">Maturity conversion triggered</p>
        </div>

        <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200">
          <p className="text-[11px] text-emerald-800 font-medium mb-1">Win Frequency</p>
          <p className="text-xl font-bold text-emerald-700">{win_frequency_pct?.toFixed(2)}%</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Positive net return</p>
        </div>

        <div className="bg-rose-50/60 p-3 rounded-lg border border-rose-200">
          <p className="text-[11px] text-rose-800 font-medium mb-1">Loss Frequency</p>
          <p className="text-xl font-bold text-rose-700">{loss_frequency_pct?.toFixed(2)}%</p>
          <p className="text-[10px] text-rose-600 mt-0.5">Converted with net loss</p>
        </div>
      </div>

      {/* Secondary Performance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-2.5 bg-slate-50/80 rounded border border-slate-200">
          <span className="text-slate-500 block mb-0.5">Avg Annualized Return:</span>
          <span className="font-bold text-slate-900 text-sm">
            {average_annualized_return_pct >= 0 ? `+${average_annualized_return_pct.toFixed(2)}%` : `${average_annualized_return_pct.toFixed(2)}%`}
          </span>
        </div>

        <div className="p-2.5 bg-slate-50/80 rounded border border-slate-200">
          <span className="text-slate-500 block mb-0.5">Median Return:</span>
          <span className="font-bold text-slate-900 text-sm">
            {median_return_pct >= 0 ? `+${median_return_pct.toFixed(2)}%` : `${median_return_pct.toFixed(2)}%`}
          </span>
        </div>

        <div className="p-2.5 bg-slate-50/80 rounded border border-slate-200">
          <span className="text-slate-500 block mb-0.5">Best Observed:</span>
          <span className="font-bold text-emerald-700 text-sm">
            +{best_return_pct?.toFixed(2)}%
          </span>
        </div>

        <div className="p-2.5 bg-slate-50/80 rounded border border-slate-200">
          <span className="text-slate-500 block mb-0.5">Worst Observed:</span>
          <span className={`font-bold text-sm ${worst_return_pct < 0 ? 'text-rose-700' : 'text-slate-900'}`}>
            {worst_return_pct?.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Optional Benchmark Comparison */}
      {fd_outperformed_pct != null && (
        <div className="p-3 bg-sky-50 rounded-lg border border-sky-200 text-xs flex items-center justify-between">
          <span className="text-sky-900 font-medium">
            DCD beat user-assumed fixed deposit rate in:
          </span>
          <span className="font-bold text-sky-800 text-sm">{fd_outperformed_pct.toFixed(2)}% of windows</span>
        </div>
      )}

      {/* Histogram of Returns */}
      {histogram && histogram.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-xs font-semibold text-slate-700">Historical Return Distribution (10 Buckets)</p>
          <div className="space-y-1.5">
            {histogram.map((bucket, idx) => {
              const widthPct = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
              const isNegative = bucket.bucket_max <= 0;
              return (
                <div key={idx} className="flex items-center text-[11px] gap-2">
                  <span className="w-24 text-right text-slate-500 font-mono text-[10px]">
                    {bucket.bucket_min}% to {bucket.bucket_max}%
                  </span>
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isNegative ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.max(widthPct, 1)}%` }}
                    />
                  </div>
                  <span className="w-14 text-slate-700 font-medium text-[10px]">
                    {bucket.count} ({bucket.pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Provenance & Methodology Note */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
        <p className="font-semibold text-slate-700">Data & Methodology Note:</p>
        <p className="text-slate-600">{data_note}</p>
        <p className="text-slate-500 text-[11px]">
          Source: <span className="font-medium text-slate-700">{source}</span>
        </p>
      </div>
    </div>
  );
}
