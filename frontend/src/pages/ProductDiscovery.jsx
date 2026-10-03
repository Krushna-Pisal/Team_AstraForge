import { Link } from "react-router-dom";
import { useAssessment } from "../state/AssessmentContext";
import { PRODUCTS } from "./ProductSimulator";
import { PageTitle } from "../components/ui/Workflow";
export default function ProductDiscovery() {
  const { state } = useAssessment();
  return (
    <div className="page-stack">
      <PageTitle
        title="Discover a starting point."
        description="Explore clearly labeled illustrative templates, then test their fit for your client."
      />
      <div className="notice">
        <span>
          Illustrative templates · No live offers or automated recommendations.
        </span>
        {!state.client && (
          <Link className="text-link" to="/clients">
            Create a client profile →
          </Link>
        )}
      </div>
      <div className="product-grid">
        {PRODUCTS.map((p) => (
          <article key={p.id} className="card product-card">
            <span className="badge">TEMPLATE · {p.id.toUpperCase()}</span>
            <h2>{p.title}</h2>
            <p className="muted">{p.description}</p>
            <p className="small">
              Suitability is determined only after you configure terms and
              complete the six client checks.
            </p>
            <Link className="btn-secondary" to={"/simulator/" + p.id}>
              Use & configure template →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
