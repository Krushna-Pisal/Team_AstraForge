import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAssessment } from "../state/AssessmentContext";
import { api, money } from "../lib/api";
import { PageTitle, Loading, ErrorNotice, EmptyState, Badge } from "../components/ui/Workflow";
import AudienceToggle from "../components/insights/AudienceToggle";
import RMInsights from "../components/insights/RMInsights";
import ClientInsights from "../components/insights/ClientInsights";
export default function Insights(){
 const {state,dispatch}=useAssessment();const navigate=useNavigate();
 const [audience,setAudience]=useState("RM");const [attempt,setAttempt]=useState(0);const [error,setError]=useState("");
 const id=state.evaluation?.assessment.assessment_id;const response=state.insights?.[audience];
 useEffect(()=>{
  if(!id||!state.client||!state.product||!state.simulation||response)return;
  const controller=new AbortController();
  api("/api/insights/generate",{signal:controller.signal,body:{assessment_id:id,audience,retry:attempt>0}}).then(value=>{if(!controller.signal.aborted)dispatch({type:"insights",assessmentId:id,audience,value});}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
  return()=>controller.abort();
 },[id,audience,attempt,response,state.client,state.product,state.simulation,dispatch]);
 if(!state.client)return <EmptyState title="Customer details are missing" to="/clients" action="Add customer"/>;
 if(!state.product||!state.simulation)return <EmptyState title="Run a simulation first" to={state.product?"/simulator/results":"/simulator"} action="Continue assessment"/>;
 if(!id)return <EmptyState title="Complete the customer fit check first" to="/simulator/suitability" action="Check customer fit"/>;
 const amount=state.product.config.investment??state.product.config.deposit_amount;
 const currency=state.product.config.investment_currency||state.product.config.deposit_currency;
 function retry(){setError("");dispatch({type:"insights",assessmentId:id,audience,value:null});setAttempt(a=>a+1);}
 return <div className="page-stack"><PageTitle title={audience==="CLIENT"?"What happens to your "+money(amount,currency)+"?":"Assessment insights"} description="The same verified results, explained for two audiences. No AI calculations or recommendations."><AudienceToggle value={audience} onChange={v=>{setError("");setAttempt(0);setAudience(v);}}/></PageTitle>
 <div className="notice"><span>Rule-based result: <Badge value={state.evaluation.assessment.overall_status}/></span></div>
 <ErrorNotice error={error} retry={retry}/>{error&&<button className="btn-secondary" onClick={()=>{dispatch({type:"evaluation",value:null});navigate("/simulator/suitability");}}>Run customer fit check again</button>}
 {!response&&!error&&<Loading text="Preparing verified explanations…"/>}
 {response&&<><div className="notice"><div><p>{response.notice||"AI-assisted wording selected from validated explanations."}</p><small>{response.mode==="ai"?"Gemini":"Standard explanation"} · Prompt {response.prompt_version} · {new Date(response.generated_at).toLocaleString()}{response.model?" · "+response.model:""}</small></div>{response.mode==="fallback"&&<button className="btn-secondary" onClick={retry}>Retry AI explanation</button>}</div><p>{response.insights.executive_summary}</p>{audience==="RM"?<RMInsights insights={response.insights}/>:<ClientInsights insights={response.insights}/>}</>}
 <div className="actions"><Link className="btn-secondary" to="/simulator/suitability">Back to customer fit</Link><Link className="text-link" to="/simulator/results">All scenario results</Link><button className="btn-primary" onClick={()=>{dispatch({type:"save"});navigate("/history");}}>Save assessment</button></div></div>;
}
