"""
Nanobot Orchestrator - Main Entry Point
Controls the OpenCode executor to react to GitHub issues.
"""
import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
import uvicorn

from src.config import settings
from src.webhook_server import router as webhook_router
from src.task_queue import TaskQueue
from src.worker import IssueWorker


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan."""
    # Startup
    task_queue = TaskQueue()
    worker = IssueWorker(task_queue)
    app.state.task_queue = task_queue
    app.state.worker = worker
    
    worker_task = asyncio.create_task(worker.run())
    yield
    # Shutdown
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="Nanobot Orchestrator",
    description="AI Agent orchestrator for GitHub issues",
    version="1.0.0",
    lifespan=lifespan
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
        log_level=settings.LOG_LEVEL.lower()
    )
