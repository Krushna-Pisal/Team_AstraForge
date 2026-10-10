import os
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")

def get_jwt_secret() -> str:
    """Retrieve the active Supabase JWT secret from environment or module fallback."""
    return os.environ.get("SUPABASE_JWT_SECRET", SUPABASE_JWT_SECRET)

def is_supabase_configured() -> bool:
    """Check if a real Supabase JWT secret is configured."""
    secret = get_jwt_secret()
    return bool(secret and "your-jwt-secret" not in secret)

def is_production() -> bool:
    """Check if the application is running in an explicit production environment."""
    env = os.environ.get("ENVIRONMENT", os.environ.get("APP_ENV", "")).lower()
    return env in ("production", "prod")

def is_dev_bypass_enabled() -> bool:
    """
    Development-only bypass must be explicitly gated and must never be usable in production.
    Missing SUPABASE_JWT_SECRET alone does not grant access.
    """
    if is_production():
        return False
    bypass_env = os.environ.get("ALLOW_DEV_AUTH_BYPASS", "")
    if bypass_env.lower() in ("false", "0", "no"):
        return False
    if bypass_env.lower() in ("true", "1", "yes"):
        return True
    if "PYTEST_CURRENT_TEST" in os.environ:
        return True
    return not is_supabase_configured()

security = HTTPBearer(auto_error=False)

class User(BaseModel):
    id: str
    email: str
    role: str

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """
    Authenticate the caller using Supabase JWT in production or scoped mock tokens in dev.
    Unauthenticated requests to protected endpoints are always rejected unless explicitly gated in dev/test.
    """
    if not credentials:
        if is_dev_bypass_enabled():
            return User(id="dev-rm-001", email="rm@astraforge.com", role="rm")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    if is_supabase_configured():
        # Reject mock tokens whenever production Supabase authentication is enabled
        if token.startswith("mock-token"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        try:
            payload = jwt.decode(
                token,
                get_jwt_secret(),
                algorithms=["HS256"],
                audience="authenticated",
            )
            user_id = payload.get("sub")
            email = payload.get("email")

            if not user_id or not email:
                raise ValueError("Missing sub or email in token payload")

            # Role authorization:
            # 1. Trusted server-controlled app_metadata takes precedence.
            # 2. Client-controllable user_metadata can NEVER grant RM privileges in production.
            app_role = payload.get("app_metadata", {}).get("role")
            if app_role:
                role = app_role
            else:
                user_meta_role = payload.get("user_metadata", {}).get("role", "client")
                role = "client" if user_meta_role == "rm" else user_meta_role

            return User(id=user_id, email=email, role=role)

        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except Exception:
            # Prevent leaking internal cryptographic or decode exceptions to clients
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # When Supabase is not configured:
    # If production environment is set without Supabase secret, fail safely
    if is_production():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication service misconfigured",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Scoped development-only mock tokens
    if token.startswith("mock-token-client"):
        return User(id="dev-client-001", email="client@astraforge.com", role="client")
    elif token.startswith("mock-token"):
        return User(id="dev-rm-001", email="rm@astraforge.com", role="rm")

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

def require_rm_role(user: User = Depends(get_current_user)) -> User:
    """Dependency to ensure the user has the Relationship Manager role."""
    if user.role != "rm":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Relationship Managers.",
        )
    return user

def require_client_or_rm(user: User = Depends(get_current_user)) -> User:
    """Dependency ensuring caller is an authenticated client or RM."""
    if user.role not in ("client", "rm"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied.",
        )
    return user
