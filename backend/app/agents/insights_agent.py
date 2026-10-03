"""Gemini selects grounded explanation variants; never emits financial claims to the UI."""
import hashlib
import json
from collections import OrderedDict
from datetime import datetime, timezone
from threading import RLock
from fastapi import APIRouter
from app.config import gemini_settings
from .insight_models import InsightRequest, InsightResponse, GeminiExplanation
from .insight_prompts import SYSTEM_PROMPT, INSIGHTS_PROMPT_VERSION
from .insight_tools import trusted_inputs
from .fallback_insights import build_fallback, explanation_catalog, apply_choices

router=APIRouter(prefix="/api/insights",tags=["insights"])
_cache=OrderedDict()
_lock=RLock()

def call_gemini(payload, key, model):
    from google import genai
    from google.genai import types
    with genai.Client(api_key=key, http_options=types.HttpOptions(timeout=15000,
            retry_options=types.HttpRetryOptions(attempts=1))) as client:
        response=client.models.generate_content(model=model,contents=json.dumps(payload,ensure_ascii=False),
            config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT,temperature=0.1,
                response_mime_type="application/json",response_json_schema=GeminiExplanation.model_json_schema(),
                max_output_tokens=4096))
        if not response.text:
            raise ValueError("Empty model response")
        return response.text

def validate_choices(raw, audience, catalog):
    parsed=GeminiExplanation.model_validate_json(raw)
    if parsed.audience != audience:
        raise ValueError("Audience mismatch")
    choices={row.section_id:row.choice for row in parsed.selections}
    if len(choices)!=len(parsed.selections) or set(choices)!=set(catalog):
        raise ValueError("Missing, duplicate or invented explanation sections")
    return choices

@router.post("/generate",response_model=InsightResponse)
def generate_insights(req: InsightRequest):
    data=trusted_inputs(req.assessment_id)
    fallback=build_fallback(data,req.audience)
    catalog=explanation_catalog(fallback)
    key,model=gemini_settings()
    payload={"audience":req.audience,"facts":data,"explanation_catalog":catalog}
    fingerprint=hashlib.sha256(json.dumps({"payload":payload,"model":model,"prompt":INSIGHTS_PROMPT_VERSION},
        sort_keys=True,separators=(",",":"),ensure_ascii=False).encode()).hexdigest()
    # Serialize identical requests to avoid duplicate model calls from rapid toggles.
    # Local demo cache only; production needs authenticated, per-tenant storage.
    with _lock:
        if not req.retry and fingerprint in _cache:
            return _cache[fingerprint].model_copy(deep=True,update={"cached":True})
        mode="fallback"
        document=fallback
        if key and model:
            try:
                document=apply_choices(fallback,validate_choices(call_gemini(payload,key,model),req.audience,catalog),catalog)
                mode="ai"
            except Exception:
                # No raw provider errors, prompts or secrets are returned/logged.
                document=fallback
        result=InsightResponse(mode=mode,ai_available=mode=="ai",insights=document,
            prompt_version=INSIGHTS_PROMPT_VERSION,model=model if mode=="ai" else None,
            generated_at=datetime.now(timezone.utc).isoformat(),fingerprint=fingerprint,
            notice=None if mode=="ai" else "AI-enhanced explanation is unavailable. Showing standard explanation.")
        _cache[fingerprint]=result.model_copy(deep=True)
        _cache.move_to_end(fingerprint)
        while len(_cache)>200:
            _cache.popitem(last=False)
        return result
