import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAssessment } from "../state/AssessmentContext";
import { api } from "../lib/api";
import {
  PageTitle,
  Field,
  ErrorNotice,
  EmptyState,
  Steps,
} from "../components/ui/Workflow";
export default function Investment() {
  const { state, dispatch } = useAssessment();
  const navigate = useNavigate();
  const saved = state.products.find((p) => p.id === state.selectedProductId);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!state.client)
    return (
      <EmptyState
        title="Add a customer first"
        to="/clients"
        action="Add customer"
      />
    );
  if (!saved)
    return (
      <EmptyState
        title="Choose a saved product"
        to="/simulator"
        action="Choose product"
      />
    );
  async function submit(e) {
    e.preventDefault();
    setError("");
    const client = state.client;
    const investment = Number(amount);
    if (
      client.total_portfolio_value &&
      client.portfolio_currency !== saved.template.currency
    )
      return setError(
        "Existing investments are in " +
          client.portfolio_currency +
          " but this product uses " +
          saved.template.currency +
          ". Choose a matching product or update the customer's amounts in the correct currency. No currency conversion is applied.",
      );
    if (
      client.total_portfolio_value &&
      Math.max(
        client.existing_structured_product_exposure,
        client.existing_underlying_exposure,
        client.existing_issuer_exposure,
      ) +
        investment >
        client.total_portfolio_value
    )
      return setError(
        "This amount plus existing holdings exceeds the customer's total investments.",
      );
    setBusy(true);
    try {
      const data = await api("/api/products/prepare", {
        body: { template: saved.template, investment_amount: investment },
      });
      const { prices: _prices, ...market } = data.market;
      void _prices;
      dispatch({
        type: "start_assessment",
        value: {
          client: {
            ...client,
            proposed_investment_amount: investment,
            portfolio_currency: saved.template.currency,
          },
          product: {
            type: saved.template.product_type,
            name: saved.template.name,
            savedProductId: saved.id,
            ticker: saved.template.ticker,
            config:
              data.configuration[
                saved.template.product_type.toLowerCase() + "_config"
              ],
            market,
          },
        },
      });
      navigate("/simulator/results");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-stack">
      <PageTitle
        title="Investment amount"
        description="Use the saved terms for this customer. The reference price will be loaded again."
      />
      <Steps current={1} />
      <section className="card section-card">
        <h2>{saved.template.name}</h2>
        <p>
          {state.client.client_name} · {saved.instrument.label} ·{" "}
          {saved.template.currency}
        </p>
        <div className="button-row">
          <Link to="/clients" className="text-link">
            Edit customer
          </Link>
          <Link to="/simulator" className="text-link">
            Change product
          </Link>
        </div>
      </section>
      <form className="card section-card page-stack" onSubmit={submit}>
        <Field label={"Amount to invest (" + saved.template.currency + ")"}>
          <input
            type="number"
            required
            min={0.01}
            max={1e15}
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <p className="muted">
          Results start with an unchanged-market example and show what happens
          if prices rise or fall. This is not a guaranteed return.
        </p>
        <ErrorNotice error={error} />
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Preparing assessment…" : "View results"}
        </button>
      </form>
    </div>
  );
}
