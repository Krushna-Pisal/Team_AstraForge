/**
 * PayoffChart.jsx
 *
 * Recharts line chart showing investor return % vs underlying return %.
 * Supports two series for daily monitoring ELNs:
 * - curve_not_breached (Blue line: barrier never touched)
 * - curve_breached (Red line: barrier touched during path)
 * Reference lines drawn at barrier, strike, and zero.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 text-white rounded shadow-lg p-2.5 text-xs space-y-1">
      <div className="text-slate-400 font-medium">Underlying Return: {label > 0 ? '+' : ''}{label}%</div>
      {payload.map((entry, index) => (
        <div key={index} style={{ color: entry.color }} className="font-semibold">
          {entry.name}: {entry.value >= 0 ? '+' : ''}{entry.value?.toFixed(2)}%
        </div>
      ))}
    </div>
  );
};

export default function PayoffChart({
  curve,
  curveNotBreached,
  curveBreached,
  strikePct,
  barrierPct,
  barrierMonitoring = 'daily',
  productType = 'ELN'
}) {
  const isDailyEln = productType === 'ELN' && barrierMonitoring === 'daily' && curveNotBreached && curveBreached;

  // Prepare unified dataset if two series exist
  let chartData = curve || [];
  if (isDailyEln && curveNotBreached.length === curveBreached.length) {
    chartData = curveNotBreached.map((pt, i) => ({
      underlying_return_pct: pt.underlying_return_pct,
      return_not_breached: pt.investor_return_pct,
      return_breached: curveBreached[i]?.investor_return_pct
    }));
  }

  if (!chartData || chartData.length === 0) {
    return <div className="h-80 bg-slate-100 animate-pulse rounded-lg" />;
  }

  return (
    <div className="w-full space-y-2">
      <ResponsiveContainer width="100%" height={340}>
        <LineChart
          data={chartData}
          margin={{ top: 12, right: 24, left: 8, bottom: 12 }}
        >
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="rgba(99,130,185,0.12)"
            vertical={false}
          />
          <XAxis
            dataKey="underlying_return_pct"
            type="number"
            domain={['auto', 'auto']}
            tickFormatter={v => `${v > 0 ? '+' : ''}${v}%`}
            tick={{ fill: '#7a91b0', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(99,130,185,0.2)' }}
            tickLine={false}
            label={{
              value: 'Underlying Return (%)',
              position: 'insideBottom',
              offset: -6,
              style: { fill: '#7a91b0', fontSize: 11 },
            }}
          />
          <YAxis
            tickFormatter={v => `${v > 0 ? '+' : ''}${v}%`}
            tick={{ fill: '#7a91b0', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={54}
            label={{
              value: 'Investor Return (%)',
              angle: -90,
              position: 'insideLeft',
              offset: 12,
              style: { fill: '#7a91b0', fontSize: 11 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />

          {/* Zero reference line */}
          <ReferenceLine
            y={0}
            stroke="rgba(255,255,255,0.2)"
            strokeDasharray="4 2"
            strokeWidth={1.5}
          />

          {/* Strike reference */}
          {strikePct && (
            <ReferenceLine
              x={strikePct - 100}
              stroke="#3b82f6"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: `Strike ${strikePct}%`,
                position: 'top',
                fill: '#3b82f6',
                fontSize: 10,
              }}
            />
          )}

          {/* Barrier reference */}
          {barrierPct && (
            <ReferenceLine
              x={barrierPct - 100}
              stroke="#ef4444"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: `Barrier ${barrierPct}%`,
                position: 'top',
                fill: '#ef4444',
                fontSize: 10,
              }}
            />
          )}

          {isDailyEln ? (
            <>
              <Line
                name="Barrier Never Touched"
                type="monotone"
                dataKey="return_not_breached"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#3b82f6' }}
              />
              <Line
                name="Barrier Touched (Breached)"
                type="monotone"
                dataKey="return_breached"
                stroke="#ef4444"
                strokeWidth={2.5}
                strokeDasharray="4 2"
                dot={false}
                activeDot={{ r: 5, fill: '#ef4444' }}
              />
            </>
          ) : (
            <Line
              name="Payoff Return"
              type="monotone"
              dataKey="investor_return_pct"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#10b981' }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {isDailyEln && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded p-2.5 text-xs text-slate-300 text-center">
          📌 <span className="font-medium">Daily Monitoring Note:</span> The barrier is checked every day. If the index touched the barrier at any point, the red line applies.
        </div>
      )}
    </div>
  );
}
