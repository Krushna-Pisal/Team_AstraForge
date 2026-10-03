"""Trusted, bounded assessment snapshots for explanation; no browser financial payloads."""
from collections import OrderedDict
from threading import RLock
from copy import deepcopy
from time import monotonic
from app.domain import DomainError

_records = OrderedDict()
_lock = RLock()
def save_record(request, evaluation, history):
    record = {"request": request.model_dump(mode="json"), "evaluation": evaluation.model_dump(mode="json"),
              "history": history.model_copy(update={"windows": []}).model_dump(mode="json") if history else None}
    with _lock:
        _records[evaluation.assessment.assessment_id] = (monotonic(), record)
        while len(_records) > 200:
            _records.popitem(last=False)

def get_record(assessment_id):
    with _lock:
        entry = _records.get(assessment_id)
        if not entry or monotonic() - entry[0] > 86400:
            raise DomainError("ASSESSMENT_EXPIRED", "This assessment is no longer available on the server. Run the customer fit check again.", 409)
        return deepcopy(entry[1])
