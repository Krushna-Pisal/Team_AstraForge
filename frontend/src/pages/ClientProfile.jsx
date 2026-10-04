import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAssessment } from "../state/AssessmentContext";
import {
  PageTitle,
  Steps,
  Field,
  ErrorNotice,
} from "../components/ui/Workflow";
const exposureKeys = [
  "existing_structured_product_exposure",
  "existing_underlying_exposure",
  "existing_issuer_exposure",
];
const defaults = {
  client_name: "",
  risk_appetite: "",
  investment_objective: "",
  investment_horizon_months: "",
  max_acceptable_loss_pct: "",
  liquidity_requirement_months: "",
  total_portfolio_value: "",
  portfolio_currency: "INR",
  ...Object.fromEntries(exposureKeys.map((k) => [k, ""])),
};
export default function ClientProfile() {
  const { state, dispatch } = useAssessment();
  const [profile, setProfile] = useState(
    () =>
      state.clientDraft || {
        ...defaults,
        ...state.client,
        ...(state.client?.exposure_details_provided === false
          ? Object.fromEntries(exposureKeys.map((k) => [k, ""]))
          : {}),
      },
  );
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const set = (key, value) => setProfile((p) => ({ ...p, [key]: value }));
  function chooseCustomer(customer) {
    dispatch({ type: "select_customer", id: customer.client_id });
    navigate("/simulator/budget");
  }
  const number = (key, title, min, max, required = true, hint) => (
    <Field label={title} hint={hint}>
      <input
        required={required}
        type="number"
        min={min}
        max={max}
        step={key.endsWith("_months") ? "1" : "any"}
        value={profile[key] ?? ""}
        onChange={(e) =>
          set(key, e.target.value === "" ? "" : Number(e.target.value))
        }
      />
    </Field>
  );
  function submit(e) {
    e.preventDefault();
    if (!profile.client_name.trim())
      return setError("Enter the customer's name.");
    const total =
      profile.total_portfolio_value === ""
        ? null
        : profile.total_portfolio_value;
    if (exposureKeys.some((k) => profile[k] !== "" && !total))
      return setError("Add total investments when entering existing holdings.");
    dispatch({
      type: "save_customer",
      value: {
        ...profile,
        client_name: profile.client_name.trim(),
        client_id:
          profile.client_id || state.client?.client_id || crypto.randomUUID(),
        total_portfolio_value: total,
        exposure_details_provided:
          !!total && exposureKeys.every((k) => profile[k] !== ""),
        ...Object.fromEntries(
          exposureKeys.map((k) => [k, profile[k] === "" ? 0 : profile[k]]),
        ),
      },
    });
    navigate("/simulator/budget");
  }
  return (
    <div className="page-stack">
      <PageTitle
        title="Customer details"
        description="Answer six short questions, then enter the amount once before choosing or discovering products."
      />
      <Steps current={0} />
      {state.customers.length > 0 && (
        <section className="card section-card page-stack">
          <div className="customer-list-heading">
            <div>
              <h2>Existing customers</h2>
              <p className="muted">
                Select a saved customer to continue their assessment, or edit
                their profile below.
              </p>
            </div>
            <span className="badge">{state.customers.length} saved</span>
          </div>
          <div className="customer-list">
            {state.customers.map((customer) => (
              <article
                className={`customer-card ${
                  customer.client_id === state.client?.client_id ? "selected" : ""
                }`}
                key={customer.client_id}
              >
                <div>
                  <strong>{customer.client_name}</strong>
                  <small>
                    {customer.risk_appetite || "Risk not set"} ·{" "}
                    {customer.investment_objective || "Goal not set"}
                  </small>
                </div>
                <div className="customer-card-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => chooseCustomer(customer)}
                  >
                    Use customer
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setProfile({...defaults, ...customer})}
                  >
                    Edit
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <form className="page-stack" onSubmit={submit}>
        <section className="card section-card">
          <h2>About the customer</h2>
          <div className="form-grid">
            <Field label="Customer name">
              <input
                required
                maxLength={100}
                value={profile.client_name}
                onChange={(e) => set("client_name", e.target.value)}
              />
            </Field>
            <Field label="Risk level">
              <select
                required
                value={profile.risk_appetite}
                onChange={(e) => set("risk_appetite", e.target.value)}
              >
                <option value="">Choose risk level</option>
                <option value="CONSERVATIVE">Low</option>
                <option value="MODERATE">Medium</option>
                <option value="AGGRESSIVE">High</option>
              </select>
            </Field>
            <Field label="Investment goal">
              <select
                required
                value={profile.investment_objective}
                onChange={(e) => set("investment_objective", e.target.value)}
              >
                <option value="">Choose a goal</option>
                <option value="INCOME">Regular income</option>
                <option value="GROWTH">Grow the investment</option>
                <option value="CAPITAL_PRESERVATION">
                  Protect the investment
                </option>
              </select>
            </Field>
            {number(
              "investment_horizon_months",
              "How long can they invest? (months)",
              1,
              600,
            )}
            {number(
              "max_acceptable_loss_pct",
              "Maximum loss they can accept (%)",
              0,
              100,
            )}
            {number(
              "liquidity_requirement_months",
              "When will they need the money? (months)",
              0,
              600,
              true,
              "Enter 0 if they need access immediately.",
            )}
          </div>
        </section>
        <details className="card section-card">
          <summary>Optional: existing investments</summary>
          <p className="muted">
            Needed to check whether this product takes up too much of the
            customer's investments. Leave unknown amounts blank; enter 0 only if
            there are no holdings.
          </p>
          <div className="form-grid">
            <Field label="Currency of existing investments">
              <select
                value={profile.portfolio_currency}
                onChange={(e) => set("portfolio_currency", e.target.value)}
              >
                {[
                  "INR",
                  "USD",
                  "EUR",
                  "GBP",
                  "JPY",
                  "CHF",
                  "AUD",
                  "CAD",
                  "SGD",
                  "HKD",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            {number(
              "total_portfolio_value",
              "Total investments",
              1,
              undefined,
              false,
            )}
            {number(
              exposureKeys[0],
              "Already in structured products",
              0,
              undefined,
              false,
            )}
            {number(
              exposureKeys[1],
              "Already linked to this stock, index or currency pair",
              0,
              undefined,
              false,
            )}
            {number(
              exposureKeys[2],
              "Already invested with this issuer",
              0,
              undefined,
              false,
            )}
          </div>
        </details>
        <p className="muted">
          If optional details are missing, the assessment will say that the
          holdings check is incomplete. Stored only in this browser tab's
          session.
        </p>
        <ErrorNotice error={error} />
        <div className="actions">
          <button className="btn-primary" type="submit">
            Save customer & continue
          </button>
        </div>
      </form>
    </div>
  );
}
