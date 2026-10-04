import { Badge } from "../ui/Workflow";
import InsightSummary from "./InsightSummary";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

export default function SuitabilityInsight({checks,technical}){
 const iconFor = (check) => {
   if (check.missing) return <Info size={22} strokeWidth={2} />;
   if (check.status === "PASS") return <CheckCircle2 size={22} strokeWidth={2} />;
   return <AlertTriangle size={22} strokeWidth={2} />;
 };

 return (
   <div className="insights-suitability-list">
     {checks.map((c) => (
       <article
         key={c.check_type}
         className={"card suitability-card " + (c.status || "").toLowerCase()}
       >
         <div className="suitability-card-icon" aria-hidden="true">
           {iconFor(c)}
         </div>
         <div className="suitability-card-content">
           <div className="suitability-card-heading">
             <h3>{c.title}</h3>
             <Badge value={c.missing ? "NEED INFO" : c.status} />
           </div>
           {c.missing && <p className="warning">Missing information — review needed</p>}
           <p className="suitability-card-explanation">{c.explanation}</p>
           {!!c.money_comparison.length && (
             <>
               <InsightSummary facts={c.money_comparison} />
               <p className="muted suitability-card-note">
                 Contractual loss and historical loss are different measures. Past losses do not limit future losses; issuer default is outside the modeled contract.
               </p>
             </>
           )}
           {technical && (
             <details className="suitability-rule-inputs">
               <summary>Rule inputs</summary>
               <p>Customer value: {JSON.stringify(c.client_value) ?? "Missing"}</p>
               <p>Product value: {JSON.stringify(c.product_value) ?? "Missing"}</p>
               <code>{c.reason_code}</code>
             </details>
           )}
         </div>
       </article>
     ))}
   </div>
 );
}
