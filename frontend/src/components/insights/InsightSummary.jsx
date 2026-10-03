import { money, pct } from "../../lib/api";
export function FactValue({fact}){
 if(fact.value==null)return "Not available";
 if(typeof fact.value!=="number")return String(fact.value);
 if(/^[A-Z]{3}$/.test(fact.unit))return money(fact.value,fact.unit);
 if(fact.unit==="%")return pct(fact.value);
 return new Intl.NumberFormat("en-IN",{maximumFractionDigits:4}).format(fact.value)+(fact.unit?" "+fact.unit:"");
}
export default function InsightSummary({facts}){
 return <dl className="insight-facts">{facts.map(f=><div key={f.key}><dt>{f.label}</dt><dd><FactValue fact={f}/></dd></div>)}</dl>;
}
