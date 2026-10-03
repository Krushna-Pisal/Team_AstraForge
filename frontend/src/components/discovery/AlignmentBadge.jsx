export default function AlignmentBadge({match}){
 return <div className="alignment-score"><strong>{match.alignment_pct==null?"Not assessed":match.alignment_pct+"% alignment"}</strong><span>{match.checks_completed} of 6 checks complete</span><small>Alignment compares six profile checks. It does not predict returns and does not override risk mismatches.</small></div>;
}
