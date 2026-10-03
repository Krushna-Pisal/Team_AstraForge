import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAssessment } from "../state/AssessmentContext";
import { api, productRequest, label } from "../lib/api";
import {
  PageTitle,
  Steps,
  Loading,
  EmptyState,
  ErrorNotice,
  Badge,
  Metric,
} from "../components/ui/Workflow";
export default function SuitabilityResults() {
  const { state, dispatch } = useAssessment();
  const { client, product, simulation, evaluation } = state;
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const navigate = useNavigate();
  useEffect(() => {
    if (!client || !product || !simulation || evaluation) return;
    const controller = new AbortController();
    api("/api/suitability/evaluate", {
      signal: controller.signal,
      body: { ...productRequest(product), client },
    })
      .then((value) => {
        if (!controller.signal.aborted) dispatch({ type: "evaluation", value });
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [client, product, simulation, evaluation, attempt, dispatch]);
  if (!client)
    return (
      <EmptyState
        title="Client profile required"
        description="Capture the client's constraints before checking suitability."
        to="/clients"
        action="Create client profile"
      />
    );
  if (!product || !simulation)
    return (
      <EmptyState
        title="Simulation required"
        description="Complete product configuration and simulation first."
        to={product ? "/simulator/results" : "/simulator"}
        action="Continue assessment"
      />
    );
  const assessment = evaluation?.assessment;
  const counts = (status) =>
    assessment.checks.filter((c) => c.status === status).length;
  function save() {
    dispatch({ type: "save" });
    navigate("/history");
  }
  return (
    <div className="page-stack">
      <PageTitle
        title="Does this product fit the customer?"
        description={
          client.client_name + " · " + client.client_id + " · " + product.type
        }
      />
      <Steps current={3} />
      <ErrorNotice
        error={error}
        retry={() => {
          setError("");
          setAttempt((n) => n + 1);
        }}
      />
      {!evaluation && !error && (
        <Loading text="Checking client constraints against backend-derived product risk…" />
      )}
      {assessment && (
        <>
          <div className="card assessment-summary">
            <div>
              <p className="eyebrow">OVERALL ASSESSMENT</p>
              <h2 className="capitalize">{label(assessment.overall_status)}</h2>
              <p className="muted">
                {assessment.completeness === "INCOMPLETE"
                  ? "Missing information requires review before proceeding."
                  : "Six checks completed. Open any check to see why."}
              </p>
            </div>
            <Badge value={assessment.overall_status} />
          </div>
          <div className="stats-grid">
            <Metric label="Checks passed" value={counts("PASS")} />
            <Metric
              label="Warnings"
              value={counts("WARNING")}
              tone={counts("WARNING") ? "warning" : ""}
            />
            <Metric
              label="Mismatches"
              value={counts("MISMATCH")}
              tone={counts("MISMATCH") ? "negative" : ""}
            />
          </div>
          <div className="checklist">
            {assessment.checks.map((check) => (
              <details
                className={
                  "card explanation check " + check.status.toLowerCase()
                }
                key={check.type}
              >
                <summary>
                  <span className="check-symbol">
                    {check.status === "PASS" ? "✓" : "!"}
                  </span>
                  <span className="capitalize">
                    {
                      {
                        risk_appetite: "Risk level",
                        investment_horizon: "Investment period",
                        loss_tolerance: "Acceptable loss",
                        portfolio_concentration: "Share of total investments",
                        liquidity: "Access to money",
                        investment_objective: "Investment goal",
                      }[check.type]
                    }
                  </span>
                  <Badge value={check.status} />
                  <span className="expand-mark">+</span>
                </summary>
                <div className="check-content">
                  <p>{check.reason}</p>
                  <details>
                    <summary>Technical details</summary>
                    <div className="check-values">
                      <span>
                        Client value{" "}
                        <strong>
                          {JSON.stringify(check.client_value) ?? "Missing"}
                        </strong>
                      </span>
                      <span>
                        Evaluated value{" "}
                        <strong>
                          {JSON.stringify(check.product_value) ?? "Missing"}
                        </strong>
                      </span>
                    </div>
                    <code>{check.reason_code}</code>
                  </details>
                </div>
              </details>
            ))}
          </div>
          {evaluation.historical_error && (
            <div className="notice warning">
              Historical evidence unavailable:{" "}
              {evaluation.historical_error.message} Suitability uses the
              contractual modeled loss bound.
            </div>
          )}
          <p className="muted small">
            Rules {assessment.rule_set_version} ·{" "}
            {new Date(assessment.timestamp).toLocaleString()} ·{" "}
            {assessment.assessment_id}
          </p>
          <div className="notice">
            <p>
              {evaluation.product_risk.risk_scope} Policy is illustrative and
              requires institutional validation before production use.
            </p>
          </div>
          <div className="actions">
            <Link className="btn-secondary" to="/simulator/results">
              Back to simulation
            </Link>
            <button className="btn-primary" onClick={save}>
              Save assessment to session →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
