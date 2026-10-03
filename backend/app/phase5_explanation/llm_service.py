import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.phase5_explanation.models import ExplanationContext, QuestionRequest, QuestionResponse, ExplanationResponse
from app.phase5_explanation.prompts import SYSTEM_PROMPT, SYSTEM_PROMPT_QUESTION
from app.phase5_explanation.validators import validate_llm_response
import app.phase5_explanation.templates as tmpl

load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")

def get_client():
    if not GEMINI_API_KEY:
        return None
    try:
        return genai.Client(api_key=GEMINI_API_KEY)
    except Exception:
        return None

def generate_llm_explanation(ctx: ExplanationContext) -> ExplanationResponse:
    """Uses Gemini to generate the explanation. Falls back to deterministic if fails."""
    client = get_client()
    if not client:
        return None
        
    prompt = f"Please explain the following structured product and its suitability for the client based on this context:\n{ctx.model_dump_json()}"
    
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=ExplanationResponse,
                temperature=0.0 # Stick to the facts
            ),
        )
        data = json.loads(response.text)
        resp_obj = ExplanationResponse(**data)
        
        # Override critical deterministic statuses
        return validate_llm_response(ctx, resp_obj)
    except Exception as e:
        print(f"Gemini Explanation Error: {e}")
        return None

def ask_llm(req: QuestionRequest) -> QuestionResponse:
    client = get_client()
    if not client:
        return deterministic_ask_fallback(req)
        
    prompt = (
        f"Context:\n{req.context.model_dump_json()}\n\n"
        f"Client Question: {req.client_question}"
    )
    
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT_QUESTION,
                response_mime_type="application/json",
                response_schema=QuestionResponse,
                temperature=0.0
            ),
        )
        data = json.loads(response.text)
        return QuestionResponse(**data)
    except Exception as e:
        print(f"Gemini Q&A Error: {e}")
        return deterministic_ask_fallback(req)

def deterministic_ask_fallback(req: QuestionRequest) -> QuestionResponse:
    question = req.client_question.lower()
    answer = "I am currently using a deterministic fallback engine because the AI service is unavailable."
    warnings = []
    
    if "lose" in question or "risk" in question:
        answer = "Depending on the product, you can lose money if the underlying asset breaches its barrier, if the exchange rate moves unfavorably, or if the issuer defaults."
        warnings.append("Your principal may be at risk. Historical worst loss is strictly an observation, not a maximum limit.")
    elif "earn" in question or "profit" in question or "coupon" in question:
        answer = "You can earn a return through the product's coupon or participation rate, provided the specific market conditions in the contract are met at maturity."
    elif "suitab" in question or "profile" in question:
        answer = "The system deterministically matched your profile against the product's risk, tenor, and historical losses. Please see the detailed breakdown above."
        
    return QuestionResponse(
        answer=answer,
        supporting_facts_warnings=warnings,
        unavailable_information=["Dynamic natural language generation is temporarily unavailable."]
    )
