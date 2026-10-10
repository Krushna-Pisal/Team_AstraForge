"""Trusted, bounded assessment snapshots for explanation; no browser financial payloads."""
from collections import OrderedDict
from threading import RLock
from copy import deepcopy
from time import monotonic
from app.domain import DomainError

_records = OrderedDict()
_lock = RLock()

def save_record(request, evaluation, history, owner_id=None, rm_id=None):
    """
    Save an assessment snapshot with optional ownership metadata.
    """
    record = {
        "request": request.model_dump(mode="json"),
        "evaluation": evaluation.model_dump(mode="json"),
        "history": history.model_copy(update={"windows": []}).model_dump(mode="json") if history else None,
        "owner_id": owner_id,
        "rm_id": rm_id,
    }
    with _lock:
        _records[evaluation.assessment.assessment_id] = (monotonic(), record)
        while len(_records) > 200:
            _records.popitem(last=False)

def get_record(assessment_id: str, caller=None):
    """
    Retrieve an assessment snapshot, enforcing ownership rules when caller identity is provided.
    - Authorized RMs have full operational access.
    - Customers can only access records where owner_id matches their identity.
    - Ownerless legacy records are forbidden to customers for safety.
    """
    with _lock:
        entry = _records.get(assessment_id)
        if not entry or monotonic() - entry[0] > 86400:
            raise DomainError(
                "ASSESSMENT_EXPIRED",
                "This assessment is no longer available on the server. Run the customer fit check again.",
                409,
            )
        record = entry[1]

        if caller is not None:
            # Relationship Managers are authorized to access records within the established workflow
            if getattr(caller, "role", None) == "rm":
                return deepcopy(record)

            # Customer caller ownership check
            record_owner = record.get("owner_id")
            if not record_owner:
                raise DomainError(
                    "ASSESSMENT_FORBIDDEN",
                    "This assessment record has no verified owner and cannot be accessed.",
                    403,
                )

            caller_id = getattr(caller, "id", None)
            caller_email = getattr(caller, "email", None)

            if record_owner != caller_id and record_owner != caller_email:
                raise DomainError(
                    "ASSESSMENT_FORBIDDEN",
                    "You are not authorized to access this assessment record.",
                    403,
                )

        return deepcopy(record)

def list_customer_records(caller=None) -> list[dict]:
    """
    List assessment summaries accessible to the caller with strict data isolation.
    - If caller is RM: lists all active advisory assessments.
    - If caller is Customer: only lists records where owner_id matches caller id/email.
    """
    results = []
    with _lock:
        now = monotonic()
        for ass_id, (created_time, record) in reversed(_records.items()):
            if now - created_time > 86400:
                continue

            owner = record.get("owner_id")
            if caller is not None:
                if getattr(caller, "role", None) != "rm":
                    caller_id = getattr(caller, "id", None)
                    caller_email = getattr(caller, "email", None)
                    if not owner or (owner != caller_id and owner != caller_email):
                        continue

            req = record.get("request", {})
            eval_data = record.get("evaluation", {})
            ass_data = eval_data.get("assessment", {})
            client_data = req.get("client", {})
            results.append({
                "assessment_id": ass_id,
                "product_type": req.get("product_type"),
                "ticker": req.get("ticker"),
                "currency": client_data.get("portfolio_currency", "INR"),
                "investment_amount": client_data.get("proposed_investment_amount"),
                "overall_status": ass_data.get("overall_status"),
                "client_name": client_data.get("client_name"),
                "owner_id": owner,
            })
    return results

