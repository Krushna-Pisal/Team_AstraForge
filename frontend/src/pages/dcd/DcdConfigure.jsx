import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Info, AlertTriangle } from 'lucide-react';
import { useAssessment } from '../../state/AssessmentContext';
import { api } from '../../lib/api';

const PAIR_OPTIONS = [
  { ticker: 'USDINR=X', label: 'USD / INR', deposit: 'USD', alternate: 'INR', defaultStrike: 86.50 },
  { ticker: 'EURUSD=X', label: 'EUR / USD', deposit: 'EUR', alternate: 'USD', defaultStrike: 1.0850 },
  { ticker: 'GBPUSD=X', label: 'GBP / USD', deposit: 'GBP', alternate: 'USD', defaultStrike: 1.2850 },
];

export default function DcdConfigure() {
  const navigate = useNavigate();
  const { state, dispatch } = useAssessment() || {};

  const [pairs, setPairs] = useState(PAIR_OPTIONS);
  const [selectedPair, setSelectedPair] = useState(PAIR_OPTIONS[0]);
  const [spotPrice, setSpotPrice] = useState(86.50);
  const [loadingPairs, setLoadingPairs] = useState(true);

  const [product, setProduct] = useState({
    deposit_amount: 100000,
    tenor_years: 0.25, // 3 months
    conversion_strike_rate: 86.50,
    conversion_condition: 'FX_AT_OR_ABOVE_STRIKE',
    coupon_pct_pa: 6.0,
    fd_rate_pct_pa: '',
  });

  const [validationError, setValidationError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('/api/dcd/pairs')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPairs(data);
          const current = data.find((p) => p.ticker === selectedPair.ticker) || data[0];
          setSelectedPair(current);
          setSpotPrice(current.latest_price || 86.50);
          setProduct((prev) => ({
            ...prev,
            conversion_strike_rate: current.latest_price ? Number(current.latest_price.toFixed(4)) : prev.conversion_strike_rate,
          }));
        }
        setLoadingPairs(false);
      })
      .catch(() => {
        setLoadingPairs(false);
      });
  }, []);

  const handlePairChange = (ticker) => {
    const pairObj = pairs.find((p) => p.ticker === ticker) || PAIR_OPTIONS[0];
    setSelectedPair(pairObj);
    const newSpot = pairObj.latest_price || (pairObj.ticker === 'USDINR=X' ? 86.50 : 1.085);
    setSpotPrice(newSpot);
    setProduct((prev) => ({
      ...prev,
      conversion_strike_rate: Number(newSpot.toFixed(4)),
    }));
    setValidationError('');
  };

  const setField = (field, value) => {
    setProduct((prev) => ({ ...prev, [field]: value }));
    setValidationError('');
  };

  const applyStrikeMoneyness = (pct) => {
    const newStrike = spotPrice * (1.0 + pct / 100.0);
    setField('conversion_strike_rate', Number(newStrike.toFixed(4)));
  };

  const handleNext = async () => {
    if (!product.deposit_amount || product.deposit_amount <= 0) {
      setValidationError('Deposit amount must be greater than 0.');
      return;
    }
    if (!product.conversion_strike_rate || product.conversion_strike_rate <= 0) {
      setValidationError('Conversion strike rate must be greater than 0.');
      return;
    }
    if (product.coupon_pct_pa < 0 || product.coupon_pct_pa > 100) {
      setValidationError('Coupon rate must be between 0% and 100% p.a.');
      return;
    }

    const strikeVal = Number(product.conversion_strike_rate);
    const fdVal = product.fd_rate_pct_pa !== '' ? Number(product.fd_rate_pct_pa) : null;

    const dcd_terms = {
      tenor_years: Number(product.tenor_years),
      coupon_pct_pa: Number(product.coupon_pct_pa),
      conversion_strike_rate: strikeVal,
      conversion_condition: product.conversion_condition,
    };

    const name = `DCD ${selectedPair.label || selectedPair.ticker} ${strikeVal} strike ${product.coupon_pct_pa}% ${product.tenor_years}y`;
    setSaving(true);
    try {
      const result = await api('/api/products/validate', {
        body: {
          name,
          product_type: 'DCD',
          ticker: selectedPair.ticker,
          currency: selectedPair.deposit_currency || selectedPair.deposit,
          dcd_terms,
        },
      });

      const existing = state?.products?.find((p) => p.template.name.toLowerCase() === name.toLowerCase());
      dispatch({
        type: 'save_product',
        value: {
          id: existing?.id || crypto.randomUUID(),
          ...result,
          dcd_extras: {
            pair: selectedPair.ticker,
            deposit_currency: selectedPair.deposit_currency || selectedPair.deposit,
            alternate_currency: selectedPair.alternate_currency || selectedPair.alternate,
            deposit_amount: Number(product.deposit_amount),
            initial_fx_rate: spotPrice,
            fd_rate_pct_pa: fdVal,
          },
        },
      });

      navigate(state?.client ? '/simulator/investment' : '/clients');
    } catch (e) {
      setValidationError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Live plain-terms summary calculations
  const depCurr = selectedPair.deposit_currency || selectedPair.deposit || 'USD';
  const altCurr = selectedPair.alternate_currency || selectedPair.alternate || 'INR';
  const tenorMonths = Math.round(Number(product.tenor_years) * 12);
  const couponAmount = (Number(product.deposit_amount || 0) * (Number(product.coupon_pct_pa || 0) / 100) * Number(product.tenor_years)).toFixed(2);
  const altPrincipal = (Number(product.deposit_amount || 0) * Number(product.conversion_strike_rate || 0)).toFixed(2);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Configure Dual Currency Deposit (DCD)
          </h2>
          <p className="text-sm text-slate-500">
            High-yield structured currency deposit with linked conversion terms.
          </p>
        </div>
        <span className="px-3 py-1 bg-brand/10 text-brand rounded-full text-sm font-medium">
          Step 1 of 4
        </span>
      </div>

      {validationError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg flex items-center justify-between">
          <span>{validationError}</span>
          <button className="text-rose-500 font-bold" onClick={() => setValidationError('')}>
            ✕
          </button>
        </div>
      )}

      <div className="card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Currency Pair */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
              <ArrowLeftRight className="h-4 w-4 text-brand" />
              Currency Pair
            </label>
            <select
              className="input w-full"
              value={selectedPair.ticker}
              onChange={(e) => handlePairChange(e.target.value)}
              disabled={loadingPairs}
            >
              {pairs.map((p) => (
                <option key={p.ticker} value={p.ticker}>
                  {p.label || p.ticker} (Base: {p.deposit_currency || p.deposit}, Linked: {p.alternate_currency || p.alternate})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">
              Latest Spot Rate: <strong className="text-slate-800 font-mono">{spotPrice?.toFixed(4)}</strong> {altCurr}/{depCurr}
            </p>
          </div>

          {/* Deposit Amount */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Deposit Amount ({depCurr})
            </label>
            <input
              type="number"
              className="input w-full font-mono"
              value={product.deposit_amount}
              onChange={(e) => setField('deposit_amount', e.target.value)}
              min="1"
              step="1000"
            />
            <p className="text-xs text-slate-500">Principal deposited in {depCurr}.</p>
          </div>

          {/* Tenor */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Tenor</label>
            <select
              className="input w-full"
              value={product.tenor_years}
              onChange={(e) => setField('tenor_years', Number(e.target.value))}
            >
              <option value={1 / 12}>1 Month (approx 30 days)</option>
              <option value={3 / 12}>3 Months (approx 91 days)</option>
              <option value={6 / 12}>6 Months (approx 182 days)</option>
              <option value={1.0}>1 Year</option>
            </select>
            <p className="text-xs text-slate-500">Duration until maturity conversion check.</p>
          </div>

          {/* Conversion Strike Rate */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Conversion Strike Rate ({altCurr} per 1 {depCurr})
            </label>
            <input
              type="number"
              className="input w-full font-mono"
              value={product.conversion_strike_rate}
              onChange={(e) => setField('conversion_strike_rate', e.target.value)}
              step="0.0001"
              min="0.0001"
            />
            <div className="flex gap-1.5 pt-1">
              <button
                type="button"
                className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300"
                onClick={() => applyStrikeMoneyness(0)}
              >
                ATM Spot
              </button>
              <button
                type="button"
                className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300"
                onClick={() => applyStrikeMoneyness(1)}
              >
                +1% OTM
              </button>
              <button
                type="button"
                className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300"
                onClick={() => applyStrikeMoneyness(2)}
              >
                +2% OTM
              </button>
            </div>
          </div>

          {/* Conversion Condition */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Conversion Trigger Condition</label>
            <select
              className="input w-full"
              value={product.conversion_condition}
              onChange={(e) => setField('conversion_condition', e.target.value)}
            >
              <option value="FX_AT_OR_ABOVE_STRIKE">
                FX at or above strike (ST &gt;= Strike) — Standard
              </option>
              <option value="FX_AT_OR_BELOW_STRIKE">
                FX at or below strike (ST &lt;= Strike) — Reverse
              </option>
            </select>
            <p className="text-xs text-slate-500">Condition determining whether alternate currency is repaid.</p>
          </div>

          {/* Coupon Rate */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Enhanced Coupon Rate (% p.a.)
            </label>
            <input
              type="number"
              className="input w-full font-mono"
              value={product.coupon_pct_pa}
              onChange={(e) => setField('coupon_pct_pa', e.target.value)}
              min="0"
              max="100"
              step="0.1"
            />
            <p className="text-xs text-slate-500">Always earned and paid in {depCurr}.</p>
          </div>

          {/* Optional Benchmark Deposit Rate */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">
              Assumed plain deposit rate (% p.a.) — Optional benchmark
            </label>
            <input
              type="number"
              className="input w-full font-mono"
              placeholder="e.g. 4.5 (Leave blank to skip comparison)"
              value={product.fd_rate_pct_pa}
              onChange={(e) => setField('fd_rate_pct_pa', e.target.value)}
              min="0"
              max="50"
              step="0.1"
            />
            <p className="text-xs text-slate-400">
              User-entered benchmark for historical outperformance comparison. No default assumed.
            </p>
          </div>
        </div>

        {/* Live Plain-Terms Summary */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
            <Info className="h-4 w-4 text-brand" />
            Plain-Terms Contract Summary
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            You deposit <strong className="text-slate-900">{depCurr} {Number(product.deposit_amount || 0).toLocaleString()}</strong> for{' '}
            <strong className="text-slate-900">{tenorMonths} month{tenorMonths > 1 ? 's' : ''}</strong> at a fixed coupon of{' '}
            <strong className="text-emerald-700">{product.coupon_pct_pa}% p.a.</strong> earning{' '}
            <strong className="text-emerald-700">+{depCurr} {couponAmount}</strong> in interest regardless of FX movements.
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            At maturity, if the {selectedPair.label || selectedPair.ticker} exchange rate is{' '}
            <strong className="text-amber-800">
              {product.conversion_condition === 'FX_AT_OR_ABOVE_STRIKE' ? 'at or above' : 'at or below'} {product.conversion_strike_rate}
            </strong>, your principal converts to{' '}
            <strong className="text-slate-900">{altCurr} {Number(altPrincipal).toLocaleString()}</strong>.
            Otherwise, your principal is repaid 100% in original <strong className="text-slate-900">{depCurr}</strong>.
          </p>
          <div className="pt-2 border-t border-slate-200/60 flex items-center gap-1.5 text-[11px] text-amber-800 font-medium">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>High currency conversion risk: principal is not protected against adverse exchange rate depreciation.</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-2">
        <button className="btn-secondary" onClick={() => navigate('/simulator')}>
          Back to Products
        </button>
        <button
          className="btn-primary"
          onClick={handleNext}
          disabled={saving}
        >
          {saving ? 'Validating & Saving...' : 'Continue to Customer Profile'}
        </button>
      </div>
    </div>
  );
}
