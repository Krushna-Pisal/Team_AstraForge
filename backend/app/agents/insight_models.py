from typing import Literal, Any
from pydantic import Field
from app.domain import DomainModel
from app.phase3_sim_models import ScenarioResult

Audience = Literal["RM", "CLIENT"]

class InsightRequest(DomainModel):
    assessment_id: str = Field(min_length=1, max_length=100)
    audience: Audience
    retry: bool = False

class Fact(DomainModel):
    key: str
    label: str
    value: str | float | None
    unit: str = ""

class ScenarioInsight(DomainModel):
    id: str
    title: str
    result: ScenarioResult
    explanation: str

class SuitabilityInsight(DomainModel):
    check_type: str
    status: Literal["PASS", "WARNING", "MISMATCH"]
    missing: bool = False
    title: str
    explanation: str
    client_value: Any
    product_value: Any
    reason_code: str
    money_comparison: list[Fact] = []

class InsightDocument(DomainModel):
    audience: Audience
    headline: str
    executive_summary: str
    investment_summary: list[Fact]
    payoff_interpretation: list[str]
    scenario_insights: list[ScenarioInsight]
    historical_insights: list[Fact]
    historical_note: str
    suitability_insights: list[SuitabilityInsight]
    overall_status: str
    key_risks: list[str]
    discussion_points: list[str]
    important_notes: list[str]

class InsightResponse(DomainModel):
    agent: Literal["insights"] = "insights"
    mode: Literal["ai", "fallback"]
    ai_available: bool
    insights: InsightDocument
    prompt_version: str
    model: str | None = None
    generated_at: str
    fingerprint: str
    cached: bool = False
    notice: str | None = None

class ExplanationChoice(DomainModel):
    section_id: str = Field(max_length=100)
    choice: Literal["standard", "expanded"]

class GeminiExplanation(DomainModel):
    audience: Audience
    selections: list[ExplanationChoice] = Field(min_length=1, max_length=40)
