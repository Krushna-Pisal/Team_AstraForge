/**
 * App.jsx – Root component
 *
 * 4-step stepper application:
 *   Step 1 – Configure Product (functional)
 *   Step 2 – Payoff & Scenarios (functional, live updates with 300 ms debounce)
 *   Step 3 – Client & Suitability (placeholder)
 *   Step 4 – Report (placeholder)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import './index.css';

import ProductForm    from './components/ProductForm';
import PayoffChart    from './components/PayoffChart';
import ScenarioCards  from './components/ScenarioCards';
import Placeholder    from './components/Placeholder';

const API = 'http://localhost:8000';

const STEPS = [
  { id: 1, label: 'Configure Product' },
  { id: 2, label: 'Payoff & Scenarios' },
  { id: 3, label: 'Client & Suitability' },
  { id: 4, label: 'Report' },
];

const DEFAULT_PRODUCT = {
  underlying: 'NIFTY50',
  investment: 1000000,
  tenor_years: 1,
  strike_pct: 90,
  barrier_pct: 70,
  barrier_monitoring: 'daily',
  coupon_pct_pa: 12,
};

const INR_FULL = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function App() {
  const [step, setStep]           = useState(1);
  const [product, setProduct]     = useState(DEFAULT_PRODUCT);
  const [payoffData, setPayoff]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const debouncedProduct = useDebounce(product, 300);

  /* ── Fetch payoff whenever debounced product changes ── */
  useEffect(() => {
    let cancelled = false;
    async function fetchPayoff() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API}/payoff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(debouncedProduct),
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => ({}));
          throw new Error(detail?.detail?.[0]?.msg || detail?.detail || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!cancelled) setPayoff(data);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to reach backend');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPayoff();
    return () => { cancelled = true; };
  }, [debouncedProduct]);

  /* ── Summary strip text ── */
  const summaryText = () => {
    const { underlying, tenor_years, strike_pct, barrier_pct, coupon_pct_pa } = product;
    const tenorLabel = tenor_years === 0.5 ? '6M' : `${tenor_years}Y`;
    return {
      name: `${underlying} ELN`,
      tenor: tenorLabel,
      strike: `Strike ${strike_pct}%`,
      barrier: `Barrier ${barrier_pct}%`,
      coupon: `Coupon ${coupon_pct_pa}% p.a.`,
    };
  };

  const s = summaryText();

  return (
    <div className="app-shell">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-inner">
          <div className="header-logo">
            <div className="logo-icon">📊</div>
            <div className="logo-text">
              <span className="logo-title">Payoff Simulator</span>
              <span className="logo-subtitle">Structured Investment Products</span>
            </div>
          </div>

          {/* Summary strip */}
          <div className="summary-strip">
            <span className="pill">{s.name}</span>
            <span>|</span>
            <span className="pill">{s.tenor}</span>
            <span>|</span>
            <span>{s.strike} / {s.barrier}</span>
            <span>|</span>
            <span>{s.coupon}</span>
          </div>
        </div>
      </header>

      {/* ── Stepper ── */}
      <nav className="stepper-bar" aria-label="Steps">
        <div className="stepper-inner">
          {STEPS.map((st, idx) => {
            const isDone   = step > st.id;
            const isActive = step === st.id;
            const isPlaceholder = st.id >= 3;
            return (
              <div key={st.id} className={`step-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
                <button
                  id={`step-btn-${st.id}`}
                  className="step-btn"
                  onClick={() => !isPlaceholder && setStep(st.id)}
                  disabled={isPlaceholder}
                  title={isPlaceholder ? 'Coming in next phase' : st.label}
                >
                  <span className="step-number">
                    {isDone ? '✓' : st.id}
                  </span>
                  <span className="step-label">{st.label}</span>
                </button>
                {idx < STEPS.length - 1 && <div className="step-connector" />}
              </div>
            );
          })}
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="main-content">
        <div className="content-inner">

          {/* ── STEP 1: Configure Product ── */}
          {step === 1 && (
            <div className="two-col fade-in">
              <div className="card">
                <div className="card-title">
                  <span className="icon">⚙️</span> Configure ELN Product
                </div>
                <ProductForm product={product} onChange={setProduct} />
                <button
                  id="btn-next-step2"
                  className="btn-primary"
                  onClick={() => setStep(2)}
                  style={{ marginTop: '1.5rem' }}
                >
                  View Payoff →
                </button>
              </div>

              {/* Live preview on step 1 too */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="card">
                  <div className="card-title"><span className="icon">💡</span> Live Preview</div>
                  {loading && <div className="loading-shimmer" />}
                  {error && <div className="error-banner">⚠️ {error}</div>}
                  {payoffData && !loading && (
                    <>
                      <div className="price-meta">
                        <div className="price-tag">
                          <span className="price-tag-label">S₀ (Reference)</span>
                          <span className="price-tag-value">{INR_FULL.format(payoffData.s0)}</span>
                        </div>
                        <div className="price-tag">
                          <span className="price-tag-label">Strike Price</span>
                          <span className="price-tag-value">{INR_FULL.format(payoffData.strike_price)}</span>
                        </div>
                        <div className="price-tag">
                          <span className="price-tag-label">Barrier Price</span>
                          <span className="price-tag-value" style={{ color: 'var(--accent-red)' }}>
                            {INR_FULL.format(payoffData.barrier_price)}
                          </span>
                        </div>
                      </div>
                      <PayoffChart
                        curve={payoffData.curve}
                        strikePct={product.strike_pct}
                        barrierPct={product.barrier_pct}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Payoff & Scenarios ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="fade-in">

              {/* Control row */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  id="btn-back-step1"
                  className="btn-primary"
                  onClick={() => setStep(1)}
                  style={{ width: 'auto', padding: '0.55rem 1.2rem', fontSize: '0.82rem' }}
                >
                  ← Back
                </button>
                {loading && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Updating…
                  </span>
                )}
              </div>

              {error && <div className="error-banner">⚠️ {error}</div>}

              {/* Price meta + Formula */}
              {payoffData && (
                <div className="card">
                  <div className="card-title"><span className="icon">🏷️</span> Reference Prices & Formula</div>
                  <div className="price-meta">
                    <div className="price-tag">
                      <span className="price-tag-label">S₀ (NIFTY 50 Last Close)</span>
                      <span className="price-tag-value">{INR_FULL.format(payoffData.s0)}</span>
                    </div>
                    <div className="price-tag">
                      <span className="price-tag-label">Strike Price</span>
                      <span className="price-tag-value">{INR_FULL.format(payoffData.strike_price)}</span>
                    </div>
                    <div className="price-tag">
                      <span className="price-tag-label">Barrier Price</span>
                      <span className="price-tag-value" style={{ color: 'var(--accent-red)' }}>
                        {INR_FULL.format(payoffData.barrier_price)}
                      </span>
                    </div>
                  </div>
                  <div className="formula-box">
                    <pre>{payoffData.formula_text}</pre>
                  </div>
                </div>
              )}

              {/* Payoff chart */}
              <div className="card">
                <div className="card-title"><span className="icon">📈</span> Payoff Curve</div>
                {loading && <div className="loading-shimmer" />}
                {payoffData && !loading && (
                  <PayoffChart
                    curve={payoffData.curve}
                    strikePct={product.strike_pct}
                    barrierPct={product.barrier_pct}
                  />
                )}
              </div>

              {/* Scenario cards */}
              <div className="card">
                <div className="card-title"><span className="icon">🎯</span> Scenario Analysis</div>
                {loading && <div className="loading-shimmer" style={{ height: 140 }} />}
                {payoffData && !loading && (
                  <ScenarioCards scenarios={payoffData.scenarios} />
                )}
              </div>

              {/* Tweak panel */}
              <div className="card">
                <div className="card-title"><span className="icon">🎛️</span> Quick Adjustments</div>
                <ProductForm product={product} onChange={setProduct} />
              </div>

              <p className="disclaimer">
                ⚠️ Past performance is not a guarantee. Illustrative only. Not financial advice.
                This tool is for educational purposes. Please consult a qualified financial advisor.
              </p>
            </div>
          )}

          {/* ── STEP 3: Placeholder ── */}
          {step === 3 && (
            <Placeholder
              step={3}
              icon="🧑‍💼"
              title="Client Suitability Assessment"
              description="This step will collect client risk profile, investment objectives, and regulatory suitability flags (KYC, SEBI guidelines). The engine will determine product eligibility and generate a suitability score."
            />
          )}

          {/* ── STEP 4: Placeholder ── */}
          {step === 4 && (
            <Placeholder
              step={4}
              icon="📋"
              title="Report Generator"
              description="This step will produce a downloadable PDF/HTML term sheet with the full payoff profile, scenario analysis, historical backtest, suitability summary, and regulatory disclaimers."
            />
          )}

        </div>
      </main>
    </div>
  );
}
