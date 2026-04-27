"""GitHub webhook receiver and validator (Hardened)."""
import json
import logging

from fastapi import APIRouter, Request, HTTPException, BackgroundTasks, status
from fastapi.responses import JSONResponse

from src.config import settings
from src.github_client import GitHubClient
from src.issue_analyzer import IssueAnalyzer
from src.opencode_client import OpenCodeClient
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
    """Process an issue event."""
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
        
        if analysis.get("requires_code_changes", False):
            # Delegate to OpenCode executor
            logger.info(f"Delegating issue #{issue_number} to OpenCode executor")
            
            result = await opencode.execute_task({
                "repo": repo_full_name,
                "issue_number": issue_number,
                "issue_title": full_issue.get("title", ""),
                "issue_body": full_issue.get("body", ""),
                "analysis": analysis,
                "task_type": "fix_issue"
            })
            
            # Report result
            if result.get("success"):
                pr_url = result.get("pr_url", "")
                github.comment_issue(
                    repo_full_name,
                    issue_number,
                    f"✅ **OpenCode** has generated a fix!\n\n"
                    f"**Changes:** {result.get('summary', 'See PR for details')}\n\n"
                    f"🔗 **Pull Request:** {pr_url if pr_url else 'No PR created'}\n\n"
                    f"_Review the changes and merge when ready._"
                )
                
                # Close issue if auto-close is enabled and fix is confident
                if analysis.get("auto_close", False) and pr_url:
                    github.close_issue(repo_full_name, issue_number, "Fixed by automated PR")
            else:
                github.comment_issue(
                    repo_full_name,
                    issue_number,
                    f"❌ **OpenCode** could not generate a fix automatically.\n\n"
                    f"**Reason:** {result.get('error', 'Unknown error')}\n\n"
                    f"_A human developer will need to address this issue._"
                )
        else:
            # Just classify/triage
            github.add_label(repo_full_name, issue_number, analysis.get("suggested_labels", []))
            
    except Exception as e:
        logger.exception(f"Error processing issue #{issue_number}: {e}")
        try:
            github.comment_issue(
                repo_full_name,
                issue_number,
                f"⚠️ **Error during processing:** {str(e)}\n\n"
                f"_Please check the agent logs for details._"
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
