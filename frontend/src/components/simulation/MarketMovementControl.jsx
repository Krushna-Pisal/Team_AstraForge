import { useEffect, useState } from "react";
import { api, money, pct } from "../../lib/api";
import { ErrorNotice, Metric } from "../ui/Workflow";
export default function MarketMovementControl({product,shock,onChange,mode}){
 const [row,setRow]=useState(null);const [error,setError]=useState("");const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  const timer=setTimeout(()=>{
   api("/api/scenarios/simulate",{signal:controller.signal,body:{product_type:product.type,[product.type.toLowerCase()+"_config"]:product.config,custom_scenarios:[shock]}}).then(r=>{if(!controller.signal.aborted){setRow(r.results[0]);setError("");}}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
  },300);
  return()=>{clearTimeout(timer);controller.abort();};
 },[product,shock,attempt]);
 const current=row?.scenario_shock_pct===shock;
 return <section className="card section-card page-stack"><h2>Explore a market movement</h2><label className="field">Market movement: {pct(shock)}<input aria-label="Market movement" type="range" min="-90" max="80" step="1" value={shock} onChange={e=>{setError("");onChange(Number(e.target.value));}}/></label><p className="muted">Hypothetical closing-price movement, not a forecast. Moving this control does not change the saved product or suitability result. Daily scenarios assume a direct path between starting and final prices.</p>
 <ErrorNotice error={error} retry={()=>setAttempt(a=>a+1)}/>
 {!current&&!error&&<p role="status">Calculating this scenario…</p>}
 {current&&!error&&<div className="stats-grid"><Metric label="Investment" value={money(product.config.investment??product.config.deposit_amount,row.value_currency)}/><Metric label="Selected scenario maturity value" value={money(row.maturity_value,row.value_currency)}/><Metric label={mode==="money"?"Selected scenario profit / loss":"Selected scenario return"} value={mode==="money"?money(row.profit_loss,row.value_currency):pct(row.return_pct)} tone={row.profit_loss<0?"negative":"positive"}/></div>}
 {current&&row.conversion_occurred&&<p className="notice warning">Principal paid in {row.repayment_currency}: {money(row.settlement_principal,row.repayment_currency)}. Interest remains in {row.value_currency}; the maturity total above is a translated comparison value.</p>}
 </section>;
}
