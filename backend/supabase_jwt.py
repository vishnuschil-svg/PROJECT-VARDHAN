"""
Supabase JWT Validation Module
Handles JWT token validation and user extraction for Supabase Auth integration
"""

import jwt
from datetime import datetime, UTC
from typing import Optional, Dict, Any
from fastapi import HTTPException, Header, Request, status
from pydantic import BaseModel, Field


class SupabaseTokenPayload(BaseModel):
    """Supabase JWT token payload structure"""
    sub: str = Field(..., description="User UUID")
    aud: str = Field(..., description="Audience (typically 'authenticated')")
    exp: int = Field(..., description="Expiration timestamp")
    iat: int = Field(..., description="Issued at timestamp")
    email: Optional[str] = Field(None, description="User email")
    role: Optional[str] = Field(None, description="User role")
    user_metadata: Optional[Dict[str, Any]] = Field(None, alias="user_metadata", description="User metadata")


class TenantContext(BaseModel):
    """Tenant context extracted from JWT"""
    tenant_id: str = Field(..., description="Tenant identifier")
    data_scope: str = Field(..., description="Data scope (own_business, real_tenant, demo_sandbox)")
    workspace_id: Optional[str] = Field(None, description="Workspace identifier")


class AuthenticatedUser(BaseModel):
    """Authenticated user information"""
    user_id: str = Field(..., description="User UUID")
    email: Optional[str] = Field(None, description="User email")
    role: Optional[str] = Field(None, description="User role")
    tenant_context: Optional[TenantContext] = Field(None, description="Tenant context")
    user_metadata: Optional[Dict[str, Any]] = Field(None, description="User metadata")


class SupabaseJWTValidator:
    """Validates Supabase JWT tokens and extracts user information"""

    def __init__(self, jwt_secret: str, jwt_audience: str = "authenticated"):
        self.jwt_secret = jwt_secret
        self.jwt_audience = jwt_audience

    def validate_token(self, token: str) -> SupabaseTokenPayload:
        """
        Validate and decode a Supabase JWT token

        Args:
            token: JWT token string

        Returns:
            SupabaseTokenPayload: Decoded token payload

        Raises:
            HTTPException: If token is invalid or expired
        """
        try:
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=["HS256"],
                audience=self.jwt_audience,
                options={
                    "verify_aud": True,
                    "verify_exp": True,
                    "verify_iat": True,
                }
            )
            return SupabaseTokenPayload(**payload)
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
            )
        except jwt.InvalidAudienceError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token audience",
            )
        except jwt.InvalidTokenError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}",
            )

    def extract_user(self, payload: SupabaseTokenPayload) -> AuthenticatedUser:
        """
        Extract user information from token payload

        Args:
            payload: Validated token payload

        Returns:
            AuthenticatedUser: User information with tenant context
        """
        # Extract tenant context from user metadata
        user_metadata = payload.user_metadata or {}
        app_metadata = payload.model_dump(exclude={"sub", "aud", "exp", "iat", "email", "role", "user_metadata"})

        tenant_context = None
        if "tenant_id" in user_metadata or "tenant_id" in app_metadata:
            tenant_context = TenantContext(
                tenant_id=user_metadata.get("tenant_id") or app_metadata.get("tenant_id", ""),
                data_scope=user_metadata.get("data_scope") or app_metadata.get("data_scope", "real_tenant"),
                workspace_id=user_metadata.get("workspace_id") or app_metadata.get("workspace_id"),
            )

        return AuthenticatedUser(
            user_id=payload.sub,
            email=payload.email,
            role=payload.role,
            tenant_context=tenant_context,
            user_metadata=user_metadata,
        )

    def validate_and_extract(self, token: str) -> AuthenticatedUser:
        """
        Validate token and extract user information in one step

        Args:
            token: JWT token string

        Returns:
            AuthenticatedUser: User information
        """
        payload = self.validate_token(token)
        return self.extract_user(payload)


def get_authorization_header(authorization: str = Header(None)) -> Optional[str]:
    """
    Extract Bearer token from Authorization header

    Args:
        authorization: Authorization header value

    Returns:
        Token string or None
    """
    if not authorization:
        return None

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Expected: Bearer <token>",
        )

    return authorization[7:]  # Remove "Bearer " prefix


def get_token_from_request(request: Request) -> Optional[str]:
    """
    Extract token from request (checks multiple sources)

    Args:
        request: FastAPI request object

    Returns:
        Token string or None
    """
    # Try Authorization header first
    auth_header = request.headers.get("Authorization")
    if auth_header:
        if auth_header.startswith("Bearer "):
            return auth_header[7:]

    # Try query parameter
    token = request.query_params.get("token")
    if token:
        return token

    return None


async def get_current_user(
    request: Request,
    jwt_secret: str,
    jwt_audience: str = "authenticated",
) -> AuthenticatedUser:
    """
    FastAPI dependency to get current authenticated user from JWT token

    Args:
        request: FastAPI request object
        jwt_secret: JWT secret key
        jwt_audience: JWT audience

    Returns:
        AuthenticatedUser: Current user information

    Raises:
        HTTPException: If authentication fails
    """
    token = get_token_from_request(request)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No authentication token provided",
        )

    validator = SupabaseJWTValidator(jwt_secret, jwt_audience)
    return validator.validate_and_extract(token)


async def get_optional_user(
    request: Request,
    jwt_secret: str,
    jwt_audience: str = "authenticated",
) -> Optional[AuthenticatedUser]:
    """
    FastAPI dependency to optionally get current authenticated user

    Returns None if no valid token is provided

    Args:
        request: FastAPI request object
        jwt_secret: JWT secret key
        jwt_audience: JWT audience

    Returns:
        AuthenticatedUser or None
    """
    token = get_token_from_request(request)

    if not token:
        return None

    try:
        validator = SupabaseJWTValidator(jwt_secret, jwt_audience)
        return validator.validate_and_extract(token)
    except HTTPException:
        return None


def require_tenant_context(user: AuthenticatedUser) -> TenantContext:
    """
    Ensure user has tenant context

    Args:
        user: Authenticated user

    Returns:
        TenantContext: User's tenant context

    Raises:
        HTTPException: If user lacks tenant context
    """
    if not user.tenant_context:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have tenant context assigned",
        )

    return user.tenant_context


def require_platform_owner(user: AuthenticatedUser) -> bool:
    """
    Check if user is a platform owner

    Args:
        user: Authenticated user

    Returns:
        bool: True if user is platform owner

    Raises:
        HTTPException: If user is not platform owner
    """
    is_platform_owner = user.user_metadata.get("is_platform_admin", False) if user.user_metadata else False

    if not is_platform_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform owner access required",
        )

    return True


def require_role(user: AuthenticatedUser, required_roles: set[str]) -> bool:
    """
    Check if user has required role

    Args:
        user: Authenticated user
        required_roles: Set of required role identifiers

    Returns:
        bool: True if user has required role

    Raises:
        HTTPException: If user lacks required role
    """
    user_role = user.role or user.user_metadata.get("role") if user.user_metadata else None

    if user_role not in required_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Required role: {required_roles}. User role: {user_role}",
        )

    return True
