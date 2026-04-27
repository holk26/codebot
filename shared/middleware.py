"""FastAPI middleware for security headers and request logging."""
import logging
import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("security.audit")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # XSS protection
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Strict transport security (HTTPS only)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        
        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions policy
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # Content security policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'none'; "
            "script-src 'none'; "
            "style-src 'self'; "
            "img-src 'self'; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )
        
        # Remove server identification
        if "Server" in response.headers:
            del response.headers["Server"]
        
        return response


class AuditLogMiddleware(BaseHTTPMiddleware):
    """Log all requests for security audit."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        # Get real client IP (behind Traefik)
        client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
        
        response = await call_next(request)
        
        duration = time.time() - start_time
        
        logger.info(
            "request",
            extra={
                "method": request.method,
                "path": request.url.path,
                "client_ip": client_ip.split(",")[0].strip(),
                "user_agent": request.headers.get("user-agent", "unknown"),
                "status_code": response.status_code,
                "duration_ms": round(duration * 1000, 2),
            }
        )
        
        return response
