"""
Dashboard API endpoints for the NanoBot Console frontend.
Provides real-time stats, health, logs, and task information.
"""
import asyncio
import logging
import os
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse

from src.config import settings
from src.task_queue import TaskQueue
from src.opencode_client import OpenCodeClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# In-memory log buffer for the dashboard (last 1000 lines)
# Production should use Redis or a proper log aggregation
MAX_LOG_BUFFER = 1000
_log_buffer: List[Dict[str, Any]] = []
_startup_time = time.time()


def add_log_entry(level: str, process: str, message: str, stack_trace: Optional[str] = None):
    """Add a log entry to the dashboard buffer."""
    global _log_buffer
    entry = {
        "id": len(_log_buffer) + 1,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": level,
        "process": process,
        "message": message,
        "stackTrace": stack_trace,
    }
    _log_buffer.append(entry)
    if len(_log_buffer) > MAX_LOG_BUFFER:
        _log_buffer = _log_buffer[-MAX_LOG_BUFFER:]


class DashboardLogHandler(logging.Handler):
    """Custom logging handler that feeds logs to the dashboard buffer."""

    def emit(self, record: logging.LogRecord):
        try:
            level = record.levelname
            # Map logger names to process names
            name = record.name
            if "webhook" in name:
                process = "webhook"
            elif "worker" in name:
                process = "worker"
            elif "opencode" in name:
                process = "opencode"
            elif "github" in name:
                process = "github"
            elif "security" in name:
                process = "security"
            elif "task_queue" in name:
                process = "queue"
            else:
                process = "agent"

            msg = self.format(record)
            # Only capture INFO and above for dashboard to avoid noise
            if record.levelno >= logging.INFO:
                add_log_entry(level, process, msg)
        except Exception:
            self.handleError(record)


def install_dashboard_logging():
    """Install the dashboard log handler into the root logger."""
    handler = DashboardLogHandler()
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter("%(message)s")
    handler.setFormatter(formatter)
    logging.getLogger().addHandler(handler)


@router.get("/health")
async def dashboard_health(request: Request):
    """Comprehensive health check for all services."""
    opencode = OpenCodeClient()
    opencode_healthy = await opencode.health_check()

    # Check Redis
    redis_healthy = False
    try:
        queue = TaskQueue()
        queue.redis_client.ping()
        redis_healthy = True
    except Exception:
        pass

    uptime_seconds = int(time.time() - _startup_time)
    uptime_str = _format_uptime(uptime_seconds)

    return {
        "status": "ok" if opencode_healthy and redis_healthy else "degraded",
        "services": {
            "nanobot": {"status": "ok", "uptime": uptime_str, "uptime_seconds": uptime_seconds},
            "opencode": {"status": "ok" if opencode_healthy else "error"},
            "redis": {"status": "ok" if redis_healthy else "error"},
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/stats")
async def dashboard_stats(request: Request):
    """Get current system stats for the dashboard."""
    # Queue stats
    queue_len = 0
    try:
        queue = TaskQueue()
        queue_len = queue.get_length()
    except Exception:
        pass

    # Memory info from /proc (Linux only)
    memory_info = _get_memory_info()

    # Process info
    process_info = _get_process_info()

    return {
        "memory": memory_info,
        "queue": {"pending": queue_len},
        "processes": process_info,
        "config": {
            "provider": settings.NANOBOT_LLM_PROVIDER,
            "model": settings.NANOBOT_LLM_MODEL,
            "repo": settings.GITHUB_REPO,
            "logLevel": settings.LOG_LEVEL,
        },
        "version": "1.0.0",
    }


@router.get("/logs")
async def dashboard_logs(
    request: Request,
    level: Optional[str] = None,
    process: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
):
    """Get buffered log entries for the dashboard."""
    logs = _log_buffer

    if level and level != "ALL":
        logs = [l for l in logs if l["level"] == level]
    if process and process != "ALL":
        logs = [l for l in logs if l["process"] == process]

    total = len(logs)
    paginated = logs[-(offset + limit):-offset if offset > 0 else None]
    if offset == 0:
        paginated = logs[-limit:]

    return {
        "logs": paginated,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/tasks")
async def dashboard_tasks(request: Request):
    """Get current task queue status."""
    queue_len = 0
    try:
        queue = TaskQueue()
        queue_len = queue.get_length()
    except Exception:
        pass

    return {
        "pending": queue_len,
        "recent": [],  # Could be populated from Redis history
    }


@router.post("/tasks/trigger")
async def trigger_task(request: Request):
    """Manually trigger a fix-issue task from the dashboard."""
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    repo = data.get("repo", settings.GITHUB_REPO)
    issue_number = data.get("issue_number")
    issue_title = data.get("issue_title", "")
    issue_body = data.get("issue_body", "")

    if not issue_number:
        raise HTTPException(status_code=400, detail="issue_number is required")

    try:
        queue = TaskQueue()
        queue.enqueue({
            "task_type": "fix_issue",
            "repo": repo,
            "issue_number": issue_number,
            "issue_title": issue_title,
            "issue_body": issue_body,
        })
        return {"status": "queued", "message": f"Task for issue #{issue_number} queued"}
    except Exception as e:
        logger.error(f"Failed to queue task: {e}")
        raise HTTPException(status_code=500, detail="Failed to queue task")


def _format_uptime(seconds: int) -> str:
    """Format uptime in human-readable form."""
    days, remainder = divmod(seconds, 86400)
    hours, remainder = divmod(remainder, 3600)
    minutes, secs = divmod(remainder, 60)
    parts = []
    if days > 0:
        parts.append(f"{days}d")
    if hours > 0:
        parts.append(f"{hours}h")
    if minutes > 0:
        parts.append(f"{minutes}m")
    if not parts:
        parts.append(f"{secs}s")
    return " ".join(parts)


def _get_memory_info() -> Dict[str, Any]:
    """Get memory info from /proc/meminfo (Linux)."""
    try:
        with open("/proc/meminfo", "r") as f:
            lines = f.readlines()
        mem_total = 0
        mem_available = 0
        for line in lines:
            if line.startswith("MemTotal:"):
                mem_total = int(line.split()[1]) * 1024
            elif line.startswith("MemAvailable:"):
                mem_available = int(line.split()[1]) * 1024
        mem_used = mem_total - mem_available
        percent = round((mem_used / mem_total) * 100, 1) if mem_total > 0 else 0
        return {
            "total": mem_total,
            "used": mem_used,
            "available": mem_available,
            "percent": percent,
            "total_gb": round(mem_total / (1024 ** 3), 1),
            "used_gb": round(mem_used / (1024 ** 3), 1),
        }
    except Exception:
        return {"total": 0, "used": 0, "available": 0, "percent": 0, "total_gb": 0, "used_gb": 0}


def _get_process_info() -> Dict[str, Any]:
    """Get basic process info."""
    try:
        import psutil
        proc = psutil.Process()
        mem_mb = proc.memory_info().rss // (1024 * 1024)
        cpu_percent = proc.cpu_percent(interval=0.1)
        return {
            "pid": proc.pid,
            "cpu_percent": round(cpu_percent, 1),
            "memory_mb": mem_mb,
        }
    except ImportError:
        # Fallback without psutil
        return {"pid": os.getpid(), "cpu_percent": 0, "memory_mb": 0}
