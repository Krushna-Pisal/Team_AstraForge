from fastapi import APIRouter
from app.phase5_explanation.models import ExplanationContext, ExplanationResponse, QuestionRequest, QuestionResponse
from app.phase5_explanation.explanation_service import generate_explanation
from app.phase5_explanation.llm_service import ask_llm

router = APIRouter(tags=["explanation", "phase5"])

@router.post("/api/explanation/generate", response_model=ExplanationResponse)
def generate_explanation_api(ctx: ExplanationContext) -> ExplanationResponse:
    return generate_explanation(ctx)

@router.post("/api/explanation/ask", response_model=QuestionResponse)
def ask_explanation_api(req: QuestionRequest) -> QuestionResponse:
    return ask_llm(req)
