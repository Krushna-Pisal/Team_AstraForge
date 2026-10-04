import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAssessment } from "../state/AssessmentContext";
import { PageTitle, Field, EmptyState, ErrorNotice, Steps } from "../components/ui/Workflow";
export default function InvestmentPlan(){
 const {state,dispatch}=useAssessment(); const navigate=useNavigate();
 const [amount,setAmount]=useState(state.client?.proposed_investment_amount||"");
 const [currency,setCurrency]=useState(state.client?.portfolio_currency||"INR");
 const [error,setError]=useState("");
 if(!state.client)return <EmptyState title="Add customer details first" to="/clients" action="Add customer"/>;
 function submit(e){
  e.preventDefault();
  const invAmount = Number(amount);
  if(currency !== state.client.portfolio_currency){
    dispatch({
      type: "client",
      draft: { ...state.client, portfolio_currency: currency },
      value: {
        ...state.client,
        portfolio_currency: currency,
        proposed_investment_amount: invAmount,
        total_portfolio_value: Math.max(state.client.total_portfolio_value || invAmount, invAmount),
      },
    });
    navigate(state.selectedProductId ? "/simulator/investment" : "/discovery");
    return;
  }
  if(state.client.total_portfolio_value && invAmount + Math.max(state.client.existing_issuer_exposure || 0, state.client.existing_underlying_exposure || 0, state.client.existing_structured_product_exposure || 0) > state.client.total_portfolio_value){
    return setError("This amount plus existing holdings exceeds total investments.");
  }
  dispatch({type:"budget",value:{proposed_investment_amount:invAmount,portfolio_currency:currency}});
  navigate(state.selectedProductId ? "/simulator/investment" : "/discovery");
 }
 return <div className="page-stack"><PageTitle title="Investment amount & currency" description="Enter this once. Discovery and the selected product will use the same amount."/><Steps current={1}/>
 <form onSubmit={submit} className="card section-card page-stack"><h2>{state.client.client_name}</h2><div className="form-grid">
 <Field label="Amount to invest"><input required type="number" min="0.01" max="1000000000000000" step="any" value={amount} onChange={e=>setAmount(e.target.value)}/></Field>
 <Field label="Investment currency"><select value={currency} onChange={e=>setCurrency(e.target.value)}>{["INR","USD","EUR","GBP","JPY","CHF","AUD","CAD","SGD","HKD"].map(c=><option key={c}>{c}</option>)}</select></Field></div><ErrorNotice error={error}/><button type="submit" className="btn-primary">Continue to product options</button></form></div>;
}
