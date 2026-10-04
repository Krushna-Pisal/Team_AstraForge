import os
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")

is_supabase_configured = bool(SUPABASE_JWT_SECRET and "your-jwt-secret" not in SUPABASE_JWT_SECRET)

security = HTTPBearer(auto_error=False)

class User(BaseModel):
    id: str
    email: str
    role: str

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """
    Dependency to get the current authenticated user from Supabase JWT.
    If Supabase is not configured, allows mock/dev users for local testing.
    """
    if not credentials:
        if not is_supabase_configured:
            return User(id="dev-rm-001", email="rm@astraforge.com", role="rm")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    
    if is_supabase_configured:
        try:
            # Verify the Supabase JWT using the JWT secret
            payload = jwt.decode(
                token, 
                SUPABASE_JWT_SECRET, 
                algorithms=["HS256"],
                audience="authenticated"
            )
            # The payload contains user metadata
            user_id = payload.get("sub")
            email = payload.get("email")
            role = payload.get("user_metadata", {}).get("role", "client")
            
            if not user_id or not email:
                raise ValueError("Invalid token payload")
                
            return User(id=user_id, email=email, role=role)
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid authentication credentials: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
    # Mock fallback
    if token.startswith("mock-token"):
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
            detail="Access restricted to Relationship Managers."
        )
    return user
