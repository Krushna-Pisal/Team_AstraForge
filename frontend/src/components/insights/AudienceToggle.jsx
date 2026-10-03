export default function AudienceToggle({value,onChange}){
 return <div className="segmented" role="group" aria-label="Insight audience">{[["RM","RM View"],["CLIENT","Client View"]].map(([key,label])=><button key={key} aria-pressed={value===key} className={value===key?"active":""} onClick={()=>onChange(key)}>{label}</button>)}</div>;
}
