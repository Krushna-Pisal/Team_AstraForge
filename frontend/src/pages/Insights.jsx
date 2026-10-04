import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAssessment } from "../state/AssessmentContext";
import { api, money } from "../lib/api";
import { PageTitle, Loading, ErrorNotice, EmptyState, Badge } from "../components/ui/Workflow";
import AudienceToggle from "../components/insights/AudienceToggle";
import RMInsights from "../components/insights/RMInsights";
import ClientInsights, { UI_STRINGS } from "../components/insights/ClientInsights";
import { pdf } from "@react-pdf/renderer";
import ClientReportPDF from "../components/insights/ClientReportPDF";
import { Download, Loader2 } from "lucide-react";

export default function Insights() {
  const { state, dispatch } = useAssessment();
  const navigate = useNavigate();
  const [audience, setAudience] = useState("RM");
  const [language, setLanguage] = useState("EN");
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [downloadingLang, setDownloadingLang] = useState(null);
  
  const id = state.evaluation?.assessment.assessment_id;
  const cacheKey = audience === "CLIENT" ? `CLIENT_${language}` : "RM";
  const response = state.insights?.[cacheKey];

  const downloadClientPdf = async (targetLang) => {
    setDownloadingLang(targetLang);
    try {
      const clientName = state.client?.client_name || "Client";
      let targetInsights = state.insights?.[`CLIENT_${targetLang}`]?.insights;
      if (!targetInsights && id) {
        try {
          const res = await api("/api/insights/generate", {
            body: { assessment_id: id, audience: "CLIENT", language: targetLang, retry: false }
          });
          if (res?.insights) {
            targetInsights = res.insights;
            dispatch({ type: "insights", assessmentId: id, audience: `CLIENT_${targetLang}`, value: res });
          }
        } catch (e) {
          console.warn("Could not fetch translated insights:", e);
        }
      }
      if (!targetInsights) {
        targetInsights = response?.insights || {};
      }
      const blob = await pdf(
        <ClientReportPDF
          state={state}
          insights={targetInsights}
          language={targetLang}
          t={UI_STRINGS[targetLang] || UI_STRINGS.EN}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const langSuffix = targetLang === "EN" ? "EN" : targetLang === "HI" ? "Hindi" : "Marathi";
      a.download = `${clientName.replace(/\s+/g, "_")}_AstraForge_Report_${langSuffix}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setDownloadingLang(null);
    }
  };

  useEffect(() => {
    if (!id || !state.client || !state.product || !state.simulation || response) return;
    const controller = new AbortController();
    api("/api/insights/generate", {
      signal: controller.signal,
      body: { assessment_id: id, audience, language: audience === "CLIENT" ? language : "EN", retry: attempt > 0 }
    })
      .then(value => {
        if (!controller.signal.aborted) {
          dispatch({ type: "insights", assessmentId: id, audience: cacheKey, value });
        }
      })
      .catch(e => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [id, audience, language, attempt, response, state.client, state.product, state.simulation, dispatch, cacheKey]);

  if (!state.client) return <EmptyState title="Customer details are missing" to="/clients" action="Add customer" />;
  if (!state.product || !state.simulation) return <EmptyState title="Run a simulation first" to={state.product ? "/simulator/results" : "/simulator"} action="Continue assessment" />;
  if (!id) return <EmptyState title="Complete the customer fit check first" to="/simulator/suitability" action="Check customer fit" />;
  
  const amount = state.product.config.investment ?? state.product.config.deposit_amount;
  const currency = state.product.config.investment_currency || state.product.config.deposit_currency;
  
  function retry() {
    setError("");
    dispatch({ type: "insights", assessmentId: id, audience: cacheKey, value: null });
    setAttempt(a => a + 1);
  }

  return (
    <div className="page-stack">
      <PageTitle 
        title={
          audience === "CLIENT" 
            ? (language === "HI" ? "आपके " + money(amount, currency) + " का क्या होगा?" : language === "MR" ? "तुमच्या " + money(amount, currency) + " चे काय होणार?" : "What happens to your " + money(amount, currency) + "?")
            : "Assessment insights"
        } 
        description="The same verified results, explained for two audiences. No AI calculations or recommendations."
      >
        <AudienceToggle value={audience} onChange={v => { setError(""); setAttempt(0); setAudience(v); }} />
      </PageTitle>

      {audience === "CLIENT" && (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ color: '#b4c1d2', fontSize: '14px' }}>Language:</label>
          <div className="segmented">
            <button className={language === "EN" ? "active" : ""} onClick={() => setLanguage("EN")}>English</button>
            <button className={language === "HI" ? "active" : ""} onClick={() => setLanguage("HI")}>हिन्दी</button>
            <button className={language === "MR" ? "active" : ""} onClick={() => setLanguage("MR")}>मराठी</button>
          </div>
        </div>
      )}

      <div className="notice">
        <span>Rule-based result: <Badge value={state.evaluation.assessment.overall_status} /></span>
      </div>
      
      <ErrorNotice error={error} retry={retry} />
      {error && (
        <button className="btn-secondary" onClick={() => { dispatch({ type: "evaluation", value: null }); navigate("/simulator/suitability"); }}>
          Run customer fit check again
        </button>
      )}
      
      {!response && !error && <Loading text="Preparing verified explanations…" />}
      
      {response && (
        <>
          <div className="notice">
            <div>
              <p>{response.notice || "AI-assisted wording selected from validated explanations."}</p>
              <small>
                {response.mode === "ai" ? "Gemini" : "Standard explanation"} · Prompt {response.prompt_version} · {new Date(response.generated_at).toLocaleString()}
                {response.model ? " · " + response.model : ""}
              </small>
            </div>
            {response.mode === "fallback" && (
              <button className="btn-secondary" onClick={retry}>Retry AI explanation</button>
            )}
          </div>
          
          <p>{response.insights.executive_summary}</p>
          
          {audience === "RM" ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>
                  Download Client Report PDF:
                </span>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => downloadClientPdf("EN")} 
                  disabled={Boolean(downloadingLang)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', padding: '5px 12px' }}
                >
                  {downloadingLang === "EN" ? <Loader2 size={13} className="spin" /> : <Download size={13} />}
                  English
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => downloadClientPdf("HI")} 
                  disabled={Boolean(downloadingLang)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', padding: '5px 12px', borderColor: '#0284c7', color: '#38bdf8' }}
                >
                  {downloadingLang === "HI" ? <Loader2 size={13} className="spin" /> : <Download size={13} />}
                  हिंदी (Hindi)
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => downloadClientPdf("MR")} 
                  disabled={Boolean(downloadingLang)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', padding: '5px 12px', borderColor: '#059669', color: '#34d399' }}
                >
                  {downloadingLang === "MR" ? <Loader2 size={13} className="spin" /> : <Download size={13} />}
                  मराठी (Marathi)
                </button>
              </div>
              <RMInsights insights={response.insights} />
            </>
          ) : (
            <ClientInsights insights={response.insights} language={language} />
          )}
        </>
      )}
      
      <div className="actions">
        <Link className="btn-secondary" to="/simulator/suitability">Back to customer fit</Link>
        <Link className="text-link" to="/simulator/results">All scenario results</Link>
        <button className="btn-primary" onClick={() => { dispatch({ type: "save" }); navigate("/history"); }}>
          Save assessment
        </button>
      </div>
    </div>
  );
}
