"""Git operations for the orchestrator."""
import asyncio
import logging
import subprocess
from typing import Dict, Any, Optional

from github import Github

from src.config import settings

logger = logging.getLogger(__name__)


class GitManager:
    """Manages Git operations in the shared workspace."""
    
    def __init__(self):
        self.github = Github(settings.GITHUB_TOKEN)
    
    async def clone_repo(self, repo_full_name: str, repo_dir: str) -> bool:
        """Clone a repository to the workspace."""
        def _clone():
            try:
                # Check if already cloned
                result = subprocess.run(
                    ["git", "-C", repo_dir, "status"],
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0:
                    logger.info(f"Repo already cloned at {repo_dir}, pulling latest")
                    subprocess.run(
                        ["git", "pull"],
                        cwd=repo_dir,
                        check=True,
                        capture_output=True
                    )
                    return True
            except Exception:
                pass
            
            try:
                url = f"https://{settings.GITHUB_TOKEN}@github.com/{repo_full_name}.git"
                subprocess.run(
                    ["git", "clone", url, repo_dir],
                    check=True,
                    capture_output=True
                )
                logger.info(f"Cloned {repo_full_name} to {repo_dir}")
                return True
            except subprocess.CalledProcessError as e:
                logger.error(f"Failed to clone repo: {e.stderr.decode() if e.stderr else str(e)}")
                return False
        
        return await asyncio.to_thread(_clone)
    
    async def create_branch(self, repo_dir: str, branch_name: str) -> bool:
        """Create and checkout a new branch."""
        def _create():
            try:
                subprocess.run(
                    ["git", "checkout", "-b", branch_name],
                    cwd=repo_dir,
                    check=True,
                    capture_output=True
                )
                logger.info(f"Created branch: {branch_name}")
                return True
            except subprocess.CalledProcessError as e:
                logger.error(f"Failed to create branch: {e.stderr.decode() if e.stderr else str(e)}")
                return False
        
        return await asyncio.to_thread(_create)
    
    async def commit_changes(self, repo_dir: str, message: str) -> bool:
        """Stage and commit all changes."""
        def _commit():
            try:
                # Configure git
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
                if "nothing to commit" in stderr.lower() or "working tree clean" in stderr.lower():
                    logger.info("No changes to commit")
                    return True
                logger.error(f"Failed to commit: {stderr}")
                return False
        
        return await asyncio.to_thread(_commit)
    
    async def push_branch(self, repo_dir: str, branch_name: str) -> bool:
        """Push branch to remote."""
        def _push():
            try:
                # Ensure remote URL has token
                result = subprocess.run(
                    ["git", "remote", "get-url", "origin"],
                    cwd=repo_dir,
                    capture_output=True,
                    text=True,
                    check=True
                )
                repo_url = result.stdout.strip()
                
                if "github.com" in repo_url and "x-access-token" not in repo_url and settings.GITHUB_TOKEN:
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
        
        return await asyncio.to_thread(_push)
    
    def get_default_branch(self, repo_full_name: str) -> str:
        """Get the default branch of a repository."""
        try:
            repo = self.github.get_repo(repo_full_name)
            return repo.default_branch
        except Exception as e:
            logger.error(f"Failed to get default branch: {e}")
            return "main"
    
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
