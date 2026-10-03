import { useState } from "react";
import { money, pct } from "../../lib/api";
import { useAssessment } from "../../state/AssessmentContext";
import { AlertTriangle, Info, FileText, CheckCircle, ShieldAlert, ArrowRight } from "lucide-react";

export default function ClientInsights({ insights }) {
  const { state } = useAssessment();
  const product = state.product?.config || {};
  const type = state.product?.type || "Product";
  
  // A: At a glance
  const investment = product.investment ?? product.deposit_amount;
  const currency = product.investment_currency || product.deposit_currency || "INR";
  
  // Interactive scenarios
  const scenarios = insights.scenario_insights || [];
  const [scenarioIdx, setScenarioIdx] = useState(Math.floor(scenarios.length / 2));
  const activeScenario = scenarios[scenarioIdx];

  const typeName = type === "CPN" ? "Capital Protected Note" : type === "DCD" ? "Dual Currency Deposit" : type === "ELN" ? "Equity Linked Note" : type;

  return (
    <div className="page-stack">
      
      {/* Section A */}
      <section className="card section-card page-stack">
        <h2>Your investment at a glance</h2>
        <p>{insights.executive_summary}</p>
        
        <dl className="insight-facts">
          <div>
            <dt>Your investment</dt>
            <dd>{money(investment, currency)}</dd>
          </div>
          <div>
            <dt>Product type</dt>
            <dd>{typeName}</dd>
          </div>
          <div>
            <dt>Linked market</dt>
            <dd>{product.underlying || product.alternate_currency || "Market"}</dd>
          </div>
          <div>
            <dt>How long your money stays invested</dt>
            <dd>{product.tenor_years} year{product.tenor_years > 1 ? "s" : ""}</dd>
          </div>
          {product.protection_pct !== undefined && (
            <div>
              <dt>Amount modeled to be returned at maturity</dt>
              <dd>{pct(product.protection_pct / 100)} of initial</dd>
            </div>
          )}
          {product.participation_rate !== undefined && (
            <div>
              <dt>Share of market growth</dt>
              <dd>{pct(product.participation_rate / 100)}</dd>
            </div>
          )}
          {product.upside_cap_pct !== undefined && (
            <div>
              <dt>Growth cap</dt>
              <dd>{pct(product.upside_cap_pct / 100)}</dd>
            </div>
          )}
          {(product.coupon_pct_pa !== undefined || product.coupon_rate !== undefined) && (
            <div>
              <dt>Coupon / Income component</dt>
              <dd>{pct((product.coupon_pct_pa || product.coupon_rate) / 100)}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Section B */}
      <section className="card section-card page-stack">
        <h2>Explore what could happen to your money</h2>
        <p>Use the slider to see how different market conditions might affect your investment. These are illustrative scenarios, not predictions.</p>
        
        {scenarios.length > 0 && activeScenario && (
          <div className="page-stack">
            <div style={{ padding: '0 10px', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '10px' }}>
                <span>Market drops</span>
                <span>Market flat</span>
                <span>Market rises</span>
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
              
              <dl className="insight-facts" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
                <div>
                  <dt>Initial investment</dt>
                  <dd>{money(investment, currency)}</dd>
                </div>
                <div>
                  <dt>Modeled maturity amount</dt>
                  <dd><strong>{money(activeScenario.result.final_amount, currency)}</strong></dd>
                </div>
                <div>
                  <dt>Potential gain/loss</dt>
                  <dd style={{ color: activeScenario.result.profit_loss >= 0 ? '#4ade80' : '#f87171' }}>
                    {activeScenario.result.profit_loss > 0 ? "+" : ""}{money(activeScenario.result.profit_loss, currency)}
                  </dd>
                </div>
                <div>
                  <dt>Investor return</dt>
                  <dd style={{ color: activeScenario.result.return_pct >= 0 ? '#4ade80' : '#f87171' }}>
                    {activeScenario.result.return_pct > 0 ? "+" : ""}{pct(activeScenario.result.return_pct / 100)}
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
          <h2 style={{ margin: 0 }}>What could go wrong?</h2>
        </div>
        <p>All investments carry risks. For protected products, protection applies according to the configured contractual terms at maturity and remains subject to the issuer's ability to pay you back (issuer solvency). Principal protection does not mean this investment is risk-free.</p>
        
        <ul className="insight-list">
          {insights.key_risks.map((risk, i) => (
            <li key={i}>{risk}</li>
          ))}
        </ul>
      </section>

      {/* Section D */}
      <section className="card section-card page-stack">
        <h2>Does this investment fit your needs?</h2>
        <p>We compared this product against the financial profile you provided us.</p>
        
        <div className="page-stack">
          {insights.suitability_insights.map((s, i) => {
            const isPass = s.status === "PASS";
            const isWarn = s.status === "WARNING";
            const isMissing = s.missing;
            
            const Icon = isMissing ? Info : isPass ? CheckCircle : AlertTriangle;
            const iconColor = isMissing ? "#9ca3af" : isPass ? "#4ade80" : isWarn ? "#fbbf24" : "#f87171";
            
            return (
              <div key={i} className="notice" style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                <Icon style={{ color: iconColor, flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>{s.title}</h3>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', color: iconColor }}>
                      {isMissing ? "NEED INFO" : s.status}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 10px 0' }}>{s.explanation}</p>
                  
                  {s.money_comparison && s.money_comparison.length > 0 && (
                    <dl style={{ display: 'flex', gap: '20px', margin: 0, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                      {s.money_comparison.map((f, j) => (
                        <div key={j}>
                          <dt style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '2px' }}>{f.label}</dt>
                          <dd style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>{f.value} {f.unit}</dd>
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
        <h2>Understand the historical evidence</h2>
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
        <p className="muted">
          Historical results are not forecasts. While past data helps us understand how the product might behave, it does not guarantee future results.
        </p>
      </section>

      {/* Section F */}
      <section className="card section-card page-stack" style={{ borderTop: '4px solid #60a5fa' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText style={{ color: '#60a5fa' }} />
          <h2 style={{ margin: 0 }}>Questions to ask your RM</h2>
        </div>
        <p>Based on your profile and this product, consider discussing these specific points:</p>
        
        <ul className="insight-list">
          {insights.discussion_points.map((pt, i) => (
            <li key={i}>{pt}</li>
          ))}
        </ul>
        
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px', marginTop: '10px' }}>
          {insights.important_notes.map((note, i) => (
            <p key={i} className="muted" style={{ textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>{note}</p>
          ))}
        </div>
      </section>

    </div>
  );
}
