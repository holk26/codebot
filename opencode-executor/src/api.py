"""API routes for OpenCode executor (Hardened)."""
import logging
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel

from src.executor import TaskExecutor
from src.config import settings
from shared.security import require_internal_api_key, rate_limiter, rate_limit_key

logger = logging.getLogger(__name__)
router = APIRouter()


class ExecuteRequest(BaseModel):
    """Request to execute a task."""
    repo: str
    issue_number: int
    issue_title: str
    issue_body: str
    analysis: Dict[str, Any]
    task_type: str


class ExecuteResponse(BaseModel):
    """Response from task execution."""
    success: bool
    summary: str = ""
    pr_url: str = ""
    error: str = ""
    changes: list = []


@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "opencode-executor"}


@router.get("/status")
async def get_status():
    return {
        "service": "opencode-executor",
        "workspace": settings.WORKSPACE_DIR,
        "model": settings.LLM_MODEL,
    }


@router.post("/execute", response_model=ExecuteResponse)
async def execute_task(request: ExecuteRequest, _=Depends(require_internal_api_key)):
    """Execute a code task delegated by Nanobot. Requires internal API key."""
    logger.info(f"Received execution request for issue #{request.issue_number}")
    
    try:
        executor = TaskExecutor()
        result = await executor.execute(request.dict())
        
        return ExecuteResponse(**result)
        
    except Exception as e:
        logger.exception(f"Task execution failed: {e}")
        return ExecuteResponse(
            success=False,
            error=str(e)
        )
