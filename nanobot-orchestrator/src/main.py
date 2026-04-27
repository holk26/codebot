"""
Nanobot Orchestrator - Main Entry Point (Hardened)
Controls the OpenCode executor to react to GitHub issues.
"""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from src.config import settings
from src.webhook_server import router as webhook_router
from src.task_queue import TaskQueue
from src.worker import IssueWorker
from shared.middleware import SecurityHeadersMiddleware, AuditLogMiddleware

# Configure structured logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# Security audit logger
audit_logger = logging.getLogger("security.audit")
audit_logger.setLevel(logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan."""
    task_queue = TaskQueue()
    worker = IssueWorker(task_queue)
    app.state.task_queue = task_queue
    app.state.worker = worker
    
    worker_task = asyncio.create_task(worker.run())
    yield
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="Nanobot Orchestrator",
    description="AI Agent orchestrator for GitHub issues",
    version="1.0.0",
    docs_url=None,      # Disable docs in production
    redoc_url=None,     # Disable ReDoc in production
    openapi_url=None,   # Disable OpenAPI schema in production
    lifespan=lifespan
)

# Security middleware
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(AuditLogMiddleware)

# CORS - restrict to nothing by default (webhooks don't need CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

app.include_router(webhook_router, prefix="/webhook", tags=["webhooks"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "nanobot-orchestrator"}


@app.get("/")
async def root():
    return {
        "service": "nanobot-orchestrator",
        "version": "1.0.0",
        "description": "Orchestrates OpenCode executor to handle GitHub issues"
    }


if __name__ == "__main__":
    uvicorn.run(
        "src.main:app",
        host=settings.WEBHOOK_HOST,
        port=settings.WEBHOOK_PORT,
        log_level=settings.LOG_LEVEL.lower(),
        proxy_headers=True,
        forwarded_allow_ips="*"  # Trust Traefik forwarded headers
    )
