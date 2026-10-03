import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  return (
    <div className="bg-slate-900 border border-slate-700 text-white rounded shadow-lg p-3 text-xs space-y-1">
      <div className="text-slate-400 font-medium">
        Underlying Return: {label > 0 ? '+' : ''}{label}%
      </div>
      <div className="font-semibold text-emerald-400">
        Investor Return: {point?.investor_return_pct >= 0 ? '+' : ''}
        {point?.investor_return_pct?.toFixed(2)}%
      </div>
      {point?.final_amount !== undefined && (
        <div className="text-slate-300">
          Maturity Value: {INR.format(point.final_amount)}
        </div>
      )}
    </div>
  );
};

export default function CpnPayoffChart({ curveData, breakpoints }) {
  if (!curveData || curveData.length === 0) {
    return (
      <div className="h-80 bg-slate-100 flex items-center justify-center rounded-lg text-slate-400">
        Loading Payoff Curve...
      </div>
    );
  }

  const floorReturn = breakpoints?.floor_return_pct ?? 0;
  const capUnderlying = breakpoints?.cap_underlying_return_pct;
  const capReturn = breakpoints?.cap_return_pct;
  const breakEvenUnderlying = breakpoints?.break_even_underlying_return_pct;

  return (
    <div className="space-y-3">
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={curveData}
            margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="underlying_return_pct"
              type="number"
              domain={[-50, 60]}
              tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`}
              label={{
                value: 'Underlying Return (%)',
                position: 'insideBottom',
                offset: -10,
                fill: '#64748b',
                fontSize: 12,
              }}
            />
            <YAxis
              tickFormatter={(v) => `${v > 0 ? '+' : ''}${v}%`}
              label={{
                value: 'Investor Return (%)',
                angle: -90,
                position: 'insideLeft',
                offset: 5,
                fill: '#64748b',
                fontSize: 12,
              }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Zero return reference line */}
            <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
            <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" />

            {/* Protection floor reference line */}
            <ReferenceLine
              y={floorReturn}
              stroke="#0ea5e9"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Protection Floor (${floorReturn >= 0 ? '+' : ''}${floorReturn.toFixed(1)}%)`,
                position: 'right',
                fill: '#0284c7',
                fontSize: 11,
              }}
            />

            {/* Cap reference lines if cap exists */}
            {capUnderlying !== null && capUnderlying !== undefined && (
              <ReferenceLine
                x={capUnderlying}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Cap (+${capUnderlying}%)`,
                  position: 'top',
                  fill: '#d97706',
                  fontSize: 11,
                }}
              />
            )}

            {/* Break-even underlying return marker */}
            {breakEvenUnderlying !== null && breakEvenUnderlying !== undefined && (
              <ReferenceLine
                x={breakEvenUnderlying}
                stroke="#10b981"
                strokeDasharray="2 2"
                label={{
                  value: `Break-even (+${breakEvenUnderlying.toFixed(1)}%)`,
                  position: 'insideTopLeft',
                  fill: '#059669',
                  fontSize: 11,
                }}
              />
            )}

            <Line
              type="monotone"
              dataKey="investor_return_pct"
              stroke="#0284c7"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
              name="CPN Payoff"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-600 justify-center">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-sky-500 inline-block" /> CPN Payoff Curve
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 border-b border-dashed border-sky-600 inline-block" /> Protection Floor ({floorReturn >= 0 ? '+' : ''}{floorReturn.toFixed(1)}%)
        </span>
        {capUnderlying !== null && capUnderlying !== undefined && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-b border-dashed border-amber-500 inline-block" /> Upside Cap (+{capUnderlying}% Underlying, {capReturn >= 0 ? '+' : ''}{capReturn?.toFixed(1)}% Return)
          </span>
        )}
        {breakEvenUnderlying !== null && breakEvenUnderlying !== undefined && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-b border-dotted border-emerald-500 inline-block" /> Break-Even (+{breakEvenUnderlying.toFixed(1)}%)
          </span>
        )}
      </div>
    </div>
  );
}
