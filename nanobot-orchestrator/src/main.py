"""
Nanobot Orchestrator - Main Entry Point (Hardened)
Controls the OpenCode executor to react to GitHub issues.
"""
import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

from src.config import settings
from src.webhook_server import router as webhook_router
from src.task_queue import TaskQueue
from src.worker import IssueWorker
from src.github_client import GitHubClient
from src.issue_analyzer import IssueAnalyzer
from src.opencode_client import OpenCodeClient
from src.git_manager import GitManager
from src.dashboard import router as dashboard_router, install_dashboard_logging
from shared.middleware import SecurityHeadersMiddleware, AuditLogMiddleware
from shared.security import API_KEY_HEADER

# Configure structured logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
install_dashboard_logging()

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

# CORS - allow dashboard frontend (same origin in production, localhost for dev)
origins = os.getenv("DASHBOARD_CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins if o.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(webhook_router, prefix="/webhook", tags=["webhooks"])
app.include_router(dashboard_router)

# Serve React dashboard static files
static_dir = os.getenv("DASHBOARD_STATIC_DIR", "/app/static")
if os.path.isdir(static_dir):
    # Serve static files at root path - dashboard is the main UI
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="dashboard-static")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_dashboard_spa(full_path: str):
        """Serve index.html for SPA routes."""
        # Don't intercept API or webhook routes
        if full_path.startswith(("api", "webhook", "health")):
            raise HTTPException(status_code=404, detail="Not found")
        index_file = os.path.join(static_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Dashboard not built")
else:
    @app.get("/")
    async def root():
        return {
            "service": "nanobot-orchestrator",
            "version": "1.0.0",
            "description": "Orchestrates OpenCode executor to handle GitHub issues"
        }


def verify_internal_key(request: Request):
    """Verify the internal API key header."""
    key = request.headers.get(API_KEY_HEADER, "")
    if key != settings.INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return True


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "nanobot-orchestrator"}


@app.post("/api/fix-issue")
async def fix_issue(
    request: Request,
    background_tasks: BackgroundTasks,
    authorized: bool = Depends(verify_internal_key)
):
    """
    Trigger a fix for a GitHub issue.
    Used by the nanobot skill when users chat with the agent.
    """
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    
    repo = data.get("repo")
    issue_number = data.get("issue_number")
    issue_title = data.get("issue_title", "")
    issue_body = data.get("issue_body", "")
    
    if not repo or not issue_number:
        raise HTTPException(status_code=400, detail="repo and issue_number are required")
    
    # Run the fix in the background
    background_tasks.add_task(_run_fix, repo, issue_number, issue_title, issue_body)
    
    return JSONResponse({
        "status": "accepted",
        "message": f"Fix for issue #{issue_number} in {repo} has been queued"
    })


async def _run_fix(repo: str, issue_number: int, issue_title: str, issue_body: str):
    """Run the fix workflow (same as webhook but triggered via API)."""
    github = GitHubClient()
    opencode = OpenCodeClient()
    git = GitManager()
    
    try:
        # 1. Clone repository
        repo_dir = os.path.join(settings.WORKSPACE_DIR, repo.replace("/", "_"))
        if not git.clone_repo(repo, repo_dir):
            logger.error("Failed to clone repository")
            return
        
        # 2. Create opencode session
        session_id = await opencode.create_session(title=f"Fix issue #{issue_number}: {issue_title}")
        if not session_id:
            logger.error("Failed to create OpenCode session")
            return
        
        try:
            # 3. Initialize project
            await opencode.init_project(session_id)
            
            # 4. Create branch
            base_branch = git.get_default_branch(repo)
            branch_name = f"nanobot-fix-issue-{issue_number}"
            
            await asyncio.to_thread(
                subprocess.run, ["git", "checkout", base_branch], cwd=repo_dir, check=False, capture_output=True
            )
            await asyncio.to_thread(
                subprocess.run, ["git", "pull", "origin", base_branch], cwd=repo_dir, check=False, capture_output=True
            )
            
            if not git.create_branch(repo_dir, branch_name):
                logger.error("Failed to create branch")
                return
            
            # 5. Send fix request
            prompt = (
                f"Fix GitHub issue #{issue_number} in repository {repo}.\n\n"
                f"**Title:** {issue_title}\n\n"
                f"**Description:**\n{issue_body}\n\n"
                f"The repository is cloned at {repo_dir}. "
                f"Please analyze the issue, make the necessary code changes, and ensure tests pass if they exist. "
                f"Do NOT create a git commit or push - that will be handled externally."
            )
            
            result = await opencode.send_message(session_id, prompt)
            
            if not result.get("success"):
                logger.error(f"OpenCode failed: {result.get('error')}")
                return
            
            # 6. Commit and push
            if not git.commit_changes(repo_dir, f"fix: {issue_title or f'Issue #{issue_number}'}"):
                logger.info("No changes to commit")
                return
            
            if not git.push_branch(repo_dir, branch_name):
                logger.error("Failed to push branch")
                return
            
            # 7. Create PR
            pr = git.create_pull_request(
                repo,
                title=f"Fix: {issue_title or f'Issue #{issue_number}'}",
                body=f"This PR fixes issue #{issue_number}.\n\n_Automated fix by Nanobot + OpenCode_",
                head_branch=branch_name,
                base_branch=base_branch
            )
            
            logger.info(f"Created PR: {pr['html_url']}")
            
        finally:
            await opencode.delete_session(session_id)
            
    except Exception as e:
        logger.exception(f"Error in fix workflow: {e}")


if __name__ == "__main__":
    uvicorn.run(
        "src.main:app",
        host=settings.WEBHOOK_HOST,
        port=settings.WEBHOOK_PORT,
        log_level=settings.LOG_LEVEL.lower(),
        proxy_headers=True,
        forwarded_allow_ips="*"  # Trust Traefik forwarded headers
    )
