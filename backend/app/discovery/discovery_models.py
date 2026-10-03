from pydantic import Field, model_validator
from app.domain import DomainModel, ErrorBody
from app.products import ProductTemplate
from app.phase4_models import ClientProfile, SuitabilityCheck

class SavedProduct(DomainModel):
    id: str = Field(min_length=1, max_length=100)
    template: ProductTemplate

class DiscoveryRequest(DomainModel):
    client: ClientProfile
    products: list[SavedProduct] = Field(max_length=100)
    @model_validator(mode="after")
    def unique_ids(self):
        if len({p.id for p in self.products}) != len(self.products):
            raise ValueError("Product identifiers must be unique.")
        return self

class ProductMatch(DomainModel):
    product_id: str
    alignment_pct: float | None = None
    checks_completed: int = 0
    passed: int = 0
    warnings: int = 0
    mismatches: int = 0
    missing: int = 0
    critical_mismatch: bool = False
    eligible: bool = False
    checks: list[SuitabilityCheck] = []
    concerns: list[str] = []
    reasons: list[str] = []
    error: ErrorBody | None = None

class DiscoveryResponse(DomainModel):
    matches: list[ProductMatch]
    eligible_count: int
    note: str = "Alignment compares six profile checks. It does not predict returns and does not override risk mismatches."
