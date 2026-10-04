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

  async function handleDownload(reportState, reportId, clientName, lang = "EN") {
    const downloadKey = `${reportId}_${lang}`;
    setDownloadingId(downloadKey);
    try {
      const assessmentId = reportState.evaluation?.assessment?.assessment_id || reportState.id;
      let insights =
        reportState.insights?.[`CLIENT_${lang}`]?.insights ||
        (lang === "EN" ? reportState.insights?.Client || reportState.insights?.CLIENT_EN?.insights : null);

      if (!insights && assessmentId) {
        try {
          const res = await api("/api/insights/generate", {
            body: { assessment_id: assessmentId, audience: "CLIENT", language: lang, retry: false },
          });
          if (res?.insights) {
            insights = res.insights;
          }
        } catch (fetchErr) {
          console.warn("Could not fetch translated insights, falling back:", fetchErr);
        }
      }

      if (!insights) {
        insights = reportState.insights?.Client || reportState.insights?.CLIENT_EN?.insights || {
          executive_summary: "Investment suitability assessment and structured product payoff report.",
          investment_summary: [],
          scenario_insights: [],
          suitability_insights: [],
          key_risks: [],
          discussion_points: [],
          important_notes: [],
        };
      }

      const blob = await pdf(
        <ClientReportPDF
          state={reportState}
          insights={insights}
          language={lang}
          t={UI_STRINGS[lang] || UI_STRINGS.EN}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const langSuffix = lang === "EN" ? "EN" : lang === "HI" ? "Hindi" : "Marathi";
      a.download = `${(clientName || "Client").replace(/\s+/g, "_")}_AstraForge_Report_${langSuffix}.pdf`;
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
              <span style={{ fontSize: "13px", color: "#94a3b8", marginRight: 2 }}>Download PDF:</span>
              <button
                type="button"
                className="btn-primary"
                disabled={Boolean(downloadingId)}
                onClick={() => handleDownload(state, "active", state.client?.client_name, "EN")}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, padding: "6px 12px" }}
              >
                {downloadingId === "active_EN" ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
                English
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={Boolean(downloadingId)}
                onClick={() => handleDownload(state, "active", state.client?.client_name, "HI")}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, padding: "6px 12px", background: "#0284c7", borderColor: "#0284c7" }}
              >
                {downloadingId === "active_HI" ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
                हिंदी (Hindi)
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={Boolean(downloadingId)}
                onClick={() => handleDownload(state, "active", state.client?.client_name, "MR")}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, padding: "6px 12px", background: "#059669", borderColor: "#059669" }}
              >
                {downloadingId === "active_MR" ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
                मराठी (Marathi)
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
            All assessments saved in this advisory session with available PDF documentation in English, Hindi, and Marathi.
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
                  <th style={{ textAlign: "right" }}>Documentation (EN / HI / MR)</th>
                </tr>
              </thead>
              <tbody>
                {state.history.map((row) => {
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
                        <div style={{ display: "inline-flex", gap: 6, justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={Boolean(downloadingId)}
                            onClick={() => handleDownload(row, row.id, row.client?.client_name, "EN")}
                            title="Download PDF in English"
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", fontSize: 11 }}
                          >
                            {downloadingId === `${row.id}_EN` ? <Loader2 size={12} className="spin" /> : <Download size={12} />}
                            EN
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={Boolean(downloadingId)}
                            onClick={() => handleDownload(row, row.id, row.client?.client_name, "HI")}
                            title="हिंदी में डाउनलोड करें (Hindi)"
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", fontSize: 11, borderColor: "#0284c7", color: "#38bdf8" }}
                          >
                            {downloadingId === `${row.id}_HI` ? <Loader2 size={12} className="spin" /> : <Download size={12} />}
                            हिंदी
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={Boolean(downloadingId)}
                            onClick={() => handleDownload(row, row.id, row.client?.client_name, "MR")}
                            title="मराठीत डाउनलोड करा (Marathi)"
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", fontSize: 11, borderColor: "#059669", color: "#34d399" }}
                          >
                            {downloadingId === `${row.id}_MR` ? <Loader2 size={12} className="spin" /> : <Download size={12} />}
                            मराठी
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => openAssessment(row)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", fontSize: 11 }}
                          >
                            <ExternalLink size={12} /> Review
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
