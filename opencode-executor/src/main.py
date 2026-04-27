"""OpenCode Executor - Main Entry Point (Hardened)
Service that executes code changes controlled by Nanobot.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from src.config import settings
from src.api import router
from shared.middleware import SecurityHeadersMiddleware, AuditLogMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan."""
    # Validate critical security config
    if not settings.INTERNAL_API_KEY:
        raise RuntimeError("INTERNAL_API_KEY must be configured. Exiting.")
    if not settings.GITHUB_TOKEN:
        raise RuntimeError("GITHUB_TOKEN must be configured. Exiting.")
    yield


app = FastAPI(
    title="OpenCode Executor",
    description="Code execution service for AI agents",
    version="1.0.0",
    docs_url=None,      # Disable docs in production
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan
)

# Security middleware
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(AuditLogMiddleware)

# CORS - no external origins allowed (internal service only)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

app.include_router(router, prefix="", tags=["executor"])


if __name__ == "__main__":
    uvicorn.run(
        "src.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        log_level=settings.LOG_LEVEL.lower(),
        proxy_headers=True,
        forwarded_allow_ips="*"
    )
