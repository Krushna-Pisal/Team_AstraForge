import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../../lib/api";
import { ErrorNotice } from "../ui/Workflow";
export default function HistoricalPriceChart({ticker}){
 const [period,setPeriod]=useState("1y");const [attempt,setAttempt]=useState(0);const [data,setData]=useState(null);const [error,setError]=useState("");
 const key=ticker+":"+period+":"+attempt;
 useEffect(()=>{
  const controller=new AbortController();
  api("/api/market-data/history?ticker="+encodeURIComponent(ticker)+"&period="+period+"&source=online&refresh="+(attempt>0),{signal:controller.signal}).then(result=>{if(!controller.signal.aborted){setData({key,result});setError("");}}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
  return()=>controller.abort();
 },[ticker,period,attempt,key]);
 const current=data?.key===key?data.result:null;
 return <section className="card section-card page-stack"><div className="section-heading"><div><h2>Historical market prices</h2><p className="muted">{ticker} · Actual observations, separate from the hypothetical payoff curve</p></div><div className="button-row"><label>Period <select aria-label="Historical price period" value={period} onChange={e=>{setError("");setAttempt(0);setPeriod(e.target.value);}}>{["1mo","1y","5y","10y"].map(p=><option key={p}>{p}</option>)}</select></label><button className="btn-secondary" onClick={()=>{setError("");setAttempt(a=>a+1);}}>Refresh market data</button></div></div>
 <p className="muted">Refreshing observations does not reset the saved starting price, strike, product terms, or assessment.</p>
 <ErrorNotice error={error} retry={()=>{setError("");setAttempt(a=>a+1);}}/>
 {!current&&!error&&<div className="skeleton tall" role="status" aria-label="Loading historical prices"/>}
 {current&&<>{current.warnings.map(w=><p className="notice warning" key={w}>{w}</p>)}{current.prices.length?<div role="img" aria-label={"Historical price chart for "+ticker}><ResponsiveContainer width="100%" height={300}><LineChart data={current.prices} margin={{top:10,right:25,bottom:15,left:20}}><CartesianGrid stroke="#30415a" strokeDasharray="3 4"/><XAxis dataKey="date" minTickGap={55} stroke="#b4c1d2"/><YAxis domain={["auto","auto"]} stroke="#b4c1d2" width={75}/><Tooltip contentStyle={{background:"#142237",border:"1px solid #50617a",color:"#edf3fa"}} formatter={v=>[new Intl.NumberFormat("en-IN",{maximumFractionDigits:4}).format(v),current.instrument?.kind==="fx"?"Exchange rate":"Price ("+current.currency+")"]}/><Line type="linear" dataKey="close" stroke="#9dc2e4" dot={false} animationDuration={250}/></LineChart></ResponsiveContainer></div>:<p>No observations are available for this period.</p>}
 <dl className="insight-facts"><div><dt>Source</dt><dd>{current.source}</dd></div><div><dt>Observations</dt><dd>{current.prices[0]?.date} to {current.as_of}</dd></div><div><dt>Provider data fetched</dt><dd>{new Date(current.fetched_at).toLocaleString()}</dd></div><div><dt>Data status</dt><dd>{current.cache_status} · daily closes, not streaming quotes</dd></div></dl></>}
 </section>;
}
