"""Git utilities for the executor."""
import logging
import os
from typing import Dict, Any

from github import Github

from src.config import settings

logger = logging.getLogger(__name__)


class GitManager:
    """Manages Git operations."""
    
    def __init__(self):
        self.github = Github(settings.GITHUB_TOKEN)
    
    async def create_branch(self, repo_dir: str, branch_name: str) -> bool:
        """Create and checkout a new branch."""
        import subprocess
        
        try:
            # Create branch
            subprocess.run(
                ["git", "checkout", "-b", branch_name],
                cwd=repo_dir,
                check=True,
                capture_output=True
            )
            logger.info(f"Created branch: {branch_name}")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to create branch: {e.stderr.decode()}")
            return False
    
    async def commit_changes(self, repo_dir: str, message: str) -> bool:
        """Stage and commit all changes."""
        import subprocess
        
        try:
            # Configure git if not already done
            subprocess.run(
                ["git", "config", "user.email", "agent@nanobot.local"],
                cwd=repo_dir,
                check=False,
                capture_output=True
            )
            subprocess.run(
                ["git", "config", "user.name", "Nanobot Agent"],
                cwd=repo_dir,
                check=False,
                capture_output=True
            )
            
            # Stage all changes
            subprocess.run(
                ["git", "add", "-A"],
                cwd=repo_dir,
                check=True,
                capture_output=True
            )
            
            # Commit
            subprocess.run(
                ["git", "commit", "-m", message],
                cwd=repo_dir,
                check=True,
                capture_output=True
            )
            
            logger.info(f"Committed changes: {message}")
            return True
            
        except subprocess.CalledProcessError as e:
            stderr = e.stderr.decode() if e.stderr else ""
            if "nothing to commit" in stderr.lower():
                logger.info("No changes to commit")
                return True
            logger.error(f"Failed to commit: {stderr}")
            return False
    
    async def push_branch(self, repo_dir: str, branch_name: str) -> bool:
        """Push branch to remote."""
        import subprocess
        
        try:
            # Set remote with token
            repo_url = subprocess.run(
                ["git", "remote", "get-url", "origin"],
                cwd=repo_dir,
                capture_output=True,
                text=True,
                check=True
            ).stdout.strip()
            
            # Replace URL with token auth if needed
            if "github.com" in repo_url and "x-access-token" not in repo_url:
                if repo_url.startswith("https://"):
                    new_url = repo_url.replace("https://", f"https://{settings.GITHUB_TOKEN}@")
                    subprocess.run(
                        ["git", "remote", "set-url", "origin", new_url],
                        cwd=repo_dir,
                        check=True,
                        capture_output=True
                    )
            
            subprocess.run(
                ["git", "push", "-u", "origin", branch_name],
                cwd=repo_dir,
                check=True,
                capture_output=True
            )
            
            logger.info(f"Pushed branch: {branch_name}")
            return True
            
        except subprocess.CalledProcessError as e:
            stderr = e.stderr.decode() if e.stderr else ""
            logger.error(f"Failed to push: {stderr}")
            return False
    
    def create_pull_request(
        self,
        repo_full_name: str,
        title: str,
        body: str,
        head_branch: str,
        base_branch: str = "main"
    ) -> Dict[str, Any]:
        """Create a pull request via GitHub API."""
        try:
            repo = self.github.get_repo(repo_full_name)
            
            # Determine default branch if not specified
            if base_branch == "main":
                base_branch = repo.default_branch
            
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
