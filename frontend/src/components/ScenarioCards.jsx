/**
 * ScenarioCards.jsx
 *
 * Renders the scenario outcomes for preset shocks as premium metric cards.
 * Each card shows: shock label, final amount (INR), P&L, and barrier status.
 */

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
      <div className="loading-shimmer" style={{ height: 120 }} />
    );
  }

  return (
    <div className="scenarios-grid fade-in">
      {scenarios.map(s => {
        const key = String(s.shock_pct);
        const meta = SHOCK_LABELS[key] || { label: `${s.shock_pct > 0 ? '+' : ''}${s.shock_pct}%`, emoji: '📊' };
        const isPositivePnl = s.profit_loss >= 0;

        return (
          <div
            key={key}
            id={`scenario-card-${key.replace('-', 'neg')}`}
            className={`scenario-card ${isPositivePnl ? 'positive' : 'negative'}`}
          >
            <div className="scenario-shock">
              {meta.emoji} Underlying {meta.label}
            </div>
            <div className="scenario-underlying" style={{ fontSize: '0.72rem' }}>
              Investor: {s.return_pct >= 0 ? '+' : ''}{s.return_pct.toFixed(2)}%
            </div>
            <div className="scenario-amount">
              {INR_COMPACT.format(s.final_amount)}
            </div>
            <div className={`scenario-pnl ${isPositivePnl ? 'pos' : 'neg'}`}>
              {isPositivePnl ? '▲' : '▼'} {INR.format(Math.abs(s.profit_loss))}
            </div>
            <span className={`scenario-badge ${s.barrier_breached ? 'breached' : 'safe'}`}>
              {s.barrier_breached ? '⛔ Breached' : '✅ Safe'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
