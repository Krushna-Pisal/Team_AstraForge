import { Link, useNavigate } from "react-router-dom";
import { useAssessment } from "../state/AssessmentContext";
import { PageTitle, Metric, Badge } from "../components/ui/Workflow";
export default function Dashboard() {
  const { state, dispatch } = useAssessment();
  const navigate = useNavigate();
  return (
    <div className="page-stack">
      <PageTitle
        title="Customer assessments"
        description="Add a customer, choose a saved product, and review the results."
      >
        <button
          className="btn-primary"
          onClick={() => {
            dispatch({ type: "new" });
            navigate("/clients");
          }}
        >
          New customer
        </button>
      </PageTitle>
      <div className="stats-grid">
        <Metric
          label="Saved products"
          value={state.products.length}
          hint="Reuse for another customer"
        />
        <Metric
          label="Saved assessments"
          value={state.history.length}
          hint="Available in this browser tab"
        />
        <Metric
          label="Current customer"
          value={state.client?.client_name || "Not added"}
        />
      </div>
      <section className="card section-card page-stack">
        <h2>What would you like to do?</h2>
        <div className="button-row">
          <Link
            className="btn-primary"
            to={
              state.product
                ? "/simulator/results"
                : state.client
                  ? "/simulator"
                  : "/clients"
            }
          >
            {state.client ? "Continue assessment" : "Add customer"}
          </Link>
          <Link className="btn-secondary" to="/simulator">
            Manage saved products
          </Link>
          <Link className="text-link" to="/history">
            View saved assessments
          </Link>
        </div>
        <p className="muted">
          Products and assessments are kept for this tab's session only. Closing
          the tab can remove them.
        </p>
      </section>
      <section className="card section-card page-stack">
        <h2>Recent assessments</h2>
        {state.history.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {state.history.slice(0, 5).map((row) => (
                  <tr key={row.id}>
                    <td>{row.client.client_name}</td>
                    <td>{row.product.name || row.product.type}</td>
                    <td>
                      <Badge value={row.evaluation.assessment.overall_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            No saved assessments yet. Complete a customer fit check to save one.
          </p>
        )}
      </section>
      <p className="muted">
        This is an illustrative assessment tool, not an investment
        recommendation. Verify product terms and review any missing information.
      </p>
    </div>
  );
}
