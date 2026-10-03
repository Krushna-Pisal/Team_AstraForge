import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Info } from 'lucide-react';
import { useAssessment } from '../../state/AssessmentContext';
import { api } from '../../lib/api';

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export default function CpnConfigure() {
  const navigate = useNavigate();
  const { state, dispatch } = useAssessment() || {};

  const [underlyings, setUnderlyings] = useState(['NIFTY50']);
  const [loadingUnderlyings, setLoadingUnderlyings] = useState(true);

  const [product, setProduct] = useState({
    underlying: 'NIFTY50',
    investment: 1000000,
    tenor_years: 3,
    protection_pct: 100,
    participation_pct: 100,
    cap_pct: '',
    coupon_pct_pa: 0,
    fd_rate_pct_pa: '',
  });

  const [validationError, setValidationError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('http://localhost:8000/api/cpn/underlyings')
      .then((res) => (res.ok ? res.json() : ['NIFTY50']))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setUnderlyings(data);
          if (!data.includes(product.underlying)) {
            setProduct((prev) => ({ ...prev, underlying: data[0] }));
          }
        }
        setLoadingUnderlyings(false);
      })
      .catch(() => {
        setLoadingUnderlyings(false);
      });
  }, []);

  const setField = (field, value) => {
    setProduct((prev) => ({ ...prev, [field]: value }));
    setValidationError('');
  };

  const handleNext = async () => {
    // Basic frontend validations
    if (!product.investment || product.investment <= 0) {
      setValidationError('Investment amount must be greater than 0.');
      return;
    }
    if (product.protection_pct < 80 || product.protection_pct > 100) {
      setValidationError('Protection percentage must be between 80% and 100%.');
      return;
    }
    if (product.participation_pct < 10 || product.participation_pct > 150) {
      setValidationError('Participation rate must be between 10% and 150%.');
      return;
    }
    if (product.cap_pct !== '' && Number(product.cap_pct) <= 0) {
      setValidationError('Upside cap must be greater than 0 when specified.');
      return;
    }

    const capVal = product.cap_pct !== '' ? Number(product.cap_pct) : null;
    const fdVal = product.fd_rate_pct_pa !== '' ? Number(product.fd_rate_pct_pa) : null;
    // Terms in the shape the existing /api/products/validate expects.
    // Cap applies to the UNDERLYING return (spec: participation stops once the underlying is up cap%).
    const cpn_terms = {
      tenor_years: Number(product.tenor_years),
      coupon_pct_pa: product.coupon_pct_pa !== '' ? Number(product.coupon_pct_pa) : 0,
      protection_pct: Number(product.protection_pct),
      participation_rate: Number(product.participation_pct),
      upside_cap_pct: capVal,
      cap_basis: 'underlying_return',
    };
    const name = `CPN ${product.underlying} ${cpn_terms.protection_pct}% / ${cpn_terms.participation_rate}%${capVal ? ` cap ${capVal}%` : ''} ${cpn_terms.tenor_years}y`;
    setSaving(true);
    try {
      const result = await api('/api/products/validate', {
        body: { name, product_type: 'CPN', ticker: '^NSEI', currency: 'INR', cpn_terms },
      });
      const existing = state?.products?.find((p) => p.template.name.toLowerCase() === name.toLowerCase());
      dispatch({
        type: 'save_product',
        value: {
          id: existing?.id || crypto.randomUUID(),
          ...result,
          // CPN-only extras used by the new CPN results view (not part of the shared template)
          cpn_extras: { underlying: product.underlying, fd_rate_pct_pa: fdVal, investment: Number(product.investment) },
        },
      });
      navigate(state?.client ? '/simulator/investment' : '/clients');
    } catch (e) {
      setValidationError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Live plain-terms summary
  const protectedAmt = (Number(product.investment || 0) * Number(product.protection_pct || 100)) / 100;
  const capText = product.cap_pct !== '' ? `capped at +${product.cap_pct}% index growth` : 'with uncapped upside';
  const couponText = Number(product.coupon_pct_pa || 0) > 0 ? ` plus a fixed coupon of ${product.coupon_pct_pa}% p.a.` : '';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Configure Capital-Protected Note (CPN)</h2>
          <p className="text-sm text-slate-500">
            Define contractual protection level, upside participation, and optional coupon or caps.
          </p>
        </div>
        <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-sm font-medium">
          Step 1 of 4
        </span>
      </div>

      {/* Product Risk Badge replacing old Low Risk label */}
      <div className="flex items-center space-x-2 bg-sky-50 border border-sky-200 text-sky-900 rounded-lg p-3 text-xs">
        <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0" />
        <div>
          <strong>Product Risk Classification:</strong> Principal protected at maturity, subject to issuer credit risk.
        </div>
      </div>

      <div className="card p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Underlying Asset from GET /api/cpn/underlyings */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Underlying Asset</label>
            <select
              className="input"
              value={product.underlying}
              disabled={loadingUnderlyings}
              onChange={(e) => setField('underlying', e.target.value)}
            >
              {underlyings.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">Available real cached daily series</p>
          </div>

          {/* Investment Amount */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Investment Amount (₹)</label>
            <input
              type="number"
              min="1"
              className="input"
              value={product.investment}
              onChange={(e) => setField('investment', e.target.value)}
            />
          </div>

          {/* Tenor Years (Allowed: 0.5, 1, 2, 3, 5) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Tenor</label>
            <select
              className="input"
              value={product.tenor_years}
              onChange={(e) => setField('tenor_years', Number(e.target.value))}
            >
              <option value={0.5}>6 Months (0.5 Years)</option>
              <option value={1}>1 Year</option>
              <option value={2}>2 Years</option>
              <option value={3}>3 Years</option>
              <option value={5}>5 Years</option>
            </select>
          </div>

          {/* Principal Protection Percentage (80 - 100) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Principal Protection Level (%)</label>
            <input
              type="number"
              min="80"
              max="100"
              step="1"
              className="input"
              value={product.protection_pct}
              onChange={(e) => setField('protection_pct', Number(e.target.value))}
            />
            <p className="text-[11px] text-slate-400">Allowed range: 80% to 100%</p>
          </div>

          {/* Participation Percentage (10 - 150) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Participation Rate (%)</label>
            <input
              type="number"
              min="10"
              max="150"
              step="5"
              className="input"
              value={product.participation_pct}
              onChange={(e) => setField('participation_pct', Number(e.target.value))}
            />
            <p className="text-[11px] text-slate-400">Share of positive underlying growth (10% to 150%)</p>
          </div>

          {/* Upside Cap (%) - Optional */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Upside Cap (%) — Optional</label>
            <input
              type="number"
              min="1"
              placeholder="No cap (uncapped)"
              className="input"
              value={product.cap_pct}
              onChange={(e) => setField('cap_pct', e.target.value)}
            />
            <p className="text-[11px] text-slate-400">Underlying gain cap; leave empty for uncapped</p>
          </div>

          {/* Fixed Coupon (% p.a.) - Optional */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Fixed Coupon Rate (% p.a.) — Optional</label>
            <input
              type="number"
              min="0"
              step="0.5"
              className="input"
              value={product.coupon_pct_pa}
              onChange={(e) => setField('coupon_pct_pa', e.target.value)}
            />
            <p className="text-[11px] text-slate-400">Guaranteed periodic yield in addition to protected amount</p>
          </div>

          {/* Assumed FD Rate (% p.a.) - Optional */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Assumed FD Benchmark Rate (% p.a.) — Optional
            </label>
            <input
              type="number"
              min="0"
              step="0.25"
              placeholder="e.g. 7.0 (leave blank to skip)"
              className="input"
              value={product.fd_rate_pct_pa}
              onChange={(e) => setField('fd_rate_pct_pa', e.target.value)}
            />
            <p className="text-[11px] text-slate-400">
              Assumed fixed-deposit rate (user-entered, not market data)
            </p>
          </div>
        </div>

        {validationError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs font-semibold">
            {validationError}
          </div>
        )}

        {/* Live Plain-Terms Summary */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center space-x-1.5 text-slate-800 text-xs font-bold uppercase tracking-wider">
            <Info className="w-4 h-4 text-brand" />
            <span>Live Plain-Terms Product Summary</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            An investment of <strong>{INR.format(Number(product.investment || 0))}</strong> in a{' '}
            <strong>{product.tenor_years}-year</strong> Capital-Protected Note linked to{' '}
            <strong>{product.underlying}</strong>. Contractually guarantees{' '}
            <strong>{product.protection_pct}%</strong> principal protection at maturity (
            <strong>{INR.format(protectedAmt)}</strong> floor value). Provides{' '}
            <strong>{product.participation_pct}%</strong> participation in positive index returns (
            {capText}){couponText}.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <button className="btn-secondary" onClick={() => navigate('/simulator')}>
          Back to Product Selection
        </button>
        <button className="btn-primary" onClick={handleNext}>
          Next: Client Profile Assessment
        </button>
      </div>
    </div>
  );
}
