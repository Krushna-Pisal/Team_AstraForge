import { useState } from "react";
import { api, money, pct } from "../../lib/api";
import { useAssessment } from "../../state/AssessmentContext";
import { AlertTriangle, Info, FileText, CheckCircle, ShieldAlert, Download, Loader2 } from "lucide-react";
import PayoffChart from "../PayoffChart";
import { pdf } from "@react-pdf/renderer";
import ClientReportPDF from "./ClientReportPDF";

export const UI_STRINGS = {
  EN: {
    report_title: "Client Advisory Report",
    section_overview: "1. Investment Overview & Customer Profile",
    customer_name: "Customer Name",
    product_type: "Product Type",
    underlying_asset: "Underlying Asset",
    investment_amount: "Investment Amount",
    section_payoff: "2. Contractual Payoff & Scenarios",
    table_scenario: "Scenario",
    table_maturity_value: "Maturity Value",
    table_net_pnl: "Net P&L",
    table_return: "Return (%)",
    section_risks: "3. Key Risks & Important Conditions",
    section_suitability: "4. Client Suitability Assessment",
    section_historical: "5. Historical Market Evidence",
    section_rm_discussion: "6. Relationship Manager Discussion Points",
    payoff_curve_title: "Contractual Payoff Curve (Maturity Return Profile)",
    at_a_glance: "Your investment at a glance",
    explore_scenarios: "Explore what could happen to your money",
    slider_instruction: "Use the slider to see how different market conditions might affect your investment. These are illustrative scenarios, not predictions.",
    market_drops: "Market drops",
    market_flat: "Market flat",
    market_rises: "Market rises",
    initial_investment: "Initial investment",
    modeled_maturity: "Modeled maturity amount",
    potential_gain_loss: "Potential gain/loss",
    investor_return: "Investor return",
    what_could_go_wrong: "What could go wrong?",
    risk_disclaimer: "All investments carry risks. For protected products, protection applies according to the configured contractual terms at maturity and remains subject to the issuer's ability to pay you back (issuer solvency). Principal protection does not mean this investment is risk-free.",
    does_it_fit: "Does this investment fit your needs?",
    compare_profile: "We compared this product against the financial profile you provided us.",
    need_info: "NEED INFO",
    historical_evidence: "Understand the historical evidence",
    historical_disclaimer: "Historical results are not forecasts. While past data helps us understand how the product might behave, it does not guarantee future results.",
    questions_to_ask: "Questions to ask your RM",
    discuss_points: "Based on your profile and this product, consider discussing these specific points:",
    cpn_name: "Capital Protected Note",
    dcd_name: "Dual Currency Deposit",
    eln_name: "Equity Linked Note",
    download_english: "English PDF",
    download_hindi: "हिंदी PDF",
    download_marathi: "मराठी PDF",
  },
  HI: {
    report_title: "ग्राहक सलाहकार रिपोर्ट",
    section_overview: "1. निवेश अवलोकन एवं ग्राहक प्रोफ़ाइल",
    customer_name: "ग्राहक का नाम",
    product_type: "उत्पाद का प्रकार",
    underlying_asset: "अंतर्निहित परिसंपत्ति",
    investment_amount: "निवेश राशि",
    section_payoff: "2. संविदात्मक परिणाम एवं परिदृश्य",
    table_scenario: "परिदृश्य",
    table_maturity_value: "परिपक्वता मूल्य",
    table_net_pnl: "शुद्ध लाभ/हानि",
    table_return: "रिटर्न (%)",
    section_risks: "3. प्रमुख जोखिम एवं महत्वपूर्ण शर्तें",
    section_suitability: "4. ग्राहक उपयुक्तता मूल्यांकन",
    section_historical: "5. ऐतिहासिक बाज़ार साक्ष्य",
    section_rm_discussion: "6. रिलेशनशिप मैनेजर चर्चा बिंदु",
    payoff_curve_title: "संविदात्मक अदायगी वक्र (परिपक्वता रिटर्न रूपरेखा)",
    at_a_glance: "एक नज़र में आपका निवेश",
    explore_scenarios: "जानें कि आपके पैसे का क्या हो सकता है",
    slider_instruction: "स्लाइडर का उपयोग करके देखें कि बाज़ार की विभिन्न स्थितियां आपके निवेश को कैसे प्रभावित कर सकती हैं। ये केवल उदाहरण हैं, पूर्वानुमान नहीं।",
    market_drops: "बाज़ार गिरता है",
    market_flat: "बाज़ार स्थिर रहता है",
    market_rises: "बाज़ार बढ़ता है",
    initial_investment: "प्रारंभिक निवेश",
    modeled_maturity: "परिपक्वता राशि (अनुमानित)",
    potential_gain_loss: "संभावित लाभ/हानि",
    investor_return: "निवेशक रिटर्न",
    what_could_go_wrong: "क्या गलत हो सकता है?",
    risk_disclaimer: "सभी निवेशों में जोखिम होता है। सुरक्षित उत्पादों के लिए, सुरक्षा परिपक्वता पर लागू होती है और यह जारीकर्ता की भुगतान क्षमता पर निर्भर करती है। मूलधन सुरक्षा का मतलब यह नहीं है कि यह निवेश जोखिम-मुक्त है।",
    does_it_fit: "क्या यह निवेश आपकी आवश्यकताओं के अनुरूप है?",
    compare_profile: "हमने आपके द्वारा प्रदान की गई वित्तीय प्रोफ़ाइल के साथ इस उत्पाद की तुलना की है।",
    need_info: "जानकारी चाहिए",
    historical_evidence: "ऐतिहासिक प्रदर्शन को समझें",
    historical_disclaimer: "ऐतिहासिक परिणाम भविष्य की भविष्यवाणी नहीं हैं। हालांकि पिछला डेटा हमें यह समझने में मदद करता है कि उत्पाद कैसा प्रदर्शन कर सकता है, लेकिन यह भविष्य के परिणामों की गारंटी नहीं देता है।",
    questions_to_ask: "अपने RM से पूछने के लिए प्रश्न",
    discuss_points: "आपकी प्रोफ़ाइल और इस उत्पाद के आधार पर, इन विशिष्ट बिंदुओं पर चर्चा करने पर विचार करें:",
    cpn_name: "कैपिटल प्रोटेक्टेड नोट (मूलधन सुरक्षित)",
    dcd_name: "डुअल करेंसी डिपॉजिट (दोहरी मुद्रा जमा)",
    eln_name: "इक्विटी लिंक्ड नोट",
    download_english: "English PDF",
    download_hindi: "हिंदी PDF",
    download_marathi: "मराठी PDF",
  },
  MR: {
    report_title: "ग्राहक सल्लागार अहवाल",
    section_overview: "1. गुंतवणूक आढावा आणि ग्राहक माहिती",
    customer_name: "ग्राहकाचे नाव",
    product_type: "उत्पादनाचा प्रकार",
    underlying_asset: "संबंधित मालमत्ता",
    investment_amount: "गुंतवणूक रक्कम",
    section_payoff: "2. करारातील परतावा आणि संभाव्य परिस्थिती",
    table_scenario: "परिस्थिती",
    table_maturity_value: "मुदतपूर्ती मूल्य",
    table_net_pnl: "निव्वळ नफा/तोटा",
    table_return: "परतावा (%)",
    section_risks: "3. मुख्य जोखीम आणि महत्त्वाच्या अटी",
    section_suitability: "4. ग्राहक उपयुक्तता मूल्यमापन",
    section_historical: "5. ऐतिहासिक बाजार पुरावे",
    section_rm_discussion: "6. रिलेशनशिप मॅनेजर चर्चा मुद्दे",
    payoff_curve_title: "करारातील परतावा आलेख (मुदतपूर्ती परतावा रूपरेषा)",
    at_a_glance: "तुमची गुंतवणूक एका दृष्टिक्षेपात",
    explore_scenarios: "तुमच्या पैशांचे काय होऊ शकते ते तपासा",
    slider_instruction: "बाजारातील वेगवेगळ्या परिस्थिती तुमच्या गुंतवणुकीवर कसा परिणाम करू शकतात हे पाहण्यासाठी स्लाइडर वापरा. हे केवळ संभाव्य परिणाम आहेत, भविष्याचा अंदाज नाही.",
    market_drops: "बाजार पडतो",
    market_flat: "बाजार स्थिर राहतो",
    market_rises: "बाजार वाढतो",
    initial_investment: "मूळ गुंतवणूक",
    modeled_maturity: "अपेक्षित मुदतपूर्ती रक्कम",
    potential_gain_loss: "संभाव्य नफा/तोटा",
    investor_return: "गुंतवणूकदाराचा परतावा",
    what_could_go_wrong: "काय चुकीचे घडू शकते?",
    risk_disclaimer: "सर्व गुंतवणुकीमध्ये जोखीम असते. सुरक्षित उत्पादनांसाठी, सुरक्षा कराराच्या अटींनुसार मुदतपूर्तीवर लागू होते आणि कंपनीच्या परतफेड करण्याच्या क्षमतेवर अवलंबून असते. मुद्दल सुरक्षेचा अर्थ असा नाही की ही गुंतवणूक पूर्णपणे जोखीममुक्त आहे.",
    does_it_fit: "ही गुंतवणूक तुमच्या गरजा पूर्ण करते का?",
    compare_profile: "तुम्ही दिलेल्या आर्थिक माहितीशी आम्ही या उत्पादनाची तुलना केली आहे.",
    need_info: "माहिती आवश्यक",
    historical_evidence: "ऐतिहासिक कामगिरी समजून घ्या",
    historical_disclaimer: "ऐतिहासिक परिणाम हा भविष्याचा अंदाज नसतो. मागील माहिती उत्पादनाच्या संभाव्य कामगिरीचा अंदाज लावण्यासाठी उपयुक्त असली, तरी ती भविष्यातील परिणामांची शाश्वती देत नाही.",
    questions_to_ask: "तुमच्या RM ला विचारण्यासाठी प्रश्न",
    discuss_points: "तुमची प्रोफाइल आणि या उत्पादनाच्या आधारावर, या विशिष्ट मुद्द्यांवर चर्चा करण्याचा विचार करा:",
    cpn_name: "कॅपिटल प्रोटेक्टेड नोट (मुद्दल सुरक्षित)",
    dcd_name: "ड्युअल करन्सी डिपॉझिट (दुहेरी चलन ठेव)",
    eln_name: "इक्विटी लिंक्ड नोट",
    download_english: "English PDF",
    download_hindi: "हिंदी PDF",
    download_marathi: "मराठी PDF",
  }
};

export default function ClientInsights({ insights, language = "EN" }) {
  const { state, dispatch } = useAssessment();
  const product = state.product?.config || {};
  const type = state.product?.type || "Product";
  const [downloadingLang, setDownloadingLang] = useState(null);
  
  const t = UI_STRINGS[language] || UI_STRINGS.EN;

  const handleDownloadPDF = async (targetLang = "EN") => {
    setDownloadingLang(targetLang);
    try {
      const clientName = state.client?.client_name || "Client";
      const targetStrings = UI_STRINGS[targetLang] || UI_STRINGS.EN;
      
      let targetInsights = null;
      if (targetLang === language && insights) {
        targetInsights = insights;
      } else if (state.insights?.[`CLIENT_${targetLang}`]?.insights) {
        targetInsights = state.insights[`CLIENT_${targetLang}`].insights;
      } else {
        const assessmentId = state.evaluation?.assessment?.assessment_id || state.id;
        if (assessmentId) {
          try {
            const res = await api("/api/insights/generate", {
              body: { assessment_id: assessmentId, audience: "CLIENT", language: targetLang, retry: false }
            });
            if (res?.insights) {
              targetInsights = res.insights;
              if (dispatch) {
                dispatch({ type: "insights", assessmentId, audience: `CLIENT_${targetLang}`, value: res });
              }
            }
          } catch (e) {
            console.warn("Could not fetch translated insights, fallback to current:", e);
          }
        }
      }

      if (!targetInsights) {
        targetInsights = insights;
      }

      const blob = await pdf(
        <ClientReportPDF
          state={state}
          insights={targetInsights}
          language={targetLang}
          t={targetStrings}
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
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      setDownloadingLang(null);
    }
  };
  
  // A: At a glance
  const investment = product.investment ?? product.deposit_amount;
  const currency = product.investment_currency || product.deposit_currency || "INR";
  
  // Interactive scenarios
  const scenarios = insights.scenario_insights || [];
  const [scenarioIdx, setScenarioIdx] = useState(Math.floor(scenarios.length / 2));
  const activeScenario = scenarios[scenarioIdx];

  return (
    <div className="page-stack client-insights">
      <div className="client-report-actions">
        <span>
          Download PDF Report:
        </span>
        <button 
          type="button"
          className="btn-primary" 
          onClick={() => handleDownloadPDF("EN")} 
          disabled={Boolean(downloadingLang)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 14px' }}
        >
          {downloadingLang === "EN" ? <Loader2 className="animate-spin" size={15} /> : <Download size={15} />}
          English PDF
        </button>
        <button 
          type="button"
          className="btn-primary" 
          onClick={() => handleDownloadPDF("HI")} 
          disabled={Boolean(downloadingLang)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 14px', background: '#0284c7', borderColor: '#0284c7' }}
        >
          {downloadingLang === "HI" ? <Loader2 className="animate-spin" size={15} /> : <Download size={15} />}
          हिंदी PDF (Hindi)
        </button>
        <button 
          type="button"
          className="btn-primary" 
          onClick={() => handleDownloadPDF("MR")} 
          disabled={Boolean(downloadingLang)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 14px', background: '#059669', borderColor: '#059669' }}
        >
          {downloadingLang === "MR" ? <Loader2 className="animate-spin" size={15} /> : <Download size={15} />}
          मराठी PDF (Marathi)
        </button>
      </div>
      {/* Section A */}
      <section className="card section-card page-stack">
        <h2>{t.at_a_glance}</h2>
        
        <dl className="insight-facts">
          {insights.investment_summary.map((fact, i) => (
             <div key={i}>
                <dt>{fact.label}</dt>
                <dd>{fact.value} {fact.unit}</dd>
             </div>
          ))}
        </dl>
      </section>

      {/* Section B */}
      <section className="card section-card page-stack">
        <h2>{t.explore_scenarios}</h2>
        
        {state.simulation?.curve && (
          <div className="client-insight-chart">
            <PayoffChart 
              curve={state.simulation.curve.results.map(r => ({
                underlying_return_pct: r.scenario_shock_pct,
                investor_return_pct: r.return_pct
              }))}
              strikePct={type === "ELN" ? product.strike_pct : type === "DCD" ? (product.conversion_strike_rate / product.initial_fx_rate) * 100 : undefined}
              barrierPct={type === "ELN" ? product.barrier_pct : undefined}
              protectionPct={type === "CPN" ? product.protection_pct : undefined}
            />
          </div>
        )}

        <p>{t.slider_instruction}</p>
        
        {scenarios.length > 0 && activeScenario && (
          <div className="page-stack">
            <div className="client-scenario-control">
              <div className="client-scenario-scale">
                <span>{t.market_drops}</span>
                <span>{t.market_flat}</span>
                <span>{t.market_rises}</span>
              </div>
              <input 
                type="range" 
                min={0} 
                max={scenarios.length - 1} 
                step={1} 
                value={scenarioIdx} 
                onChange={e => setScenarioIdx(parseInt(e.target.value))} 
              />
            </div>
            
            <div className="notice" style={{ marginTop: '1.5rem' }}>
              <h3 style={{ margin: '0 0 10px 0' }}>{activeScenario.title}</h3>
              <p style={{ marginBottom: '15px' }}>{activeScenario.explanation}</p>
              
              <dl className="insight-facts client-scenario-facts">
                <div>
                  <dt>{t.initial_investment}</dt>
                  <dd>{money(investment, currency)}</dd>
                </div>
                <div>
                  <dt>{t.modeled_maturity}</dt>
                  <dd><strong>{money(activeScenario.result.maturity_value, currency)}</strong></dd>
                </div>
                <div>
                  <dt>{t.potential_gain_loss}</dt>
                  <dd className={activeScenario.result.profit_loss >= 0 ? "positive" : "negative"}>
                    {activeScenario.result.profit_loss > 0 ? "+" : ""}{money(activeScenario.result.profit_loss, currency)}
                  </dd>
                </div>
                <div>
                  <dt>{t.investor_return}</dt>
                  <dd className={activeScenario.result.return_pct >= 0 ? "positive" : "negative"}>
                    {activeScenario.result.return_pct > 0 ? "+" : ""}{pct(activeScenario.result.return_pct)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </section>

      {/* Section C */}
      <section className="card section-card page-stack" style={{ borderTop: '4px solid #ef4444' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert style={{ color: '#ef4444' }} />
          <h2 style={{ margin: 0 }}>{t.what_could_go_wrong}</h2>
        </div>
        <p>{t.risk_disclaimer}</p>
        
        <ul className="insight-list">
          {insights.key_risks.map((risk, i) => (
            <li key={i}>{risk}</li>
          ))}
        </ul>
      </section>

      {/* Section D */}
      <section className="card section-card page-stack">
        <h2>{t.does_it_fit}</h2>
        <p>{t.compare_profile}</p>
        
        <div className="page-stack">
          {insights.suitability_insights.map((s, i) => {
            const isPass = s.status === "PASS";
            const isWarn = s.status === "WARNING";
            const isMissing = s.missing;
            const statusClass = isMissing ? "missing" : isPass ? "pass" : isWarn ? "warning" : "mismatch";
            
            const Icon = isMissing ? Info : isPass ? CheckCircle : AlertTriangle;
            
            return (
              <div key={i} className={`notice client-suitability-result ${statusClass}`}>
                <Icon className="client-suitability-icon" />
                <div className="client-suitability-content">
                  <div className="client-suitability-heading">
                    <h3 style={{ margin: 0, fontSize: '16px' }}>{s.title}</h3>
                    <span className="client-suitability-status">
                      {isMissing ? t.need_info : s.status}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 10px 0' }}>{s.explanation}</p>
                  
                  {s.money_comparison && s.money_comparison.length > 0 && (
                    <dl className="client-money-comparison">
                      {s.money_comparison.map((f, j) => (
                        <div key={j}>
                          <dt style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '2px' }}>{f.label}</dt>
                          <dd style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
                            {f.unit === currency ? money(f.value, f.unit) : f.unit === "%" ? pct(f.value) : `${f.value} ${f.unit}`}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section E */}
      <section className="card section-card page-stack">
        <h2>{t.historical_evidence}</h2>
        <div className="notice warning">
          <p>{insights.historical_note}</p>
        </div>
        
        <dl className="insight-facts">
          {insights.historical_insights.map((f, i) => (
            <div key={i}>
              <dt>{f.label}</dt>
              <dd>{f.value} <span style={{ fontSize: '14px', color: '#9ca3af' }}>{f.unit}</span></dd>
            </div>
          ))}
        </dl>
        <p className="muted">{t.historical_disclaimer}</p>
      </section>

      {/* Section F */}
      <section className="card section-card page-stack" style={{ borderTop: '4px solid #60a5fa' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText style={{ color: '#60a5fa' }} />
          <h2 style={{ margin: 0 }}>{t.questions_to_ask}</h2>
        </div>
        <p>{t.discuss_points}</p>
        
        <ul className="insight-list">
          {insights.discussion_points.map((pt, i) => (
            <li key={i}>{pt}</li>
          ))}
        </ul>
        
        <div className="client-important-notes">
          {insights.important_notes.map((note, i) => (
            <p key={i} className="muted" style={{ textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>{note}</p>
          ))}
        </div>
      </section>
    </div>
  );
}
