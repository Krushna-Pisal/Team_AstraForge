/**
 * ProductForm.jsx
 *
 * Step 1 – ELN product configuration form.
 * All inputs are controlled; inline validation mirrors the backend Pydantic rules.
 */

import { useState, useEffect } from "react";

const TENORS = [0.5, 1, 2];

const defaults = {
  underlying: "NIFTY50",
  investment: 1000000,
  tenor_years: 1,
  strike_pct: 90,
  barrier_pct: 70,
  barrier_monitoring: "daily",
  coupon_pct_pa: 12,
};

function validate(vals) {
  const errors = {};
  if (vals.investment <= 0) errors.investment = "Investment must be positive";
  if (vals.coupon_pct_pa <= 0 || vals.coupon_pct_pa > 30)
    errors.coupon_pct_pa = "Coupon must be 1–30% p.a.";
  if (vals.strike_pct < 70 || vals.strike_pct > 100)
    errors.strike_pct = "Strike must be 70–100%";
  if (vals.barrier_pct < 40 || vals.barrier_pct > 85)
    errors.barrier_pct = "Barrier must be 40–85%";
  if (vals.barrier_pct >= vals.strike_pct)
    errors.barrier_pct = "Barrier must be strictly less than Strike";
  return errors;
}

export default function ProductForm({ product, onChange }) {
  const [local, setLocal] = useState({ ...defaults, ...product });
  const errors = validate(local);

  // Sync upward on valid changes
  useEffect(() => {
    const errs = validate(local);
    if (Object.keys(errs).length === 0) {
      onChange(local);
    }
  }, [local]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key, value) => setLocal((prev) => ({ ...prev, [key]: value }));

  const fmtInr = (v) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(v);

  return (
    <div className="form-grid">
      {/* Investment */}
      <div className="form-group">
        <label className="form-label">Investment (₹)</label>
        <input
          id="input-investment"
          type="number"
          className={`form-control ${errors.investment ? "error" : ""}`}
          value={local.investment}
          min={1}
          step={100000}
          onChange={(e) => set("investment", parseFloat(e.target.value) || 0)}
        />
        {errors.investment && <p className="form-error">{errors.investment}</p>}
        <p className="form-hint">₹ {fmtInr(local.investment)}</p>
      </div>

      {/* Tenor */}
      <div className="form-group">
        <label className="form-label">Tenor (Years)</label>
        <div className="seg-control">
          {TENORS.map((t) => (
            <button
              key={t}
              id={`tenor-${t}`}
              className={`seg-btn ${local.tenor_years === t ? "active" : ""}`}
              onClick={() => set("tenor_years", t)}
              type="button"
            >
              {t === 0.5 ? "6M" : `${t}Y`}
            </button>
          ))}
        </div>
      </div>

      {/* Strike */}
      <div className="form-group">
        <label className="form-label">Strike (%)</label>
        <div className="slider-row">
          <input
            id="slider-strike"
            type="range"
            min={70}
            max={100}
            step={1}
            value={local.strike_pct}
            onChange={(e) => set("strike_pct", parseFloat(e.target.value))}
            style={{
              background: `linear-gradient(to right, #4fa3e0 0%, #4fa3e0 ${((local.strike_pct - 70) / 30) * 100}%, var(--border-dim) ${((local.strike_pct - 70) / 30) * 100}%, var(--border-dim) 100%)`,
            }}
          />
          <span className="slider-value">{local.strike_pct}%</span>
        </div>
        {errors.strike_pct && <p className="form-error">{errors.strike_pct}</p>}
      </div>

      {/* Barrier */}
      <div className="form-group">
        <label className="form-label">Barrier (%)</label>
        <div className="slider-row">
          <input
            id="slider-barrier"
            type="range"
            min={40}
            max={85}
            step={1}
            value={local.barrier_pct}
            onChange={(e) => set("barrier_pct", parseFloat(e.target.value))}
            style={{
              background: `linear-gradient(to right, #f87171 0%, #f87171 ${((local.barrier_pct - 40) / 45) * 100}%, var(--border-dim) ${((local.barrier_pct - 40) / 45) * 100}%, var(--border-dim) 100%)`,
            }}
          />
          <span className="slider-value" style={{ color: "var(--accent-red)" }}>
            {local.barrier_pct}%
          </span>
        </div>
        {errors.barrier_pct && (
          <p className="form-error">{errors.barrier_pct}</p>
        )}
      </div>

      {/* Barrier Monitoring */}
      <div className="form-group">
        <label className="form-label">Barrier Monitoring</label>
        <div className="seg-control">
          {["daily", "maturity"].map((m) => (
            <button
              key={m}
              id={`monitoring-${m}`}
              className={`seg-btn ${local.barrier_monitoring === m ? "active" : ""}`}
              onClick={() => set("barrier_monitoring", m)}
              type="button"
            >
              {m === "daily" ? "📅 Daily" : "📆 At Maturity"}
            </button>
          ))}
        </div>
        <p className="form-hint">
          {local.barrier_monitoring === "daily"
            ? "Breach checked every trading day"
            : "Breach checked only at expiry"}
        </p>
      </div>

      {/* Coupon */}
      <div className="form-group">
        <label className="form-label">Coupon (% p.a.)</label>
        <div className="slider-row">
          <input
            id="slider-coupon"
            type="range"
            min={1}
            max={30}
            step={0.5}
            value={local.coupon_pct_pa}
            onChange={(e) => set("coupon_pct_pa", parseFloat(e.target.value))}
            style={{
              background: `linear-gradient(to right, #34d399 0%, #34d399 ${((local.coupon_pct_pa - 1) / 29) * 100}%, var(--border-dim) ${((local.coupon_pct_pa - 1) / 29) * 100}%, var(--border-dim) 100%)`,
            }}
          />
          <span
            className="slider-value"
            style={{ color: "var(--accent-green)" }}
          >
            {local.coupon_pct_pa}%
          </span>
        </div>
        {errors.coupon_pct_pa && (
          <p className="form-error">{errors.coupon_pct_pa}</p>
        )}
        <p className="form-hint">
          Coupon income: ₹{" "}
          {fmtInr(
            ((local.investment * local.coupon_pct_pa) / 100) *
              local.tenor_years,
          )}{" "}
          (always paid)
        </p>
      </div>

      {/* Validation summary */}
      {Object.keys(errors).length > 0 && (
        <div className="error-banner">
          ⚠️ Fix the highlighted errors before proceeding
        </div>
      )}
    </div>
  );
}
