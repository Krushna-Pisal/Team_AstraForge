import { useState } from "react";
import { Badge } from "../ui/Workflow";
import AlignmentBadge from "./AlignmentBadge";
export default function ProductMatchCard({saved,match,onUse,busy}){
 const [reviewed,setReviewed]=useState(false);
 return <article className="card section-card page-stack">
 <div><span className="badge">{saved.template.product_type}</span><h2>{saved.template.name}</h2><p className="muted">{saved.template.ticker} · {saved.template[saved.template.product_type.toLowerCase()+"_terms"].tenor_years} year(s)</p></div>
 <AlignmentBadge match={match}/>
 <p>{match.passed} passed · {match.warnings} warnings · {match.mismatches} mismatches · {match.missing} missing</p>
 {match.critical_mismatch&&<div className="notice error"><strong>Mismatch — manual review required</strong></div>}
 {!!match.concerns.length&&<div><h3>Important concerns</h3><ul className="insight-list">{match.concerns.map((reason,i)=><li key={i}>{reason}</li>)}</ul></div>}
 <details><summary>View details & matching reasons</summary><ul className="insight-list">{match.reasons.map((reason,i)=><li key={i}>{reason}</li>)}</ul>{match.checks.map(c=><p key={c.type}>{c.type.replaceAll("_"," ")} <Badge value={c.status}/></p>)}</details>
 {!match.eligible&&!match.error&&<label className="review-confirm"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>I understand the concerns; continue for analysis, not approval.</label>}
 <button className="btn-primary" disabled={busy||!!match.error||(!match.eligible&&!reviewed)} onClick={()=>onUse(saved)}>Use this product</button>
 </article>;
}
