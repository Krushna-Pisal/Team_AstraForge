import { Badge } from "../ui/Workflow";
import InsightSummary from "./InsightSummary";
export default function SuitabilityInsight({checks,technical}){
 return <div className="page-stack">{checks.map(c=><article key={c.check_type} className={"card section-card page-stack check "+c.status.toLowerCase()}><div className="section-heading"><h3>{c.title}</h3><Badge value={c.status}/></div>{c.missing&&<p className="warning">Missing information — review needed</p>}<p>{c.explanation}</p>{!!c.money_comparison.length&&<><InsightSummary facts={c.money_comparison}/><p className="muted">Contractual loss and historical loss are different measures. Past losses do not limit future losses; issuer default is outside the modeled contract.</p></>}
 {technical&&<details><summary>Rule inputs</summary><p>Customer value: {JSON.stringify(c.client_value)??"Missing"}</p><p>Product value: {JSON.stringify(c.product_value)??"Missing"}</p><code>{c.reason_code}</code></details>}</article>)}</div>;
}
