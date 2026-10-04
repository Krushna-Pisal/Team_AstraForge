import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAssessment } from "../state/AssessmentContext";
import { api, money } from "../lib/api";
import {
  PageTitle,
  ErrorNotice,
  EmptyState,
  Steps,
} from "../components/ui/Workflow";
export default function Investment() {
  const { state, dispatch } = useAssessment();
  const navigate = useNavigate();
  const saved = state.products.find((p) => p.id === state.selectedProductId);
  const amount = state.client?.proposed_investment_amount;
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
  if (!amount) return <EmptyState title="Enter the customer's investment amount once" to="/simulator/budget" action="Add amount & currency"/>;
  async function submit(e) {
    e.preventDefault();
    setError("");
    const client = state.client;
    const investment = Number(amount);
    if (
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
  const isCurrencyMismatch =
    state.client && saved && state.client.portfolio_currency !== saved.template.currency;

  function alignCurrencyToProduct() {
    setError("");
    const targetCurrency = saved.template.currency;
    const investment = Number(amount);
    dispatch({
      type: "client",
      draft: {
        ...state.client,
        portfolio_currency: targetCurrency,
      },
      value: {
        ...state.client,
        portfolio_currency: targetCurrency,
        total_portfolio_value: Math.max(
          state.client.total_portfolio_value || investment,
          investment,
        ),
      },
    });
  }

  return (
    <div className="page-stack">
      <PageTitle
        title="Use this product"
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
        <h2>{money(amount, state.client.portfolio_currency)}</h2>
        <p>This is the amount already entered for the customer.</p>
        <Link to="/simulator/budget" className="text-link">
          Edit amount & currency
        </Link>
        <p className="muted">
          Results start with an unchanged-market example and show what happens
          if prices rise or fall. This is not a guaranteed return.
        </p>
        {isCurrencyMismatch && (
          <div
            className="notice warning"
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            <div>
              <strong>Currency Mismatch:</strong> Customer profile is set to{" "}
              <strong>{state.client.portfolio_currency}</strong>, but this{" "}
              {saved.template.product_type} deposits in{" "}
              <strong>{saved.template.currency}</strong>.
              <br />
              <small className="muted">
                Dual Currency Deposits require deposit funds in the product's base
                currency ({saved.template.currency}).
              </small>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={alignCurrencyToProduct}
              >
                Switch customer to {saved.template.currency} & continue
              </button>
              <Link to="/simulator/budget" className="btn-secondary">
                Edit amount & currency
              </Link>
            </div>
          </div>
        )}
        <ErrorNotice error={error} />
        <button
          type="submit"
          className="btn-primary"
          disabled={busy || isCurrencyMismatch}
        >
          {busy ? "Preparing assessment…" : "View results"}
        </button>
      </form>
    </div>
  );
}
