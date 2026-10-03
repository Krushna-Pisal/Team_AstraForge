from typing import List, Tuple
from app.phase5_explanation.models import ExplanationContext

def validate_context(context: ExplanationContext) -> Tuple[bool, List[str]]:
    """
    Validate and normalize the supplied context.
    Returns (is_valid, list_of_errors_or_missing_info)
    """
    missing_info = []

    # Cross-reference product vs suitability
    if context.product.product_reference != context.product_risk.product_reference:
        missing_info.append(
            f"Contradiction: Configuration product reference ({context.product.product_reference}) "
            f"does not match suitability product reference ({context.product_risk.product_reference})."
        )
        
    if context.product.investment_amount != context.client_profile.proposed_investment_amount:
        missing_info.append(
            f"Contradiction: Product investment amount ({context.product.investment_amount}) "
            f"does not match client proposed investment ({context.client_profile.proposed_investment_amount})."
        )

    if not context.client_profile.portfolio_value:
        missing_info.append("Client's total portfolio value is missing.")
        
    if not context.client_profile.investment_horizon:
        missing_info.append("Client's investment horizon is missing.")

    if not context.client_profile.maximum_acceptable_loss:
        missing_info.append("Client's maximum acceptable loss is missing.")
        
    is_valid = not any(msg.startswith("Contradiction") for msg in missing_info)
    return is_valid, missing_info
