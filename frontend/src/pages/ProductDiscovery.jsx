import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAssessment } from "../state/AssessmentContext";
import { api, money } from "../lib/api";
import { PageTitle, EmptyState, ErrorNotice, Loading } from "../components/ui/Workflow";
import ProductMatchCard from "../components/discovery/ProductMatchCard";
export default function ProductDiscovery(){
 const {state,dispatch}=useAssessment();const navigate=useNavigate();
 const [requested,setRequested]=useState(false);const [result,setResult]=useState(null);const [error,setError]=useState("");const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  if(!requested||!state.client?.proposed_investment_amount||!state.products.length)return;
  const controller=new AbortController();
  api("/api/discovery/evaluate",{signal:controller.signal,body:{client:state.client,products:state.products.map(p=>({id:p.id,template:p.template}))}}).then(r=>{if(!controller.signal.aborted)setResult(r);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
  return()=>controller.abort();
 },[requested,state.client,state.products,attempt]);
 if(!state.client)return <EmptyState title="Add a customer before discovery" to="/clients" action="Add customer"/>;
 if(!state.client.proposed_investment_amount)return <EmptyState title="Enter an investment amount first" to="/simulator/budget" action="Add amount & currency"/>;
 function use(saved){dispatch({type:"select_product",value:saved.id});navigate("/simulator/investment");}
 return <div className="page-stack"><PageTitle title="Find a product that fits" description={state.client.client_name+" · "+money(state.client.proposed_investment_amount,state.client.portfolio_currency)}><Link className="btn-secondary" to="/simulator/budget">Edit amount</Link></PageTitle>
 <div className="choice-grid"><section className="card section-card page-stack"><h2>Discover saved products</h2><p>Compare this customer's needs with products saved in this session.</p><button className="btn-primary" onClick={()=>{setResult(null);setError("");setRequested(true);setAttempt(a=>a+1);}}>Discover saved products</button></section>
 <section className="card section-card page-stack"><h2>Configure a new product</h2><p>Build ELN, DCD or CPN terms without re-entering customer details.</p><Link className="btn-secondary" to="/simulator#new-product">Configure a new product</Link></section></div>
 {!state.products.length&&<div className="notice">No saved products yet. Configure a product to start your session library.</div>}
 <ErrorNotice error={error} retry={()=>{setError("");setAttempt(a=>a+1);}}/>
 {requested&&state.products.length>0&&!result&&!error&&<Loading text="Comparing saved terms with customer needs and available historical evidence…"/>}
 {result&&<><div className="notice"><p>{result.eligible_count?result.eligible_count+" product(s) meet the completed checks. Review the details before proceeding.":"No suitable match found. Review missing information or configure a new product."}</p></div><p className="muted">{result.note} PASS = 1, warning = 0.5, mismatch or missing = 0; total divided by 6.</p>
 <div className="discovery-grid">{result.matches.map(m=><ProductMatchCard key={m.product_id} saved={state.products.find(p=>p.id===m.product_id)} match={m} onUse={use}/>)}</div></>}
 </div>;
}
