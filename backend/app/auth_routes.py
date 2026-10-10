from fastapi import APIRouter, HTTPException, BackgroundTasks, status
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel
import jwt
import datetime
import os
from app.mail import send_personalized_verification_email
from app.auth import get_jwt_secret

router = APIRouter(prefix="/auth", tags=["auth-verification"])

class VerificationRequest(BaseModel):
    email: str
    name: str

@router.post("/send-verification")
def send_verification_email(req: VerificationRequest, background_tasks: BackgroundTasks):
    """
    Generate a secure verification token and send a personalized HTML email.
    """
    secret = get_jwt_secret()
    if not secret:
        raise HTTPException(status_code=500, detail="JWT Secret not configured on backend.")

    # Create a verification token valid for 24 hours
    payload = {
        "email": req.email,
        "name": req.name,
        "action": "verify_email",
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=24)
    }
    token = jwt.encode(payload, secret, algorithm="HS256")

    # The link points back to the frontend verification handler
    # Note: In production, change localhost to your actual domain
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
    verification_link = f"{frontend_url}/verify-email?token={token}"

    # Send email in the background so the API responds instantly
    background_tasks.add_task(
        send_personalized_verification_email,
        req.email,
        req.name,
        verification_link
    )

    return {"status": "success", "message": "Verification email queued."}


@router.post("/verify-token")
def verify_token(token: str):
    """
    Validates the verification token.
    (The frontend can call this when the user clicks the link).
    """
    secret = get_jwt_secret()
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        if payload.get("action") != "verify_email":
            raise ValueError("Invalid token action")
        
        # Here you would typically update your database (e.g., profiles table) 
        # to mark the user as verified.
        
        return {"status": "success", "email": payload.get("email")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Verification link has expired.")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid verification link.")
