import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { api, money } from "../lib/api";
import { PageTitle, Badge, Metric, Loading } from "../components/ui/Workflow";
import { pdf } from "@react-pdf/renderer";
import ClientReportPDF from "../components/insights/ClientReportPDF";
import { UI_STRINGS } from "../components/insights/ClientInsights";
import {
  ShieldCheck,
  Download,
  ArrowLeft,
  Sparkles,
  AlertCircle,
} from "lucide-react";

export default function ClientAssessmentDetail() {
  const { id } = useParams();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [language, setLanguage] = useState("EN");
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const fetchInsights = async (assessmentId, lang) => {
    setInsightsLoading(true);
    try {
      const insightRes = await api("/api/insights/generate", {
        body: {
          assessment_id: assessmentId,
          audience: "CLIENT",
          language: lang,
          retry: false,
        },
      });
      if (insightRes?.insights) {
        setInsights(insightRes.insights);
      }
    } catch (err) {
      console.warn("Could not fetch insights for record:", err);
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    async function loadRecord() {
      setLoading(true);
      setError(null);
      try {
        const data = await api(`/api/customer/assessments/${id}`);
        setRecord(data);

        // Fetch plain language insights
        fetchInsights(id, language);
      } catch (err) {
        if (err.status === 403 || err.status === 404) {
          setError("You are not authorized to view this record, or it does not exist.");
        } else {
          setError(err.message || "Failed to load simulation record.");
        }
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadRecord();
    }
  }, [id, language]);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    if (id) {
      fetchInsights(id, lang);
    }
  };

  const handleDownloadPdf = async (lang = language) => {
    if (!record) return;
    setPdfGenerating(true);
    try {
      const currentInsights = insights || {
        executive_summary: "Customer investment suitability assessment and structured product report.",
        investment_summary: [],
        scenario_insights: [],
        suitability_insights: [],
        key_risks: [],
        discussion_points: [],
        important_notes: [],
      };

      const req = record.request || {};
      const evalBundle = record.evaluation || {};
      const assessment = evalBundle.assessment || {};
      const client = req.client || {};

      const reportState = {
        id: id,
        client: {
          client_id: client.client_id,
          client_name: client.client_name || "Valued Client",
          portfolio_currency: client.portfolio_currency || "INR",
          risk_appetite: client.risk_appetite || "MODERATE",
          investment_horizon_months: client.investment_horizon_months || 24,
          max_acceptable_loss_pct: client.max_acceptable_loss_pct || 15,
          investment_objective: client.investment_objective || "GROWTH",
        },
        product: {
          type: req.product_type || "CPN",
          name: req.product_type === "CPN" ? "Capital Protected Note" : req.product_type === "ELN" ? "Equity Linked Note" : "Dual Currency Deposit",
          ticker: req.ticker || "^NSEI",
          currency: client.portfolio_currency || "INR",
          investment_amount: client.proposed_investment_amount || 500000,
        },
        evaluation: {
          assessment: assessment,
          product_risk: evalBundle.product_risk || {},
        },
      };

      const blob = await pdf(
        <ClientReportPDF
          state={reportState}
          insights={currentInsights}
          language={lang}
          t={UI_STRINGS[lang] || UI_STRINGS.EN}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const langSuffix = lang === "EN" ? "EN" : lang === "HI" ? "Hindi" : "Marathi";
      a.download = `AstraForge_Saved_Simulation_${id.slice(0, 8)}_${langSuffix}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to create PDF. Please try again.");
    } finally {
      setPdfGenerating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem" }}>
        <Loading text="Retrieving authorized assessment record…" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: "800px", margin: "2rem auto", padding: "1.5rem" }} className="page-stack">
        <div className="card notice error" role="alert">
          <AlertCircle size={24} style={{ color: "#f87171", flexShrink: 0 }} />
          <div>
            <strong>Access Denied or Not Found</strong>
            <p>{error}</p>
          </div>
        </div>
        <div>
          <Link to="/client" className="btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <ArrowLeft size={16} />
            <span>Return to Client Portal</span>
          </Link>
        </div>
      </div>
    );
  }

  const req = record?.request || {};
  const assessment = record?.evaluation?.assessment || {};
  const checks = assessment.checks || [];
  const client = req.client || {};

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem" }} className="page-stack">
      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link
          to="/client"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "#94a3b8",
            fontSize: "0.9rem",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Client Dashboard</span>
        </Link>
        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
          Record ID: {id}
        </span>
      </div>

      <PageTitle
        eyebrow="SAVED ASSESSMENT"
        title={`${req.product_type || "Structured"} Note Evaluation`}
        description={`Executed on ${record.created_at ? new Date(record.created_at).toLocaleDateString() : "Recent"} for ${client.client_name || "Client"}.`}
      />

      {/* Metrics */}
      <div className="stats-grid">
        <Metric
          label="Product Type"
          value={req.product_type || "CPN"}
          hint={`Underlying: ${req.ticker || "^NSEI"}`}
        />
        <Metric
          label="Investment Amount"
          value={money(client.proposed_investment_amount || 0, client.portfolio_currency || "INR")}
          hint={`Horizon: ${client.investment_horizon_months || 12}m`}
        />
        <Metric
          label="Suitability Verdict"
          value={assessment.overall_status?.replaceAll("_", " ").toUpperCase() || "PENDING"}
          tone={assessment.overall_status === "suitable" ? "positive" : "warning"}
          hint={`${checks.filter((c) => c.status === "PASS").length} of ${checks.length} Checks Passed`}
        />
      </div>

      {/* Suitability Breakdown */}
      <section className="card section-card page-stack">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            <ShieldCheck size={20} color="#2563eb" />
            Suitability Breakdown
          </h2>
          <Badge value={assessment.overall_status} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "10px", marginTop: "0.5rem" }}>
          {checks.map((check) => (
            <div
              key={check.dimension}
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                backgroundColor: "#17263a",
                border: "1px solid #2a3e56",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: "0.86rem", fontWeight: "600", textTransform: "capitalize" }}>
                  {check.dimension.replaceAll("_", " ")}
                </div>
                <div style={{ fontSize: "0.76rem", color: "#94a3b8" }}>
                  {check.details || check.status}
                </div>
              </div>
              <Badge value={check.status} />
            </div>
          ))}
        </div>
      </section>

      {/* Plain Language Interpretation & PDF Export */}
      <section className="card section-card page-stack" style={{ borderColor: "#38bdf8" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h2 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <Sparkles size={20} color="#38bdf8" />
              Plain-Language Advisory Insights
            </h2>
            <p className="muted" style={{ margin: "4px 0 0 0", fontSize: "0.84rem" }}>
              Grounded, verifiable interpretation of verified suitability results.
            </p>
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            {[
              { code: "EN", label: "English" },
              { code: "HI", label: "हिंदी" },
              { code: "MR", label: "मराठी" },
            ].map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => handleLanguageChange(l.code)}
                className={`btn-${language === l.code ? "primary" : "secondary"}`}
                style={{ padding: "4px 10px", fontSize: "0.8rem" }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {insightsLoading && <p className="muted" style={{ fontSize: "0.85rem" }}>Loading translated explanation…</p>}

        {insights && !insightsLoading && (
          <div style={{ backgroundColor: "#17263a", padding: "1.2rem", borderRadius: "10px", border: "1px solid #2a3e56" }}>
            <p style={{ fontWeight: "600", color: "#e2e8f0", marginBottom: "0.75rem", fontSize: "0.95rem" }}>
              {insights.executive_summary}
            </p>
            {insights.key_risks?.length > 0 && (
              <div style={{ marginTop: "0.75rem" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: "700", color: "#f87171", textTransform: "uppercase", marginBottom: "4px" }}>
                  Key Risk Factors:
                </div>
                <ul style={{ paddingLeft: "20px", margin: 0, fontSize: "0.85rem", color: "#cbd5e1", lineHeight: "1.5" }}>
                  {insights.key_risks.map((risk, i) => (
                    <li key={i}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", marginTop: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => handleDownloadPdf("EN")}
            disabled={pdfGenerating}
            className="btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}
          >
            <Download size={15} />
            <span>Download English PDF</span>
          </button>
          <button
            type="button"
            onClick={() => handleDownloadPdf("HI")}
            disabled={pdfGenerating}
            className="btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}
          >
            <Download size={15} />
            <span>हिंदी PDF रिपोर्ट</span>
          </button>
          <button
            type="button"
            onClick={() => handleDownloadPdf("MR")}
            disabled={pdfGenerating}
            className="btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}
          >
            <Download size={15} />
            <span>मराठी PDF अहवाल</span>
          </button>
        </div>
      </section>

      {/* Disclaimers */}
      <div style={{ padding: "1rem", backgroundColor: "#1e293b", borderRadius: "8px", border: "1px solid #334155", fontSize: "0.8rem", color: "#94a3b8" }}>
        <strong>Disclosures:</strong> AstraForge Private Banking suitability records are preserved under regulatory auditing guidelines. Past returns and modeled scenarios do not constitute guarantees.
      </div>
    </div>
  );
}
