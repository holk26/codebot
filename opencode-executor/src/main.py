"""OpenCode Executor - Main Entry Point
Service that executes code changes controlled by Nanobot.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
import uvicorn

from src.config import settings
from src.api import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan."""
    yield


app = FastAPI(
    title="OpenCode Executor",
    description="Code execution service for AI agents",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(router, prefix="", tags=["executor"])


if __name__ == "__main__":
    uvicorn.run(
        "src.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        log_level=settings.LOG_LEVEL.lower()
    )
