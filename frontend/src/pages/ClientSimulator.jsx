import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, money, pct } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { PageTitle, Badge, Metric, Loading, ErrorNotice } from "../components/ui/Workflow";
import { pdf } from "@react-pdf/renderer";
import ClientReportPDF from "../components/insights/ClientReportPDF";
import { UI_STRINGS } from "../components/insights/ClientInsights";
import {
  ShieldCheck,
  Download,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

export default function ClientSimulator() {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();

  const initialProduct = searchParams.get("product")?.toUpperCase() || "CPN";
  const [productType, setProductType] = useState(["CPN", "ELN", "DCD"].includes(initialProduct) ? initialProduct : "CPN");

  // Investment Parameters
  const [investmentAmount, setInvestmentAmount] = useState(initialProduct === "DCD" ? 50000 : 500000);
  const [currency, setCurrency] = useState(initialProduct === "DCD" ? "USD" : "INR");
  const [ticker, setTicker] = useState(initialProduct === "DCD" ? "USDINR=X" : "^NSEI");
  const [tenorMonths, setTenorMonths] = useState(12);

  // ELN specific
  const [strikePct, setStrikePct] = useState(90);
  const [barrierPct, setBarrierPct] = useState(70);
  const [couponPctPa, setCouponPctPa] = useState(12);

  // DCD specific
  const [depositCurrency, setDepositCurrency] = useState("USD");
  const [alternateCurrency, setAlternateCurrency] = useState("INR");
  const [initialFxRate] = useState(83.5);
  const [conversionStrikeRate, setConversionStrikeRate] = useState(85.0);
  const [conversionCondition] = useState("FX_AT_OR_ABOVE_STRIKE");

  // CPN specific
  const [protectionPct, setProtectionPct] = useState(100);
  const [participationRate, setParticipationRate] = useState(100);

  // Suitability & Investor Profile
  const [riskAppetite, setRiskAppetite] = useState("MODERATE");
  const [investmentHorizonMonths, setInvestmentHorizonMonths] = useState(24);
  const [maxAcceptableLossPct, setMaxAcceptableLossPct] = useState(10);
  const [liquidityRequirementMonths] = useState(6);
  const [investmentObjective, setInvestmentObjective] = useState("GROWTH");

  // Execution states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Insights & PDF
  const [language, setLanguage] = useState("EN");
  const [insights, setInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const handleSelectProduct = (p) => {
    setProductType(p);
    if (p === "DCD") {
      setCurrency("USD");
      setTicker("USDINR=X");
      setInvestmentAmount(50000);
    } else {
      setCurrency("INR");
      setTicker("^NSEI");
      setInvestmentAmount(500000);
    }
  };

  const handleSimulate = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);
    setInsights(null);

    const payload = {
      product_type: productType,
      investment_amount: Number(investmentAmount),
      currency,
      ticker,
      tenor_months: Number(tenorMonths),
      strike_pct: Number(strikePct),
      barrier_pct: Number(barrierPct),
      coupon_pct_pa: Number(couponPctPa),
      deposit_currency: depositCurrency,
      alternate_currency: alternateCurrency,
      initial_fx_rate: Number(initialFxRate),
      conversion_strike_rate: Number(conversionStrikeRate),
      conversion_condition: conversionCondition,
      protection_pct: Number(protectionPct),
      participation_rate: Number(participationRate),
      risk_appetite: riskAppetite,
      investment_horizon_months: Number(investmentHorizonMonths),
      max_acceptable_loss_pct: Number(maxAcceptableLossPct),
      liquidity_requirement_months: Number(liquidityRequirementMonths),
      investment_objective: investmentObjective,
    };

    try {
      const res = await api("/api/customer/simulate", { body: payload });
      setResult(res);

      // Fetch AI explanation in parallel
      if (res.assessment_id) {
        fetchInsights(res.assessment_id, language);
      }
    } catch (err) {
      setError(err.message || "Failed to run simulation. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

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
      console.warn("Could not fetch insights:", err);
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    if (result?.assessment_id) {
      fetchInsights(result.assessment_id, lang);
    }
  };

  const handleDownloadPdf = async (lang = language) => {
    if (!result) return;
    setPdfGenerating(true);
    try {
      const currentInsights = insights || {
        executive_summary: "Customer investment suitability assessment and structured product simulation report.",
        investment_summary: [],
        scenario_insights: [],
        suitability_insights: [],
        key_risks: [],
        discussion_points: [],
        important_notes: [],
      };

      // Synthesize state representation for ClientReportPDF
      const reportState = {
        id: result.assessment_id,
        client: {
          client_id: user?.id,
          client_name: profile?.full_name || user?.email?.split("@")[0] || "Valued Client",
          portfolio_currency: currency,
          risk_appetite: riskAppetite,
          investment_horizon_months: investmentHorizonMonths,
          max_acceptable_loss_pct: maxAcceptableLossPct,
          investment_objective: investmentObjective,
        },
        product: {
          type: productType,
          name: productType === "CPN" ? "Capital Protected Note" : productType === "ELN" ? "Equity Linked Note" : "Dual Currency Deposit",
          ticker: ticker,
          currency: currency,
          investment_amount: investmentAmount,
          tenor_months: tenorMonths,
          protection_pct: protectionPct,
          coupon_pct_pa: couponPctPa,
          strike_pct: strikePct,
          barrier_pct: barrierPct,
        },
        evaluation: {
          assessment: {
            assessment_id: result.assessment_id,
            overall_status: result.suitability?.overall_status,
            checks: result.suitability?.checks || [],
          },
          product_risk: {
            risk_rating: result.suitability?.overall_status === "suitable" ? "Balanced" : "Higher Risk",
            capital_at_risk: productType !== "CPN" || protectionPct < 100,
          },
        },
        scenarios: result.scenarios,
        payoff: result.payoff,
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
      a.download = `AstraForge_Simulation_${productType}_${langSuffix}.pdf`;
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

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem" }} className="page-stack">
      {/* Navigation breadcrumb */}
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
          AstraForge Self-Service Simulation Lab
        </span>
      </div>

      <PageTitle
        eyebrow="PRODUCT SIMULATOR"
        title="Simulate Structured Product & Suitability"
        description="Model potential maturity payoffs under various market conditions and verify personal suitability alignment."
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.5rem" }}>
        {/* Left Column: Input Form */}
        <div className="page-stack">
          {/* 1. Product Selection */}
          <section className="card section-card">
            <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>1. Select Product</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              {["CPN", "ELN", "DCD"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSelectProduct(p)}
                  className={`btn-${productType === p ? "primary" : "secondary"}`}
                  style={{ padding: "0.6rem 0.5rem", fontSize: "0.9rem", textAlign: "center" }}
                >
                  {p}
                </button>
              ))}
            </div>
            <p className="muted" style={{ fontSize: "0.82rem", marginTop: "8px" }}>
              {productType === "CPN" && "Capital Protected Note: Preserves principal with equity upside."}
              {productType === "ELN" && "Equity Linked Note: Higher yield coupon with defined downside barrier."}
              {productType === "DCD" && "Dual Currency Deposit: Short-term premium yield with currency conversion condition."}
            </p>
          </section>

          {/* 2. Product Parameters */}
          <section className="card section-card page-stack">
            <h2 style={{ fontSize: "1.1rem" }}>2. Investment Terms</h2>
            
            <div className="field">
              <label>Investment Amount ({currency})</label>
              <input
                type="number"
                min="10000"
                step="10000"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Tenor (Months)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={tenorMonths}
                onChange={(e) => setTenorMonths(e.target.value)}
              />
            </div>

            {productType === "CPN" && (
              <>
                <div className="field">
                  <label>Capital Protection (%)</label>
                  <input
                    type="number"
                    min="80"
                    max="100"
                    value={protectionPct}
                    onChange={(e) => setProtectionPct(e.target.value)}
                  />
                  <small className="muted">E.g., 100% guarantees principal repayment at maturity.</small>
                </div>
                <div className="field">
                  <label>Participation Rate (%)</label>
                  <input
                    type="number"
                    min="50"
                    max="200"
                    value={participationRate}
                    onChange={(e) => setParticipationRate(e.target.value)}
                  />
                </div>
              </>
            )}

            {productType === "ELN" && (
              <>
                <div className="field">
                  <label>Indicative Coupon (% p.a.)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="0.5"
                    value={couponPctPa}
                    onChange={(e) => setCouponPctPa(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Strike Barrier (%)</label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={strikePct}
                    onChange={(e) => setStrikePct(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Downside Knock-In Barrier (%)</label>
                  <input
                    type="number"
                    min="40"
                    max="90"
                    value={barrierPct}
                    onChange={(e) => setBarrierPct(e.target.value)}
                  />
                </div>
              </>
            )}

            {productType === "DCD" && (
              <>
                <div className="field">
                  <label>Deposit Currency</label>
                  <select value={depositCurrency} onChange={(e) => setDepositCurrency(e.target.value)}>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div className="field">
                  <label>Alternate Currency</label>
                  <select value={alternateCurrency} onChange={(e) => setAlternateCurrency(e.target.value)}>
                    <option value="INR">INR</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div className="field">
                  <label>Conversion Strike Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    value={conversionStrikeRate}
                    onChange={(e) => setConversionStrikeRate(e.target.value)}
                  />
                </div>
              </>
            )}
          </section>

          {/* 3. Investor Suitability Profile */}
          <section className="card section-card page-stack">
            <h2 style={{ fontSize: "1.1rem" }}>3. Your Risk & Suitability Profile</h2>
            <div className="field">
              <label>Risk Appetite</label>
              <select value={riskAppetite} onChange={(e) => setRiskAppetite(e.target.value)}>
                <option value="CONSERVATIVE">Conservative</option>
                <option value="MODERATE">Moderate</option>
                <option value="AGGRESSIVE">Aggressive</option>
              </select>
            </div>
            <div className="field">
              <label>Investment Horizon (Months)</label>
              <input
                type="number"
                min="3"
                max="120"
                value={investmentHorizonMonths}
                onChange={(e) => setInvestmentHorizonMonths(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Max Loss Tolerance (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={maxAcceptableLossPct}
                onChange={(e) => setMaxAcceptableLossPct(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Primary Objective</label>
              <select value={investmentObjective} onChange={(e) => setInvestmentObjective(e.target.value)}>
                <option value="CAPITAL_PRESERVATION">Capital Preservation</option>
                <option value="GROWTH">Growth</option>
                <option value="INCOME">Income</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleSimulate}
              disabled={loading}
              className="btn-primary"
              style={{ width: "100%", padding: "0.8rem", marginTop: "0.5rem", fontWeight: "700" }}
            >
              {loading ? "Computing Deterministic Payoffs…" : "Run Simulation & Check Fit"}
            </button>
          </section>
        </div>

        {/* Right Column: Simulation Output */}
        <div>
          {error && <ErrorNotice error={error} retry={handleSimulate} />}

          {!result && !loading && (
            <div className="card empty-state" style={{ padding: "3rem 1.5rem" }}>
              <div className="empty-mark" style={{ fontSize: "2.5rem" }}>📊</div>
              <h2>Ready to Simulate</h2>
              <p className="muted" style={{ maxWidth: "480px", margin: "0.5rem auto 1.5rem" }}>
                Select a product, configure your parameters on the left, and click <strong>Run Simulation</strong> to calculate potential returns across multiple market scenarios and test regulatory suitability.
              </p>
              <button
                type="button"
                onClick={handleSimulate}
                className="btn-primary"
              >
                Run Sample {productType} Simulation
              </button>
            </div>
          )}

          {loading && <Loading text="Executing financial calculations & suitability matrix…" />}

          {result && !loading && (
            <div className="page-stack">
              {/* Payoff Summary Cards */}
              <div className="stats-grid">
                <Metric
                  label="Initial Principal"
                  value={money(result.investment_amount, currency)}
                  hint={`Tenor: ${tenorMonths} months`}
                />
                <Metric
                  label="Modeled Maturity Payoff"
                  value={money(result.payoff?.payoff_amount || result.investment_amount, currency)}
                  tone="positive"
                  hint={`Effective Return: ${result.payoff?.net_return_pct ? pct(result.payoff.net_return_pct) : "Calculated"}`}
                />
                <Metric
                  label="Suitability Verdict"
                  value={result.suitability?.overall_status?.replaceAll("_", " ").toUpperCase()}
                  hint={`${result.suitability?.checks?.filter((c) => c.status === "PASS").length || 0} of 6 Checks Passed`}
                  tone={result.suitability?.overall_status === "suitable" ? "positive" : "warning"}
                />
              </div>

              {/* Suitability Breakdown */}
              <section className="card section-card page-stack">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h2 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                    <ShieldCheck size={20} color="#2563eb" />
                    Regulatory Suitability Breakdown
                  </h2>
                  <Badge value={result.suitability?.overall_status} />
                </div>
                <p className="muted" style={{ margin: "4px 0 0 0", fontSize: "0.85rem" }}>
                  Verified across 6 deterministic compliance dimensions under rule set {result.suitability?.rule_set_version || "1.0.0"}.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "10px", marginTop: "0.5rem" }}>
                  {result.suitability?.checks?.map((check) => (
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

              {/* Scenarios Table */}
              {result.scenarios?.scenarios && (
                <section className="card section-card page-stack">
                  <h2 style={{ fontSize: "1.1rem" }}>Market Scenarios Payoff Table</h2>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #40516b", textAlign: "left" }}>
                          <th style={{ padding: "8px" }}>Market Scenario</th>
                          <th style={{ padding: "8px" }}>Asset Shift (%)</th>
                          <th style={{ padding: "8px" }}>Maturity Amount</th>
                          <th style={{ padding: "8px" }}>Net Return</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.scenarios.scenarios.map((sc, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                            <td style={{ padding: "10px 8px", fontWeight: "600" }}>{sc.scenario_name}</td>
                            <td style={{ padding: "10px 8px" }}>{sc.underlying_pct_change ? `${sc.underlying_pct_change}%` : "—"}</td>
                            <td style={{ padding: "10px 8px", color: "#38bdf8", fontWeight: "600" }}>{money(sc.investor_cash_flow, currency)}</td>
                            <td style={{ padding: "10px 8px", color: sc.net_pnl_pct >= 0 ? "#4ade80" : "#f87171", fontWeight: "600" }}>
                              {pct(sc.net_pnl_pct)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Plain-Language Explanation & Multilingual Reports */}
              <section className="card section-card page-stack" style={{ borderColor: "#38bdf8" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <h2 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                      <Sparkles size={20} color="#38bdf8" />
                      Plain-Language Risk & Suitability Explanation
                    </h2>
                    <p className="muted" style={{ margin: "4px 0 0 0", fontSize: "0.84rem" }}>
                      Grounded interpretation of deterministic calculations.
                    </p>
                  </div>

                  {/* Language switchers */}
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

                {insightsLoading && <p className="muted" style={{ fontSize: "0.85rem" }}>Generating grounded explanation…</p>}

                {insights && !insightsLoading && (
                  <div style={{ backgroundColor: "#17263a", padding: "1.2rem", borderRadius: "10px", border: "1px solid #2a3e56" }}>
                    <p style={{ fontWeight: "600", color: "#e2e8f0", marginBottom: "0.75rem", fontSize: "0.95rem" }}>
                      {insights.executive_summary}
                    </p>
                    {insights.key_risks?.length > 0 && (
                      <div style={{ marginTop: "0.75rem" }}>
                        <div style={{ fontSize: "0.82rem", fontWeight: "700", color: "#f87171", textTransform: "uppercase", marginBottom: "4px" }}>
                          Key Risks To Consider:
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

                {/* PDF Download CTAs */}
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

              {/* Mandatory Regulatory Disclaimer */}
              <div style={{ padding: "1rem", backgroundColor: "#1e293b", borderRadius: "8px", border: "1px solid #334155", fontSize: "0.8rem", color: "#94a3b8", lineHeight: "1.5" }}>
                <strong>Important Disclosure:</strong> {result.disclaimer} Simulated figures do not represent guarantees or past performance indicators. Capital protection terms are dependent on the solvency of the note issuer.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
