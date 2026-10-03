import uuid
from app.phase5_explanation.models import ExplanationContext, ExplanationResponse
from app.phase5_explanation.context_builder import validate_context
import app.phase5_explanation.templates as tmpl
from app.phase5_explanation.llm_service import generate_llm_explanation

def generate_explanation(ctx: ExplanationContext) -> ExplanationResponse:
    is_valid, missing_info = validate_context(ctx)
    
    # Try LLM first
    llm_resp = generate_llm_explanation(ctx)
    if llm_resp:
        # LLM succeeded, just append the missing info context if any
        if missing_info:
            llm_resp.missing_information.extend(missing_info)
        llm_resp.generation_method = "Google Gemini AI"
        return llm_resp
        
    # Fallback to Deterministic generation if LLM failed
    summary = tmpl.get_product_summary(ctx)
    how_it_works = tmpl.get_how_it_works(ctx)
    potential_return = tmpl.get_return_explanation(ctx)
    potential_loss = tmpl.get_loss_explanation(ctx)
    scenarios = tmpl.get_scenarios(ctx)
    historical = tmpl.get_historical(ctx)
    suitability = tmpl.get_suitability(ctx)
    
    risks = [
        "This tool supports an RM's decision and does not constitute regulatory approval or personalized financial advice.",
        "Past performance is not indicative of future results.",
        "Your principal is at risk and may be lost entirely depending on market performance."
    ]
    
    return ExplanationResponse(
        context_id=str(uuid.uuid4()),
        product_summary=summary,
        how_it_works=how_it_works,
        potential_return_explanation=potential_return,
        potential_loss_explanation=potential_loss,
        scenario_explanations=scenarios,
        historical_performance_explanation=historical,
        suitability_explanation=suitability,
        key_risks_and_disclosures=risks,
        missing_information=missing_info,
        generation_method="Deterministic Templates (Fallback)"
    )
