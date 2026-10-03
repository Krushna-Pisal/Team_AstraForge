import React from 'react';

export default function DcdScenarioCards({
  scenarios,
  depositCurrency = 'USD',
  alternateCurrency = 'INR',
}) {
  if (!scenarios || scenarios.length === 0) {
    return null;
  }

  const formatNumber = (num, curr) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Hypothetical FX Market Scenarios
          </h3>
          <p className="text-xs text-slate-500">
            Outcomes across potential spot exchange rate fluctuations at maturity.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded border border-slate-200">
          Base: {depositCurrency} | Linked: {alternateCurrency}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {scenarios.map((sc, idx) => {
          const isGain = sc.return_pct >= 0;
          const isZero = sc.return_pct === 0;

          return (
            <div
              key={idx}
              className={`p-3.5 rounded-lg border flex flex-col justify-between transition-all ${
                isGain && !isZero
                  ? 'bg-emerald-50/40 border-emerald-200'
                  : isZero
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-rose-50/40 border-rose-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700">
                    FX {sc.fx_shock_pct >= 0 ? `+${sc.fx_shock_pct}%` : `${sc.fx_shock_pct}%`}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      sc.conversion_occurred
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    {sc.conversion_occurred ? `Converted to ${sc.repayment_currency}` : `No conversion (${depositCurrency})`}
                  </span>
                </div>

                <div className="text-xs text-slate-500 mb-2">
                  Rate: <span className="font-mono font-medium text-slate-900">{sc.maturity_fx_rate.toFixed(4)}</span>
                </div>

                <div className="text-xl font-bold tracking-tight mb-1">
                  <span className={isGain && !isZero ? 'text-emerald-700' : isZero ? 'text-slate-800' : 'text-rose-700'}>
                    {isGain && !isZero ? `+${sc.return_pct.toFixed(2)}%` : `${sc.return_pct.toFixed(2)}%`}
                  </span>
                </div>

                <div className="text-xs font-semibold text-slate-700 mb-2">
                  Total: {depositCurrency} {formatNumber(sc.total_value_deposit, depositCurrency)}
                  <span className={`ml-1 text-[11px] ${sc.profit_loss_deposit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ({sc.profit_loss_deposit >= 0 ? `+${formatNumber(sc.profit_loss_deposit, depositCurrency)}` : `${formatNumber(sc.profit_loss_deposit, depositCurrency)}`})
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 pt-2 border-t border-slate-200/60 space-y-0.5">
                <div className="flex justify-between">
                  <span>Repaid Principal:</span>
                  <span className="font-medium text-slate-800">
                    {sc.repayment_currency} {formatNumber(sc.principal_repayment, sc.repayment_currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Coupon ({depositCurrency}):</span>
                  <span className="font-medium text-emerald-700">
                    +{formatNumber(sc.coupon_amount, depositCurrency)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
