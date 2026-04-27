"""Shared security utilities for both services."""
import hashlib
import hmac
import os
import secrets
import time
from typing import Optional

from fastapi import Request, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, HTTPBasic, HTTPBasicCredentials

# Service-to-service authentication
API_KEY_HEADER = "X-Internal-API-Key"
API_KEY = os.getenv("INTERNAL_API_KEY", "")

security_bearer = HTTPBearer(auto_error=False)


def verify_github_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify GitHub webhook HMAC-SHA256 signature."""
    if not secret:
        return False
    if not signature:
        return False
    expected = "sha256=" + hmac.new(
        secret.encode("utf-8"),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def require_internal_api_key(credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)) -> None:
    """Dependency to enforce internal API key on sensitive endpoints."""
    if not API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal API key not configured"
        )
    
    # Check custom header first (for service-to-service)
    # Then fallback to Authorization header
    provided_key = None
    if credentials:
        provided_key = credentials.credentials
    
    if not provided_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing internal API key",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if not secrets.compare_digest(provided_key, API_KEY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid internal API key"
        )


def rate_limit_key(request: Request) -> str:
    """Generate a key for rate limiting based on client IP."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "unknown"
    return client_ip


class SimpleRateLimiter:
    """Simple in-memory rate limiter. Use Redis in production for distributed setups."""
    
    def __init__(self, max_requests: int = 30, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._store: dict = {}
    
    def is_allowed(self, key: str) -> bool:
        now = time.time()
        window_start = now - self.window_seconds
        
        # Clean old entries
        if key in self._store:
            self._store[key] = [t for t in self._store[key] if t > window_start]
        else:
            self._store[key] = []
        
        if len(self._store[key]) >= self.max_requests:
            return False
        
        self._store[key].append(now)
        return True


# Global rate limiter instance
rate_limiter = SimpleRateLimiter(max_requests=30, window_seconds=60)


# ============================================
# WEB BASIC AUTH (for OpenCode exposed to internet)
# ============================================
WEB_AUTH_USER = os.getenv("OPENCODE_WEB_USER", "admin")
WEB_AUTH_PASSWORD = os.getenv("OPENCODE_WEB_PASSWORD", "")

http_basic = HTTPBasic(auto_error=False)


def require_web_auth(credentials: Optional[HTTPBasicCredentials] = Security(http_basic)) -> str:
    """Dependency to enforce HTTP Basic Auth on web-exposed endpoints."""
    if not WEB_AUTH_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Web password not configured. Set OPENCODE_WEB_PASSWORD in .env"
        )
    
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Basic"}
        )
    
    username_correct = secrets.compare_digest(credentials.username, WEB_AUTH_USER)
    password_correct = secrets.compare_digest(credentials.password, WEB_AUTH_PASSWORD)
    
    if not (username_correct and password_correct):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Basic"}
        )
    
    return credentials.username
