import { useNavigate } from "react-router-dom";
import { useAssessment } from "../state/AssessmentContext";
import { PageTitle, Badge, EmptyState } from "../components/ui/Workflow";
export default function AssessmentHistory() {
  const { state, dispatch } = useAssessment();
  const navigate = useNavigate();
  function open(row) {
    dispatch({ type: "restore", value: row });
    navigate("/simulator/suitability");
  }
  return (
    <div className="page-stack">
      <PageTitle
        title="Assessment history."
        description="Actual completed assessments from this browser session."
      />
      <div className="notice">
        Session history is limited to 30 assessments and clears when this tab's
        session ends. Durable audit storage is planned.
      </div>
      {state.history.length ? (
        <div className="card table-scroll">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Client</th>
                <th>Product</th>
                <th>Date</th>
                <th>Suitability</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {state.history.map((row) => (
                <tr key={row.id}>
                  <td>
                    <code>{row.id.slice(0, 8)}</code>
                  </td>
                  <td>{row.client.client_name}</td>
                  <td>{row.product.type}</td>
                  <td>
                    {new Date(
                      row.evaluation.assessment.timestamp,
                    ).toLocaleString()}
                  </td>
                  <td>
                    <Badge value={row.evaluation.assessment.overall_status} />
                  </td>
                  <td>
                    <button className="btn-secondary" onClick={() => open(row)}>
                      View assessment
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No saved assessments yet"
          description="Complete simulation and suitability, then save the assessment here."
          to="/clients"
          action="Start assessment"
        />
      )}
    </div>
  );
}
