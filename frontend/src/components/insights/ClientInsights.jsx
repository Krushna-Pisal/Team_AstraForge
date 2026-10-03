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
    <div className="page-stack mt-8">
      
      {/* Section A */}
      <section className="card section-card">
        <h2 className="text-2xl font-semibold mb-4 text-slate-800">Your investment at a glance</h2>
        <p className="mb-6 text-slate-700">{insights.executive_summary}</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-4 rounded">
            <div className="text-sm text-slate-500 mb-1">Your investment</div>
            <div className="text-lg font-medium">{money(investment, currency)}</div>
          </div>
          <div className="bg-slate-50 p-4 rounded">
            <div className="text-sm text-slate-500 mb-1">Product type</div>
            <div className="text-lg font-medium">{typeName}</div>
          </div>
          <div className="bg-slate-50 p-4 rounded">
            <div className="text-sm text-slate-500 mb-1">Linked market</div>
            <div className="text-lg font-medium">{product.underlying || product.alternate_currency || "Market"}</div>
          </div>
          <div className="bg-slate-50 p-4 rounded">
            <div className="text-sm text-slate-500 mb-1">How long your money stays invested</div>
            <div className="text-lg font-medium">{product.tenor_years} year{product.tenor_years > 1 ? "s" : ""}</div>
          </div>
          {product.protection_pct !== undefined && (
            <div className="bg-slate-50 p-4 rounded">
              <div className="text-sm text-slate-500 mb-1">Amount modeled to be returned at maturity</div>
              <div className="text-lg font-medium">{pct(product.protection_pct / 100)} of initial</div>
            </div>
          )}
          {product.participation_rate !== undefined && (
            <div className="bg-slate-50 p-4 rounded">
              <div className="text-sm text-slate-500 mb-1">Share of market growth</div>
              <div className="text-lg font-medium">{pct(product.participation_rate / 100)}</div>
            </div>
          )}
          {product.upside_cap_pct !== undefined && (
            <div className="bg-slate-50 p-4 rounded">
              <div className="text-sm text-slate-500 mb-1">Growth cap</div>
              <div className="text-lg font-medium">{pct(product.upside_cap_pct / 100)}</div>
            </div>
          )}
          {(product.coupon_pct_pa !== undefined || product.coupon_rate !== undefined) && (
            <div className="bg-slate-50 p-4 rounded">
              <div className="text-sm text-slate-500 mb-1">Coupon / Income component</div>
              <div className="text-lg font-medium">{pct((product.coupon_pct_pa || product.coupon_rate) / 100)}</div>
            </div>
          )}
        </div>
      </section>

      {/* Section B */}
      <section className="card section-card">
        <h2 className="text-2xl font-semibold mb-4 text-slate-800">Explore what could happen to your money</h2>
        <p className="text-slate-600 mb-6">Use the slider to see how different market conditions might affect your investment. These are illustrative scenarios, not predictions.</p>
        
        {scenarios.length > 0 && activeScenario && (
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
            <div className="mb-8">
              <label className="flex justify-between text-sm font-medium text-slate-700 mb-4 px-2">
                <span>Market drops</span>
                <span>Market flat</span>
                <span>Market rises</span>
              </label>
              <input 
                type="range" 
                min={0} 
                max={scenarios.length - 1} 
                step={1} 
                value={scenarioIdx} 
                onChange={e => setScenarioIdx(parseInt(e.target.value))} 
                className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="font-bold text-xl mb-2 text-slate-900">{activeScenario.title}</h3>
              <p className="text-slate-700 mb-6">{activeScenario.explanation}</p>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-4 border-t border-slate-100">
                <div className="flex-1">
                  <div className="text-sm text-slate-500 mb-1">Initial investment</div>
                  <div className="text-2xl font-medium text-slate-800">{money(investment, currency)}</div>
                </div>
                <ArrowRight className="hidden md:block text-slate-300 w-8 h-8 shrink-0" />
                <div className="flex-1">
                  <div className="text-sm text-slate-500 mb-1">Modeled maturity amount</div>
                  <div className="text-2xl font-bold text-slate-900">{money(activeScenario.result.final_amount, currency)}</div>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-500 mb-1">Potential gain/loss</div>
                  <div className={`text-2xl font-bold ${activeScenario.result.profit_loss >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {activeScenario.result.profit_loss > 0 ? "+" : ""}{money(activeScenario.result.profit_loss, currency)}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-500 mb-1">Investor return</div>
                  <div className={`text-2xl font-bold ${activeScenario.result.return_pct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {activeScenario.result.return_pct > 0 ? "+" : ""}{pct(activeScenario.result.return_pct / 100)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Section C */}
      <section className="card section-card border-t-4 border-t-rose-500">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="w-6 h-6 text-rose-500" />
          <h2 className="text-2xl font-semibold text-slate-800">What could go wrong?</h2>
        </div>
        <p className="mb-6 text-slate-700">All investments carry risks. For protected products, protection applies according to the configured contractual terms at maturity and remains subject to the issuer's ability to pay you back (issuer solvency). Principal protection does not mean this investment is risk-free.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.key_risks.map((risk, i) => (
            <div key={i} className="flex gap-3 bg-rose-50/50 p-4 rounded-lg border border-rose-100">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-slate-800 leading-relaxed">{risk}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Section D */}
      <section className="card section-card">
        <h2 className="text-2xl font-semibold mb-4 text-slate-800">Does this investment fit your needs?</h2>
        <p className="mb-6 text-slate-700">We compared this product against the financial profile you provided us.</p>
        
        <div className="space-y-4">
          {insights.suitability_insights.map((s, i) => {
            const isPass = s.status === "PASS";
            const isWarn = s.status === "WARNING";
            const isMissing = s.missing;
            
            const colorClass = isMissing ? "bg-slate-50 border-slate-200" 
                             : isPass ? "bg-emerald-50/50 border-emerald-200" 
                             : isWarn ? "bg-amber-50/50 border-amber-200" 
                             : "bg-rose-50/50 border-rose-200";
                             
            const Icon = isMissing ? Info : isPass ? CheckCircle : AlertTriangle;
            const iconColor = isMissing ? "text-slate-500" : isPass ? "text-emerald-600" : isWarn ? "text-amber-600" : "text-rose-600";
            
            return (
              <div key={i} className={`p-5 rounded-lg border ${colorClass}`}>
                <div className="flex items-start gap-4">
                  <Icon className={`w-6 h-6 ${iconColor} shrink-0 mt-1`} />
                  <div className="w-full">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg text-slate-900">{s.title}</h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${iconColor} bg-white bg-opacity-80 border border-black/5`}>
                        {isMissing ? "NEED INFO" : s.status}
                      </span>
                    </div>
                    <p className="text-slate-800 mb-3">{s.explanation}</p>
                    
                    {s.money_comparison && s.money_comparison.length > 0 && (
                      <div className="flex flex-wrap gap-x-8 gap-y-2 mt-4 pt-4 border-t border-black/5">
                        {s.money_comparison.map((f, j) => (
                          <div key={j} className="flex flex-col">
                            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">{f.label}</span>
                            <span className="font-semibold text-slate-800">{f.value} {f.unit}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section E */}
      <section className="card section-card">
        <h2 className="text-2xl font-semibold mb-4 text-slate-800">Understand the historical evidence</h2>
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
          <p className="text-slate-700 italic mb-6">{insights.historical_note}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {insights.historical_insights.map((f, i) => (
              <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-center">
                <div className="text-sm font-medium text-slate-500 mb-1">{f.label}</div>
                <div className="text-2xl font-bold text-slate-900">{f.value} <span className="text-base font-normal text-slate-500">{f.unit}</span></div>
              </div>
            ))}
          </div>
          <div className="text-sm text-slate-600 bg-blue-50 text-blue-900 p-4 rounded border border-blue-100 flex gap-3">
            <Info className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />
            <p>Historical results are not forecasts. While past data helps us understand how the product might behave, it does not guarantee future results.</p>
          </div>
        </div>
      </section>

      {/* Section F */}
      <section className="card section-card border-t-4 border-t-brand">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-6 h-6 text-brand" />
          <h2 className="text-2xl font-semibold text-slate-800">Questions to ask your RM</h2>
        </div>
        <p className="mb-6 text-slate-700">Based on your profile and this product, consider discussing these specific points:</p>
        <ul className="space-y-3 mb-8">
          {insights.discussion_points.map((pt, i) => (
            <li key={i} className="flex items-start gap-4 bg-brand/5 p-4 rounded-lg border border-brand/10">
              <span className="flex items-center justify-center bg-brand text-white rounded-full w-7 h-7 text-sm shrink-0 font-bold shadow-sm">{i + 1}</span>
              <span className="text-slate-800 font-medium leading-relaxed mt-0.5">{pt}</span>
            </li>
          ))}
        </ul>
        <div className="pt-5 border-t border-slate-100 space-y-2">
          {insights.important_notes.map((note, i) => (
            <p key={i} className="text-xs text-slate-500 leading-relaxed uppercase tracking-wide">{note}</p>
          ))}
        </div>
      </section>

    </div>
  );
}
