"""GitHub webhook receiver and validator (Hardened)."""
import asyncio
import json
import logging
import os
import subprocess

from fastapi import APIRouter, Request, HTTPException, BackgroundTasks, status
from fastapi.responses import JSONResponse

from src.config import settings
from src.github_client import GitHubClient
from src.issue_analyzer import IssueAnalyzer
from src.opencode_client import OpenCodeClient
from src.git_manager import GitManager
from shared.security import verify_github_signature, rate_limiter, rate_limit_key

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/github")
async def github_webhook(request: Request, background_tasks: BackgroundTasks):
    """Receive GitHub webhook events."""
    
    # Rate limiting per IP
    client_key = rate_limit_key(request)
    if not rate_limiter.is_allowed(f"webhook:{client_key}"):
        logger.warning(f"Rate limit exceeded for {client_key}")
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded")
    
    payload = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")
    event_type = request.headers.get("X-GitHub-Event", "")
    
    # Verify signature - MANDATORY
    if not verify_github_signature(payload, signature, settings.GITHUB_WEBHOOK_SECRET):
        logger.warning(f"Invalid webhook signature from {client_key}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")
    
    data = json.loads(payload)
    
    if event_type == "issues":
        action = data.get("action", "")
        if action in settings.ALLOWED_ACTIONS:
            background_tasks.add_task(handle_issue_event, data)
        else:
            logger.info(f"Ignoring issue action: {action}")
    elif event_type == "issue_comment":
        action = data.get("action", "")
        if action in ("created", "edited"):
            background_tasks.add_task(handle_issue_comment_event, data)
    elif event_type == "ping":
        return JSONResponse({"status": "pong"})
    
    return JSONResponse({"status": "accepted"})


async def handle_issue_event(data: dict):
    """Process an issue event by delegating to native opencode server."""
    issue = data.get("issue", {})
    issue_number = issue.get("number")
    repo_full_name = data.get("repository", {}).get("full_name", settings.GITHUB_REPO)
    
    logger.info(f"Processing issue #{issue_number} in {repo_full_name}")
    
    # Skip if label present
    labels = [l.get("name", "").lower() for l in issue.get("labels", [])]
    if settings.SKIP_LABEL.lower() in labels:
        logger.info(f"Skipping issue #{issue_number} due to skip label")
        return
    
    # Skip pull requests (GitHub treats PRs as issues)
    if "pull_request" in issue:
        logger.info(f"Skipping PR #{issue_number}")
        return
    
    github = GitHubClient()
    analyzer = IssueAnalyzer()
    opencode = OpenCodeClient()
    git = GitManager()
    
    try:
        # Get full issue details
        full_issue = github.get_issue(repo_full_name, issue_number)
        
        # Analyze issue
        analysis = await analyzer.analyze_issue(full_issue)
        logger.info(f"Issue #{issue_number} analysis: {analysis}")
        
        # Post initial comment
        github.comment_issue(
            repo_full_name, 
            issue_number, 
            f"🤖 **Nanobot** analyzing this issue...\n\n"
            f"**Analysis:** {analysis.get('summary', 'Processing...')}\n\n"
            f"_This is an automated response. Add label `{settings.SKIP_LABEL}` to prevent agent intervention._"
        )
        
        if not analysis.get("requires_code_changes", False):
            # Just classify/triage
            github.add_label(repo_full_name, issue_number, analysis.get("suggested_labels", []))
            return
        
        # === DELEGATE TO NATIVE OPENCODE SERVER ===
        logger.info(f"Delegating issue #{issue_number} to OpenCode executor")
        
        # 1. Clone repository
        repo_dir = os.path.join(settings.WORKSPACE_DIR, repo_full_name.replace("/", "_"))
        if not git.clone_repo(repo_full_name, repo_dir):
            raise RuntimeError("Failed to clone repository")
        
        # 2. Create opencode session
        session_id = await opencode.create_session(title=f"Fix issue #{issue_number}: {full_issue.get('title', '')}")
        if not session_id:
            raise RuntimeError("Failed to create OpenCode session")
        
        try:
            # 3. Initialize project (creates AGENTS.md)
            await opencode.init_project(session_id)
            
            # 4. Create branch
            base_branch = git.get_default_branch(repo_full_name)
            branch_name = f"nanobot-fix-issue-{issue_number}"
            
            # Checkout base branch first
            await asyncio.to_thread(
                subprocess.run, ["git", "checkout", base_branch], cwd=repo_dir, check=False, capture_output=True
            )
            await asyncio.to_thread(
                subprocess.run, ["git", "pull", "origin", base_branch], cwd=repo_dir, check=False, capture_output=True
            )
            
            if not git.create_branch(repo_dir, branch_name):
                raise RuntimeError("Failed to create branch")
            
            # 5. Send fix request to opencode (blocking)
            prompt = (
                f"Fix GitHub issue #{issue_number} in repository {repo_full_name}.\n\n"
                f"**Title:** {full_issue.get('title', '')}\n\n"
                f"**Description:**\n{full_issue.get('body', '')}\n\n"
                f"The repository is cloned at {repo_dir}. "
                f"Please analyze the issue, make the necessary code changes, and ensure tests pass if they exist. "
                f"Do NOT create a git commit or push - that will be handled externally."
            )
            
            result = await opencode.send_message(session_id, prompt)
            
            if not result.get("success"):
                raise RuntimeError(f"OpenCode failed: {result.get('error', 'Unknown error')}")
            
            # 6. Commit changes
            commit_message = f"fix: {full_issue.get('title', f'Issue #{issue_number}')}"
            if not git.commit_changes(repo_dir, commit_message):
                logger.info("No changes to commit")
                github.comment_issue(
                    repo_full_name,
                    issue_number,
                    f"⚠️ **OpenCode** analyzed the issue but did not produce any code changes.\n\n"
                    f"_A human developer will need to address this issue._"
                )
                return
            
            # 7. Push branch
            if not git.push_branch(repo_dir, branch_name):
                raise RuntimeError("Failed to push branch")
            
            # 8. Create PR
            pr = git.create_pull_request(
                repo_full_name,
                title=f"Fix: {full_issue.get('title', f'Issue #{issue_number}')}",
                body=(
                    f"This PR fixes issue #{issue_number}.\n\n"
                    f"**Changes generated by OpenCode AI**\n\n"
                    f"{analysis.get('summary', '')}\n\n"
                    f"---\n"
                    f"_Automated fix by Nanobot + OpenCode_"
                ),
                head_branch=branch_name,
                base_branch=base_branch
            )
            
            # Report success
            github.comment_issue(
                repo_full_name,
                issue_number,
                f"✅ **OpenCode** has generated a fix!\n\n"
                f"**Changes:** {analysis.get('summary', 'See PR for details')}\n\n"
                f"🔗 **Pull Request:** {pr['html_url']}\n\n"
                f"_Review the changes and merge when ready._"
            )
            
            # Close issue if auto-close is enabled
            if analysis.get("auto_close", False):
                github.close_issue(repo_full_name, issue_number, f"Fixed by PR #{pr['number']}")
                
        finally:
            # Cleanup: delete session
            await opencode.delete_session(session_id)
            
    except Exception as e:
        logger.exception(f"Error processing issue #{issue_number}: {e}")
        try:
            github.comment_issue(
                repo_full_name,
                issue_number,
                f"❌ **OpenCode** could not generate a fix automatically.\n\n"
                f"**Reason:** {str(e)}\n\n"
                f"_A human developer will need to address this issue._"
            )
        except Exception:
            pass


async def handle_issue_comment_event(data: dict):
    """Process issue comment events (e.g., user replies to agent)."""
    comment = data.get("comment", {})
    issue = data.get("issue", {})
    
    # Skip bot comments
    if comment.get("user", {}).get("type") == "Bot":
        return
    
    body = comment.get("body", "")
    
    # Check for explicit agent commands
    if "@nanobot" in body.lower() or "@opencode" in body.lower():
        issue_number = issue.get("number")
        repo_full_name = data.get("repository", {}).get("full_name", settings.GITHUB_REPO)
        
        logger.info(f"Received explicit command on issue #{issue_number}")
        
        # Re-process the issue
        await handle_issue_event({
            "issue": issue,
            "repository": {"full_name": repo_full_name},
            "action": "reopened"
        })
