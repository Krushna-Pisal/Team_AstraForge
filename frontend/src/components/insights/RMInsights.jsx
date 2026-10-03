import InsightSummary from "./InsightSummary";
import ScenarioInsightCards from "./ScenarioInsightCards";
import SuitabilityInsight from "./SuitabilityInsight";
export default function RMInsights({insights,clientView=false}){
 const d=insights;const amount=d.investment_summary.find(f=>f.key==="investment")?.value;
 return <div className="page-stack">
 <section className="card section-card page-stack"><h2>{clientView?"Your investment at a glance":"Product summary"}</h2><InsightSummary facts={d.investment_summary}/></section>
 <section className="card section-card page-stack"><h2>{clientView?"How your money may be returned":"Payoff interpretation"}</h2>{d.payoff_interpretation.map((p,i)=><p key={i}>{p}</p>)}</section>
 <section className="page-stack"><h2>{clientView?"What happens when the market changes?":"Scenario insights"}</h2><ScenarioInsightCards scenarios={d.scenario_insights} investment={amount}/></section>
 <section className="card section-card page-stack"><h2>{clientView?"What happened in past market periods?":"Historical evidence"}</h2><p className="notice warning">{d.historical_note}</p><InsightSummary facts={d.historical_insights}/></section>
 <section className="page-stack"><h2>{clientView?"Does it match what you told us?":"Suitability interpretation"}</h2><SuitabilityInsight checks={d.suitability_insights} technical={!clientView}/></section>
 <section className="card section-card page-stack"><h2>Important risks</h2><ul className="insight-list">{d.key_risks.map((p,i)=><li key={i}>{p}</li>)}</ul><h2>{clientView?"Questions to discuss with your RM":"RM discussion points"}</h2><ul className="insight-list">{d.discussion_points.map((p,i)=><li key={i}>{p}</li>)}</ul>{d.important_notes.map((p,i)=><p className="muted" key={i}>{p}</p>)}</section>
 </div>;
}
