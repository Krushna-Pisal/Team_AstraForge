import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Download, Loader2, ExternalLink, CheckCircle, Clock } from "lucide-react";
import { PageTitle, Badge, EmptyState } from "../components/ui/Workflow";
import { useAssessment } from "../state/AssessmentContext";
import { pdf } from "@react-pdf/renderer";
import ClientReportPDF from "../components/insights/ClientReportPDF";
import { UI_STRINGS } from "../components/insights/ClientInsights";
import { money } from "../lib/api";

export default function Reports() {
  const { state, dispatch } = useAssessment();
  const navigate = useNavigate();
  const [downloadingId, setDownloadingId] = useState(null);

  async function handleDownload(reportState, reportId, clientName) {
    setDownloadingId(reportId);
    try {
      const insights = reportState.insights?.Client || {
        executive_summary: "Investment suitability assessment and structured product payoff report.",
        investment_summary: [],
        scenario_insights: [],
        suitability_insight: { headline: "", rationale: "", warnings: [] },
      };
      const blob = await pdf(
        <ClientReportPDF
          state={reportState}
          insights={insights}
          language="EN"
          t={UI_STRINGS.EN}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(clientName || "Client").replace(/\s+/g, "_")}_Advisory_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate PDF report:", err);
    } finally {
      setDownloadingId(null);
    }
  }

  function openAssessment(row) {
    dispatch({ type: "restore", value: row });
    navigate("/simulator/suitability");
  }

  const hasHistory = state.history && state.history.length > 0;
  const hasActive = Boolean(state.evaluation && state.client && state.product);

  return (
    <div className="page-stack">
      <PageTitle
        title="Advisory Reports"
        description="Official client assessment reports, suitability disclosures, and downloadable PDF documentation."
      />

      {/* Active Assessment Banner if present */}
      {hasActive && (
        <section className="card section-card" style={{ borderColor: "#38bdf8" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <span className="badge" style={{ background: "rgba(56, 189, 248, 0.2)", color: "#38bdf8" }}>
                Active Assessment
              </span>
              <h2 style={{ marginTop: 8 }}>{state.client.client_name} · {state.product.name || state.product.type}</h2>
              <p className="muted">
                {state.product.type} · {state.product.ticker} ·{" "}
                {money(
                  state.product.config?.investment ?? state.product.config?.deposit_amount,
                  state.client.portfolio_currency
                )}
              </p>
              <div style={{ marginTop: 8 }}>
                <Badge value={state.evaluation.assessment.overall_status} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                className="btn-primary"
                disabled={downloadingId === "active"}
                onClick={() => handleDownload(state, "active", state.client.client_name)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {downloadingId === "active" ? (
                  <>
                    <Loader2 size={15} className="spin" /> Generating PDF…
                  </>
                ) : (
                  <>
                    <Download size={15} /> Download Client PDF
                  </>
                )}
              </button>
              <Link to="/simulator/insights" className="btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <FileText size={15} /> View Insights
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Reports Archive */}
      {hasHistory ? (
        <section className="page-stack">
          <h2>Reviewed Reports Archive ({state.history.length})</h2>
          <p className="muted">
            All assessments saved in this advisory session with available PDF documentation.
          </p>
          <div className="card table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Ref ID</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Date & Time</th>
                  <th>Suitability</th>
                  <th style={{ textAlign: "right" }}>Documentation</th>
                </tr>
              </thead>
              <tbody>
                {state.history.map((row) => {
                  const isDownloading = downloadingId === row.id;
                  return (
                    <tr key={row.id}>
                      <td>
                        <code>{row.id.slice(0, 8)}</code>
                      </td>
                      <td>
                        <strong>{row.client?.client_name || "Client"}</strong>
                      </td>
                      <td>
                        {row.product?.name || row.product?.type || "Product"}
                        <br />
                        <small className="muted">{row.product?.ticker}</small>
                      </td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Clock size={12} className="muted" />
                          {new Date(row.evaluation?.assessment?.timestamp || Date.now()).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <Badge value={row.evaluation?.assessment?.overall_status} />
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 8, justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={isDownloading}
                            onClick={() => handleDownload(row, row.id, row.client?.client_name)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 12 }}
                          >
                            {isDownloading ? (
                              <>
                                <Loader2 size={13} className="spin" /> Generating…
                              </>
                            ) : (
                              <>
                                <Download size={13} /> PDF Report
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => openAssessment(row)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", fontSize: 12 }}
                          >
                            <ExternalLink size={13} /> Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : !hasActive ? (
        <EmptyState
          title="No advisory reports generated yet"
          description="Reports and PDF term sheets become available once you evaluate a customer fit check and save the assessment."
          to="/clients"
          action="Start New Assessment"
        />
      ) : null}
    </div>
  );
}
