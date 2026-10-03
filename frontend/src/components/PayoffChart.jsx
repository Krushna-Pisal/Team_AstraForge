/**
 * PayoffChart.jsx
 *
 * Recharts line chart showing investor return % vs underlying return %.
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
  const val = payload[0]?.value;
  return (
    <div className="custom-tooltip">
      <div className="custom-tooltip-label">Underlying: {label > 0 ? '+' : ''}{label}%</div>
      <div className="custom-tooltip-value">
        Investor: {val >= 0 ? '+' : ''}{val?.toFixed(2)}%
      </div>
    </div>
  );
};

export default function PayoffChart({ curve, strikePct, barrierPct }) {
  if (!curve || curve.length === 0) {
    return <div className="loading-shimmer" />;
  }

  return (
    <div className="chart-wrapper fade-in">
      <ResponsiveContainer width="100%" height={340}>
        <LineChart
          data={curve}
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

          {/* Zero line */}
          <ReferenceLine
            y={0}
            stroke="rgba(255,255,255,0.2)"
            strokeDasharray="4 2"
            strokeWidth={1.5}
          />

          {/* Strike reference */}
          <ReferenceLine
            x={strikePct - 100}
            stroke="#4fa3e0"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: `Strike ${strikePct}%`,
              position: 'top',
              fill: '#4fa3e0',
              fontSize: 10,
            }}
          />

          {/* Barrier reference */}
          <ReferenceLine
            x={barrierPct - 100}
            stroke="#f87171"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: `Barrier ${barrierPct}%`,
              position: 'top',
              fill: '#f87171',
              fontSize: 10,
            }}
          />

          <Line
            type="monotone"
            dataKey="investor_return_pct"
            stroke="url(#payoffGradient)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: '#4fa3e0', stroke: '#fff', strokeWidth: 2 }}
          />

          {/* SVG gradient definition */}
          <defs>
            <linearGradient id="payoffGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="45%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
