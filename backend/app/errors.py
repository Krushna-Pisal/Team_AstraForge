"""One safe error envelope for every HTTP failure."""
import logging
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse
from app.domain import DomainError

logger = logging.getLogger(__name__)


def response(code, message, status, details=None):
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message, "details": details or []}})


def install_error_handlers(app):
    @app.exception_handler(RequestValidationError)
    async def invalid_request(request, exc):
        details = [{"field": ".".join(str(p) for p in e["loc"]), "message": e["msg"]} for e in exc.errors()]
        return response("VALIDATION_ERROR", "Please check the highlighted request fields.", 422, details)

    @app.exception_handler(DomainError)
    async def domain_error(request, exc):
        return response(exc.code, exc.message, exc.status_code)

    @app.exception_handler(HTTPException)
    async def http_error(request, exc):
        return response("HTTP_ERROR", str(exc.detail), exc.status_code)

    @app.exception_handler(Exception)
    async def unexpected_error(request, exc):
        logger.exception("Unhandled API failure")
        return response("INTERNAL_ERROR", "The calculation could not be completed. Please retry or contact the developer.", 500)
