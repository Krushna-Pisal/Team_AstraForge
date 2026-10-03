import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LineChart, ArrowLeftRight, ShieldCheck, Trash2 } from "lucide-react";
import { PageTitle, Steps } from "../components/ui/Workflow";
import { useAssessment } from "../state/AssessmentContext";
// eslint-disable-next-line react/only-export-components
export const PRODUCTS = [
  {
    id: "eln",
    title: "Equity-linked note",
    tag: "ELN",
    icon: LineChart,
    description: "Earn interest with stock or index-linked risk.",
    terms: ["Investment value can fall", "Interest depends on the contract"],
  },
  {
    id: "dcd",
    title: "Dual currency deposit",
    tag: "DCD",
    icon: ArrowLeftRight,
    description: "Earn interest with possible repayment in another currency.",
    terms: ["Currency conversion risk", "A fixed conversion rate"],
  },
  {
    id: "cpn",
    title: "Capital-protected note",
    tag: "CPN",
    icon: ShieldCheck,
    description: "Protect an agreed portion and share in market growth.",
    terms: ["Protection applies at maturity", "Issuer default risk remains"],
  },
];
export default function ProductSimulator() {
  const { state, dispatch } = useAssessment();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const products = state.products.filter((p) =>
    (p.template.name + " " + p.template.ticker)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  function use(p) {
    dispatch({ type: "select_product", value: p.id });
    navigate(state.client ? "/simulator/investment" : "/clients");
  }
  function handleDelete(id) {
    dispatch({ type: "delete_product", id });
    setConfirmDeleteId(null);
  }
  return (
    <div className="page-stack">
      <PageTitle
        title="Saved products"
        description="Add a product once, then reuse it for another customer in this browser tab."
      >
        <button
          className="btn-secondary"
          onClick={() => {
            dispatch({ type: "new" });
            navigate("/clients");
          }}
        >
          New customer
        </button>
      </PageTitle>
      <Steps current={1} />
      <section className="page-stack">
        <label className="field">
          Find a saved product
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or underlying"
          />
        </label>
        {!products.length && (
          <div className="card section-card">
            <p>
              {state.products.length
                ? "No products match your search."
                : "No saved products yet. Add one below."}
            </p>
          </div>
        )}
        <div className="product-grid">
          {products.map((p) => {
            const isConfirming = confirmDeleteId === p.id;
            return (
              <article className="card product-card" key={p.id}>
                <span className="badge">{p.template.product_type}</span>
                <h2>{p.template.name}</h2>
                <p>
                  {p.instrument.label} ({p.template.ticker})
                </p>
                <p className="muted">
                  {p.template.currency} ·{" "}
                  {
                    p.template[p.template.product_type.toLowerCase() + "_terms"]
                      .tenor_years
                  }{" "}
                  year(s)
                </p>
                <button className="btn-primary" onClick={() => use(p)}>
                  Use product
                </button>
                <div className="product-card-footer">
                  <Link
                    className="text-link"
                    to={
                      "/simulator/" +
                      p.template.product_type.toLowerCase() +
                      "?edit=" +
                      p.id
                    }
                  >
                    Edit product
                  </Link>
                  <button
                    type="button"
                    className="text-danger-link"
                    onClick={() => setConfirmDeleteId(isConfirming ? null : p.id)}
                    title="Delete saved product"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
                {isConfirming && (
                  <div className="delete-confirm-box" role="alert">
                    <p className="delete-confirm-text">
                      Delete <strong>{p.template.name}</strong> from saved products?
                    </p>
                    <div className="delete-confirm-buttons">
                      <button
                        type="button"
                        className="btn-danger-sm"
                        onClick={() => handleDelete(p.id)}
                      >
                        Yes, delete
                      </button>
                      <button
                        type="button"
                        className="btn-secondary-sm"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
      <section id="new-product" className="page-stack">
        <h2>Add a product</h2>
        <div className="product-grid">
          {PRODUCTS.map(({ id, title, icon: Icon, description }) => (
            <article className="card product-card" key={id}>
              <Icon size={24} />
              <h2>{title}</h2>
              <p className="muted">{description}</p>
              <Link className="btn-secondary" to={"/simulator/" + id}>
                Add {id.toUpperCase()}
              </Link>
            </article>
          ))}
        </div>
      </section>
      <p className="muted">
        Products survive page refreshes in this tab, but are not permanently
        saved. Product terms are reused; customer details and investment amounts
        are not.
      </p>
    </div>
  );
}
