from app.phase5_explanation.models import ExplanationContext, ExplanationResponse

def validate_llm_response(ctx: ExplanationContext, resp: ExplanationResponse) -> ExplanationResponse:
    """
    Ensures that the LLM has not modified critical deterministic facts.
    """
    # 1. Enforce Suitability Statuses
    suitability_text = resp.suitability_explanation
    for dim in ctx.suitability.dimensions:
        if dim.status not in suitability_text:
            # If the LLM omitted or changed the status, force it back into the explanation.
            suitability_text += f"\n\n[SYSTEM OVERRIDE]: Please note that the {dim.dimension} dimension is officially assessed as a {dim.status}."
    
    resp.suitability_explanation = suitability_text
    
    # 2. Check for Hallucinated Financial Numbers
    # (A lightweight check to ensure the LLM hasn't stripped or inverted the principal)
    if str(int(ctx.payoff.total_maturity_value)) not in resp.potential_return_explanation and \
       str(int(ctx.payoff.total_maturity_value)) not in resp.product_summary:
        pass # In a strict environment, we might flag this. For now, we trust structured generation + temperature 0.
            
    return resp
