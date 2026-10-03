import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

export default function DcdPayoffChart({
  points,
  breakpoints,
  depositCurrency = 'USD',
  alternateCurrency = 'INR',
}) {
  if (!points || points.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-slate-200">
        No payoff curve data available.
      </div>
    );
  }

  const strike = breakpoints?.conversion_strike_rate;
  const breakEven = breakpoints?.break_even_fx_rate;
  const maxReturn = breakpoints?.max_return_pct;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded shadow-lg text-xs space-y-1 border border-slate-700">
          <p className="font-semibold text-slate-200">
            Exchange Rate: {data.fx_rate?.toFixed(4)} {alternateCurrency}/{depositCurrency}
            <span className="ml-1 text-slate-400">({data.fx_change_pct >= 0 ? `+${data.fx_change_pct}%` : `${data.fx_change_pct}%`})</span>
          </p>
          <p className={`font-bold ${data.investor_return_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            Effective Return: {data.investor_return_pct >= 0 ? `+${data.investor_return_pct.toFixed(2)}%` : `${data.investor_return_pct.toFixed(2)}%`}
          </p>
          <p className="text-slate-300">
            Repayment: <span className="font-medium">{data.conversion_occurred ? `Converted to ${data.repayment_currency}` : `100% in ${data.repayment_currency}`}</span>
          </p>
          <p className="text-slate-400">
            Est. Deposit Value: {depositCurrency} {Number(data.total_value_deposit_currency || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Dual Currency Deposit Payoff Curve
          </h3>
          <p className="text-xs text-slate-500">
            Contractual return at maturity across exchange rate movements. Principal converted if rate crosses strike.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
            Max Return: +{maxReturn != null ? Number(maxReturn).toFixed(2) : '0.00'}%
          </span>
          {strike && (
            <span className="inline-flex items-center gap-1.5 font-medium text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200">
              Strike: {strike}
            </span>
          )}
          {breakEven && (
            <span className="inline-flex items-center gap-1.5 font-medium text-sky-800 bg-sky-50 px-2 py-1 rounded border border-sky-200">
              Break-Even: {breakEven}
            </span>
          )}
        </div>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 20, right: 30, left: 10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="fx_rate"
              stroke="#64748b"
              fontSize={11}
              tickFormatter={(val) => Number(val).toFixed(2)}
              label={{
                value: `Maturity Exchange Rate (${alternateCurrency} per 1 ${depositCurrency})`,
                position: 'insideBottom',
                offset: -15,
                fill: '#475569',
                fontSize: 12,
              }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickFormatter={(val) => `${val}%`}
              label={{
                value: `Investor Return in ${depositCurrency} (%)`,
                angle: -90,
                position: 'insideLeft',
                offset: 5,
                fill: '#475569',
                fontSize: 12,
              }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Zero return reference line */}
            <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />

            {/* Conversion Strike vertical reference line */}
            {strike && (
              <ReferenceLine
                x={strike}
                stroke="#d97706"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Strike (${strike})`,
                  position: 'top',
                  fill: '#b45309',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            )}

            {/* Break-even rate vertical reference line */}
            {breakEven && (
              <ReferenceLine
                x={breakEven}
                stroke="#0284c7"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={{
                  value: `Break-Even (${breakEven})`,
                  position: 'bottom',
                  fill: '#0369a1',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />
            )}

            {/* Payoff line */}
            <Line
              type="linear"
              dataKey="investor_return_pct"
              name="Effective Return (%)"
              stroke="#0f766e"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#0f766e' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
        <div>
          <span>Flat region: Unconverted (receives deposit currency + coupon).</span>
          <span className="ml-2 text-rose-600">Sloping region: Converted to alternate currency (capital at risk).</span>
        </div>
        <div className="font-medium text-slate-700">
          Deterministic mathematical payoff curve
        </div>
      </div>
    </div>
  );
}
