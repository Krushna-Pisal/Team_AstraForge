"""Audience-specific, deterministic explanations. Monetary conversions happen here, not in Gemini."""
from .insight_models import InsightDocument, Fact, ScenarioInsight, SuitabilityInsight
from app.phase3_sim_models import ScenarioResult
from .translations import t

def _title(key, rm, lang="EN"):
    title_str = {
        "risk_appetite": "Risk appetite" if rm else "Risk level",
        "investment_horizon": "Investment horizon" if rm else "Investment period",
        "loss_tolerance": "Maximum acceptable loss" if rm else "Acceptable loss",
        "portfolio_concentration": "Portfolio concentration" if rm else "Share of total investments",
        "liquidity": "Liquidity requirement" if rm else "Access to your money",
        "investment_objective": "Investment objective" if rm else "Investment goal",
    }[key]
    return title_str if rm else t(title_str, lang)

TITLES = {key: _title(key, False) for key in [
    "risk_appetite", "investment_horizon", "loss_tolerance",
    "portfolio_concentration", "liquidity", "investment_objective",
]}

CLIENT_REASONS = {
 "risk_appetite": ("The product's modeled risk fits the risk level you selected.", "The product's modeled risk is higher than the risk level you selected."),
 "investment_horizon": ("The investment ends within the time you can keep your money invested.", "The product lasts longer than you said you can invest."),
 "loss_tolerance": ("The assessed loss limit is within the loss you said you could accept.", "The loss level assessed for this product is higher than the amount you said you are comfortable losing."),
 "portfolio_concentration": ("This investment fits the tool's limits on how much is held in one area.", "A large share of your investments would be linked to structured products, the same market or the same issuer."),
 "liquidity": ("The product ends before you said you need the money.", "You may need the money before the product ends. An early exit is not guaranteed."),
 "investment_objective": ("The product's terms support the investment goal you selected.", "The product's terms do not support the investment goal you selected."),
}

def build_fallback(data, audience, lang="EN"):
    rm = audience == "RM"
    if rm: lang = "EN"
    
    kind = data["product"]["product_type"]
    cfg = data["product"][kind.lower()+"_config"]
    currency = cfg["deposit_currency"] if kind == "DCD" else cfg["investment_currency"]
    amount = cfg["deposit_amount"] if kind == "DCD" else cfg["investment"]
    facts = [Fact(key="investment",label="Notional" if rm else t("You invest", lang),value=amount,unit=currency),
             Fact(key="type",label=t("Product type", lang) if not rm else "Product type",value=kind),
             Fact(key="underlying",label="Underlying" if rm else t("Linked market", lang),value=data["ticker"]),
             Fact(key="tenor",label="Tenor" if rm else t("Investment period", lang),value=cfg["tenor_years"],unit=t("years", lang) if not rm else "years")]
    
    if rm:
        for key, label in [
            ("assessed_loss_pct", "Assessed downside used for suitability"),
            ("stress_loss_pct", "Stress-scenario loss"),
            ("historical_worst_loss_pct", "Historical worst observed loss"),
            ("max_contractual_loss_pct", "Contractual maximum loss"),
        ]:
            value = data["risk"].get(key)
            if value is not None:
                facts.append(Fact(key=key, label=label, value=value, unit="%"))
                
    labels = {"coupon_pct_pa":("Coupon p.a.","Annual interest under the product rules","%"),
        "strike_pct":("Strike / initial","Repayment reference level","% of starting price"),
        "barrier_pct":("Barrier / initial","Loss-trigger level","% of starting price"),
        "protection_pct":("Principal protection","Portion protected at maturity","%"),
        "participation_rate":("Participation","Share of market growth","%"),
        "upside_cap_pct":("Upside cap","Limit on growth return","%"),
        "conversion_strike_rate":("FX strike","Agreed currency conversion rate",""),
        "alternate_currency":("Alternate currency","Possible repayment currency",""),
        "barrier_monitoring":("Monitoring","Loss-trigger checks",""),
        "conversion_condition":("Conversion condition","Currency exchange condition","")}
        
    for key,(technical,simple,unit) in labels.items():
        if key in cfg and cfg[key] is not None:
            value=cfg[key]
            if not rm and key=="conversion_condition":
                value="Final rate at or above the agreed rate" if value=="FX_AT_OR_ABOVE_STRIKE" else "Final rate at or below the agreed rate"
            if not rm and key=="barrier_monitoring":
                value="Daily closing observations" if value=="daily" else "Only when the investment ends"
            facts.append(Fact(key=key,label=technical if rm else t(simple, lang),value=value,unit=unit))
            
    p=data["payoff"]
    coupon=p.get("coupon_earned",p.get("coupon_amount",p.get("coupon")))
    if coupon is not None:
        facts.append(Fact(key="income",label="Coupon in configured base outcome" if rm else t("Income in the unchanged-market example", lang),value=coupon,unit=currency))
        
    if kind=="ELN":
        conditional=cfg["contract_variant"]=="phase2_contingent"
        interpretation=[
            "Principal can be reduced when the configured loss conditions occur. The repayment reference level and observation rule matter.",
            "Income is paid only if the loss trigger is not hit and the final level meets the repayment reference." if conditional else "Configured interest is included even if the loss trigger is hit, but it may not offset a loss of principal.",
            "Daily monitoring uses observed closing prices; a fall and later recovery can still trigger the contract." if cfg["barrier_monitoring"]=="daily" else "The loss trigger is checked only at the end of the investment.",
        ]
    elif kind=="CPN":
        interpretation=["This model repays the stated protected portion at maturity, plus applicable income and positive growth participation. Partial protection is a fixed protected base, not a promise to repay the full original amount.",
            "The protected portion depends on the issuer meeting its obligations; early sale and issuer default are outside this model.",
            "Growth return is limited by the configured cap." if cfg["upside_cap_pct"] is not None else "No growth cap was supplied for this product."]
    else:
        interpretation=["You may receive the principal back in the other currency when the stated exchange-rate condition is met.",
            "Interest is paid separately in the original investment currency. The two currency amounts must not be added directly.",
            "The displayed combined value converts the other-currency repayment back at the scenario's exchange rate; this is a comparison value, not one cash payment."]
            
    if rm:
        interpretation.insert(0,p.get("contract_assumptions") or p.get("explanation") or "Payoff follows the configured deterministic contract.")
    else:
        interpretation = [t(txt, lang) for txt in interpretation]
        
    selected=[r for r in data["scenarios"]["results"] if r["scenario_shock_pct"] in (-50,-20,0,10,30)]
    scenarios=[]
    for r in selected:
        shock=r["scenario_shock_pct"]
        title="Market stays unchanged" if shock==0 else "Market rises" if shock>0 else "Market falls sharply" if shock<=-40 else "Market falls"
        explanation=("This modeled outcome returns less than the original investment." if r["profit_loss"]<0 else
                     "This modeled outcome returns more than the original investment." if r["profit_loss"]>0 else
                     "This modeled outcome returns the original investment amount.")
        if r.get("conversion_occurred"):
            explanation+=" Principal is repaid in the other currency; the combined value is translated into the investment currency."
            
        scenarios.append(ScenarioInsight(id="scenario_"+str(shock),title=title if rm else t(title, lang),result=ScenarioResult(**r),explanation=explanation if rm else t(explanation, lang)))
        
    history=[]
    metric_labels={"total_windows":"Historical periods tested","loss_frequency_pct":"Periods with losses",
       "win_frequency_pct":"Periods with gains","median_return":"Middle historical return","average_return":"Average historical return",
       "worst_return":"Worst observed return","best_return":"Best observed return","barrier_breach_freq_pct":"Loss-trigger frequency",
       "conversion_frequency_pct":"Currency conversion frequency"}
    if data["history"]:
        for key,label in metric_labels.items():
            value=data["history"]["metrics"].get(key)
            if value is not None:
                history.append(Fact(key=key,label=label if rm else t(label, lang),value=value,unit="" if key=="total_windows" else "%"))
    note="Historical analysis is not a prediction of future performance. Overlapping periods are not independent and cannot establish the maximum possible future loss."
    note = note if rm else t(note, lang)
    if data["history"]:
        note+=((" Source: " if rm else t(" Source: ", lang))+data["history"]["data_source"]+(". Through " if rm else t(" Through ", lang))+data["history"]["data_as_of"]+".")
    else:
        prefix = "Historical evidence is unavailable for this assessment. "
        prefix = prefix if rm else t(prefix, lang)
        note=prefix+note
        
    suitability=[]
    for c in sorted(data["assessment"]["checks"],key=lambda c:{"MISMATCH":0,"WARNING":1,"PASS":2}[c["status"]]):
        missing=c["reason_code"].startswith("MISSING_")
        if rm:
            reason = c["reason"]
        else:
            if missing:
                reason = "Some details are missing. This check needs review before a conclusion can be reached."
            else:
                reason = CLIENT_REASONS[c["type"]][0 if c["status"]=="PASS" else 1]
                
        if (
            not rm
            and c["type"] == "loss_tolerance"
            and data["risk"].get("max_contractual_loss_pct") is not None
            and data["client"].get("max_acceptable_loss_pct") is not None
            and data["risk"]["max_contractual_loss_pct"] > data["client"]["max_acceptable_loss_pct"]
        ):
            reason += " In an extreme contractual outcome, more of your original investment could be exposed to loss."
            
        reason = reason if rm else t(reason, lang)
        
        comparison=[]
        if c["type"]=="loss_tolerance":
            for key,label,value in [("acceptable_loss","Loss you said you can accept",data["client"].get("max_acceptable_loss_pct")),
                 ("contract_loss","Modeled contractual principal loss limit",data["risk"].get("max_contractual_loss_pct")),
                 ("historical_loss","Worst observed historical loss",data["risk"].get("historical_worst_loss_pct"))]:
                if value is not None:
                    comparison.append(Fact(key=key,label=label if rm else t(label, lang),value=amount*value/100,unit=currency))
        suitability.append(SuitabilityInsight(check_type=c["type"],status=c["status"],missing=missing,title=_title(c["type"], rm, lang),
            explanation=reason,client_value=c["client_value"],product_value=c["product_value"],reason_code=c["reason_code"],money_comparison=comparison))
            
    risks=["Issuer default can cause loss even where the modeled product includes protection.",
           "Fees, taxes, early-sale values and intraday market movements are not included."]
    if kind!="CPN" or cfg.get("protection_pct",100)<100:
        risks.insert(0,"Part or all of the original investment may be lost under the configured product conditions.")
    if kind=="DCD":
        risks.insert(0,"Repayment may be in another currency and its translated value can fall.")
        
    if not rm:
        risks = [t(r, lang) for r in risks]
        
    actions=[]
    for c in data["assessment"]["checks"]:
        if c["status"]!="PASS":
            act = "Discuss "+_title(c["type"], True).lower()+" and the reason for the "+c["status"].lower()+"."
            actions.append(act if rm else t(act, lang))
            
    if not actions:
        act = "Review the product terms, issuer obligations and access to money before making any decision."
        actions=[act if rm else t(act, lang)]
        
    imp1 = "Scenario outcomes are hypothetical, not forecasts or probabilities."
    imp2 = "The deterministic suitability status is unchanged. Review all mismatches and missing information."
    imp3 = "The final decision belongs to the RM, customer and institution's approved process."
    
    return InsightDocument(audience=audience,
       headline="Assessment interpretation" if rm else t("What happens to your investment?", lang),
       executive_summary="These explanations describe the configured product and the completed rule-based assessment. They are not a product recommendation." if rm else t("These explanations describe the configured product and the completed rule-based assessment. They are not a product recommendation.", lang),
       investment_summary=facts,payoff_interpretation=interpretation,scenario_insights=scenarios,
       historical_insights=history,historical_note=note,suitability_insights=suitability,overall_status=data["assessment"]["overall_status"],
       key_risks=risks,discussion_points=actions,important_notes=[imp1 if rm else t(imp1, lang), imp2 if rm else t(imp2, lang), imp3 if rm else t(imp3, lang)])

def explanation_catalog(document, lang="EN"):
    catalog={}
    for s in document.scenario_insights:
        base = s.explanation
        suffix = " This is one supplied scenario, not an estimate of what will happen."
        suffix = t(suffix, lang) if document.audience == "CLIENT" else suffix
        catalog[s.id]={"standard":base,"expanded":base+suffix}
    for c in document.suitability_insights:
        base = c.explanation
        suffix = " Discuss this concern before proceeding." if c.status!="PASS" else " This check alone does not establish overall suitability."
        suffix = t(suffix, lang) if document.audience == "CLIENT" else suffix
        catalog[c.check_type]={"standard":base,"expanded":base+suffix}
    return catalog

def apply_choices(document, choices, catalog):
    updated=document.model_copy(deep=True)
    for row in updated.scenario_insights:
        row.explanation=catalog[row.id][choices[row.id]]
    for row in updated.suitability_insights:
        row.explanation=catalog[row.check_type][choices[row.check_type]]
    return updated
