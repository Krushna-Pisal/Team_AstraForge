import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAssessment } from "../state/AssessmentContext";
import { api } from "../lib/api";
import { PageTitle, Field, ErrorNotice } from "./ui/Workflow";
import UnderlyingSearch from "./UnderlyingSearch";
const defaults = {
  ELN: {
    tenor_years: 1,
    coupon_pct_pa: 8,
    strike_pct: 100,
    barrier_pct: 70,
    barrier_monitoring: "daily",
    contract_variant: "unconditional_strike",
    settlement_method: "cash",
  },
  DCD: {
    tenor_years: 1,
    coupon_pct_pa: 5,
    conversion_strike_rate: "",
    conversion_condition: "FX_AT_OR_ABOVE_STRIKE",
  },
  CPN: {
    tenor_years: 1,
    coupon_pct_pa: 0,
    protection_pct: 100,
    participation_rate: 80,
    upside_cap_pct: null,
    cap_basis: "investor_return",
  },
};
export default function ProductConfiguration({ type }) {
  const { state, dispatch } = useAssessment();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const edit = state.products.find(
    (p) => p.id === params.get("edit") && p.template.product_type === type,
  );
  return (
    <ProductForm
      key={type + ":" + (edit?.id || "new")}
      {...{ type, edit, state, dispatch, navigate }}
    />
  );
}
function ProductForm({ type, edit, state, dispatch, navigate }) {
  const key = type.toLowerCase() + "_terms";
  const [name, setName] = useState(edit?.template.name || "");
  const [terms, setTerms] = useState(edit?.template[key] || defaults[type]);
  const [underlying, setUnderlying] = useState(edit ? edit.instrument : null);
  const [market, setMarket] = useState(null);
  const [error, setError] = useState("");
  const [marketError, setMarketError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  function handleDeleteProduct() {
    if (edit?.id) {
      dispatch({ type: "delete_product", id: edit.id });
      navigate("/simulator");
    }
  }
  useEffect(() => {
    if (!underlying) return;
    const controller = new AbortController();
    api(
      "/api/market-data/history?ticker=" +
        encodeURIComponent(underlying.ticker) +
        "&source=online",
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setMarket(data);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setMarketError(e.message);
      });
    return () => controller.abort();
  }, [underlying, attempt]);
  const set = (k, v) => setTerms((t) => ({ ...t, [k]: v }));
  const number = (k, label, min, max, hint, optional = false) => (
    <Field label={label} hint={hint}>
      <input
        type="number"
        required={!optional}
        min={min}
        max={max}
        step="any"
        value={terms[k] ?? ""}
        onChange={(e) =>
          set(
            k,
            e.target.value === ""
              ? optional
                ? null
                : ""
              : Number(e.target.value),
          )
        }
      />
    </Field>
  );
  async function save(e) {
    e.preventDefault();
    setError("");
    if (!market?.instrument || market.ticker !== underlying?.ticker)
      return setError("Choose an underlying and wait for its price to load.");
    if (
      state.products.some(
        (p) =>
          p.id !== edit?.id &&
          p.template.name.toLowerCase() === name.trim().toLowerCase(),
      )
    )
      return setError(
        "A product with that name already exists. Use a different name or edit the saved product.",
      );
    if (!edit && state.products.length >= 100)
      return setError("This session already has 100 products.");
    setBusy(true);
    try {
      const result = await api("/api/products/validate", {
        body: {
          name: name.trim(),
          product_type: type,
          ticker: underlying.ticker,
          currency:
            type === "DCD" ? market.instrument.deposit : market.currency,
          [key]: terms,
        },
      });
      dispatch({
        type: "save_product",
        value: { id: edit?.id || crypto.randomUUID(), ...result },
      });
      navigate(e.nativeEvent.submitter?.value === "use" ? "/simulator/investment" : "/simulator");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-stack">
      <PageTitle
        title={(edit ? "Edit " : "Add ") + type + " product"}
        description="Save the product's terms once. No customer details or investment amount are needed here."
      />
      <form className="page-stack" onSubmit={save}>
        <section className="card section-card">
          <div className="form-grid">
            <Field label="Product name">
              <input
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nifty income note"
              />
            </Field>
            <UnderlyingSearch
              kind={type === "DCD" ? "fx" : "equity"}
              value={underlying}
              onChange={(item) => {
                setUnderlying(item);
                setMarket(null);
                setMarketError("");
              }}
            />
            {number(
              "tenor_years",
              "Product duration (years)",
              0.001,
              30,
              "For 6 months, enter 0.5.",
            )}
            {number("coupon_pct_pa", "Annual interest (%)", 0, 100)}
            {type === "ELN" && (
              <>
                {number(
                  "strike_pct",
                  "Settlement level (% of starting price)",
                  0.01,
                  100,
                  "Used to calculate repayment if the loss trigger is hit.",
                )}
                {number(
                  "barrier_pct",
                  "Loss trigger (% of starting price)",
                  0.01,
                  100,
                  "Must be below the settlement level.",
                )}
              </>
            )}
            {type === "DCD" &&
              number(
                "conversion_strike_rate",
                "Agreed conversion rate",
                0.000001,
                undefined,
                market?.instrument
                  ? "Units of " +
                      market.instrument.alternate +
                      " per 1 " +
                      market.instrument.deposit +
                      ". This fixed rate is kept when reusing the product."
                  : "Choose a currency pair first.",
              )}
            {type === "CPN" && (
              <>
                {number(
                  "protection_pct",
                  "Investment protected at maturity (%)",
                  0,
                  100,
                )}
                {number(
                  "participation_rate",
                  "Share of market growth (%)",
                  0,
                  1000,
                )}
              </>
            )}
          </div>
          {underlying && !market && !marketError && (
            <p role="status">Loading current reference price…</p>
          )}
          {market && (
            <p className="notice">
              Currency:{" "}
              {type === "DCD" ? market.instrument.deposit : market.currency} ·
              Reference price: {market.latest_price} · Price date:{" "}
              {market.end_date || market.as_of || "see data source"}. Reference
              prices are refreshed from available data for each assessment.
            </p>
          )}
          {market?.warnings?.map((w) => (
            <p key={w} className="notice warning">
              {w}
            </p>
          ))}
          <ErrorNotice
            error={marketError}
            retry={() => {
              setMarketError("");
              setAttempt((a) => a + 1);
            }}
          />
        </section>
        <details className="card section-card">
          <summary>More product settings</summary>
          <div className="form-grid">
            {type === "ELN" && (
              <>
                <Field label="When is the loss trigger checked?">
                  <select
                    value={terms.barrier_monitoring}
                    onChange={(e) => set("barrier_monitoring", e.target.value)}
                  >
                    <option value="daily">Daily</option>
                    <option value="maturity">Only at maturity</option>
                  </select>
                </Field>
                <Field label="Interest payment rule">
                  <select
                    value={terms.contract_variant}
                    onChange={(e) => set("contract_variant", e.target.value)}
                  >
                    <option value="unconditional_strike">
                      Interest is paid even if the trigger is hit
                    </option>
                    <option value="phase2_contingent">
                      No interest if the trigger is hit (legacy model)
                    </option>
                  </select>
                </Field>
              </>
            )}
            {type === "DCD" && (
              <Field label="Convert the deposit when the final rate is">
                <select
                  value={terms.conversion_condition}
                  onChange={(e) => set("conversion_condition", e.target.value)}
                >
                  <option value="FX_AT_OR_ABOVE_STRIKE">
                    At or above the agreed rate
                  </option>
                  <option value="FX_AT_OR_BELOW_STRIKE">
                    At or below the agreed rate
                  </option>
                </select>
              </Field>
            )}
            {type === "CPN" && (
              <>
                {number(
                  "upside_cap_pct",
                  "Maximum growth return (%)",
                  0,
                  1000,
                  "Leave blank for no cap.",
                  true,
                )}
                <Field label="Apply the cap to">
                  <select
                    value={terms.cap_basis}
                    onChange={(e) => set("cap_basis", e.target.value)}
                  >
                    <option value="investor_return">
                      Investor's growth return
                    </option>
                    <option value="underlying_return">
                      Market growth before participation
                    </option>
                  </select>
                </Field>
              </>
            )}
          </div>
        </details>
        <p className="muted">
          Default settings are examples, not live offers. Verify every term
          against the product document. Protection depends on the issuer paying
          at maturity.{" "}
          {type === "CPN"
            ? "This model repays the protected portion plus interest and growth participation."
            : ""}{" "}
          {type === "ELN"
            ? "Daily monitoring scenarios use modeled price paths, not a forecast."
            : ""}
        </p>
        <ErrorNotice error={error} />
        {confirmDelete && edit && (
          <div className="notice warning delete-confirm-bar" role="alert">
            <span>
              Are you sure you want to delete <strong>{edit.template.name}</strong> from saved products?
            </span>
            <div className="button-row">
              <button
                type="button"
                className="btn-danger-sm"
                onClick={handleDeleteProduct}
              >
                Yes, delete product
              </button>
              <button
                type="button"
                className="btn-secondary-sm"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <div className="actions">
          {edit && !confirmDelete && (
            <button
              type="button"
              className="btn-danger"
              onClick={() => setConfirmDelete(true)}
            >
              Delete product
            </button>
          )}
          {state.client?.proposed_investment_amount && <button type="submit" value="use" className="btn-secondary" disabled={busy || !market}>Save & use for this customer</button>}
          <Link to="/simulator" className="btn-secondary">
            Back to products
          </Link>
          <button
            disabled={busy || !market}
            className="btn-primary"
            type="submit"
          >
            {busy ? "Saving…" : edit ? "Save changes" : "Save product"}
          </button>
        </div>
      </form>
    </div>
  );
}
