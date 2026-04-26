"""GitHub API client wrapper."""
import logging
from typing import List, Dict, Any, Optional

from github import Github
from github.Issue import Issue

from src.config import settings

logger = logging.getLogger(__name__)


class GitHubClient:
    """Client for GitHub API operations."""
    
    def __init__(self):
        if not settings.GITHUB_TOKEN:
            raise ValueError("GITHUB_TOKEN is not configured")
        self.github = Github(settings.GITHUB_TOKEN)
    
    def get_issue(self, repo_full_name: str, issue_number: int) -> Dict[str, Any]:
        """Get full issue details."""
        repo = self.github.get_repo(repo_full_name)
        issue = repo.get_issue(issue_number)
        
        return {
            "number": issue.number,
            "title": issue.title,
            "body": issue.body or "",
            "state": issue.state,
            "labels": [l.name for l in issue.labels],
            "user": issue.user.login if issue.user else None,
            "created_at": issue.created_at.isoformat() if issue.created_at else None,
            "updated_at": issue.updated_at.isoformat() if issue.updated_at else None,
            "comments_count": issue.comments,
            "html_url": issue.html_url,
        }
    
    def comment_issue(self, repo_full_name: str, issue_number: int, body: str) -> None:
        """Add a comment to an issue."""
        try:
            repo = self.github.get_repo(repo_full_name)
            issue = repo.get_issue(issue_number)
            issue.create_comment(body)
            logger.info(f"Commented on issue #{issue_number}")
        except Exception as e:
            logger.error(f"Failed to comment on issue #{issue_number}: {e}")
            raise
    
    def add_label(self, repo_full_name: str, issue_number: int, labels: List[str]) -> None:
        """Add labels to an issue."""
        if not labels:
            return
        try:
            repo = self.github.get_repo(repo_full_name)
            issue = repo.get_issue(issue_number)
            for label in labels:
                issue.add_to_labels(label)
            logger.info(f"Added labels {labels} to issue #{issue_number}")
        except Exception as e:
            logger.error(f"Failed to add labels to issue #{issue_number}: {e}")
    
    def close_issue(self, repo_full_name: str, issue_number: int, reason: str = "") -> None:
        """Close an issue."""
        try:
            repo = self.github.get_repo(repo_full_name)
            issue = repo.get_issue(issue_number)
            if reason:
                issue.create_comment(f"Closing: {reason}")
            issue.edit(state="closed")
            logger.info(f"Closed issue #{issue_number}")
        except Exception as e:
            logger.error(f"Failed to close issue #{issue_number}: {e}")
    
    def create_pull_request(
        self,
        repo_full_name: str,
        title: str,
        body: str,
        head_branch: str,
        base_branch: str = "main"
    ) -> Dict[str, Any]:
        """Create a pull request."""
        try:
            repo = self.github.get_repo(repo_full_name)
            pr = repo.create_pull(
                title=title,
                body=body,
                head=head_branch,
                base=base_branch
            )
            logger.info(f"Created PR #{pr.number}: {pr.html_url}")
            return {
                "number": pr.number,
                "html_url": pr.html_url,
                "title": pr.title,
            }
        except Exception as e:
            logger.error(f"Failed to create PR: {e}")
            raise
    
    def get_repo_default_branch(self, repo_full_name: str) -> str:
        """Get the default branch of a repository."""
        repo = self.github.get_repo(repo_full_name)
        return repo.default_branch
