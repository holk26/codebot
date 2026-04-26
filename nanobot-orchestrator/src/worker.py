"""Background worker for processing issues."""
import asyncio
import logging
from typing import Dict, Any

from src.task_queue import TaskQueue
from src.github_client import GitHubClient
from src.issue_analyzer import IssueAnalyzer
from src.opencode_client import OpenCodeClient
from src.config import settings

logger = logging.getLogger(__name__)


class IssueWorker:
    """Background worker that processes queued issues."""
    
    def __init__(self, task_queue: TaskQueue):
        self.task_queue = task_queue
        self.github = GitHubClient()
        self.analyzer = IssueAnalyzer()
        self.opencode = OpenCodeClient()
        self.running = False
    
    async def run(self):
        """Main worker loop."""
        self.running = True
        logger.info("Issue worker started")
        
        while self.running:
            try:
                task = self.task_queue.dequeue(timeout=5)
                if task:
                    await self.process_task(task)
                else:
                    await asyncio.sleep(1)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.exception(f"Worker error: {e}")
                await asyncio.sleep(5)
        
        logger.info("Issue worker stopped")
    
    async def process_task(self, task: Dict[str, Any]):
        """Process a single task from the queue."""
        task_type = task.get("task_type", "unknown")
        logger.info(f"Processing task: {task_type}")
        
        if task_type == "fix_issue":
            await self._process_fix_issue(task)
        elif task_type == "analyze_issue":
            await self._process_analyze_issue(task)
        else:
            logger.warning(f"Unknown task type: {task_type}")
    
    async def _process_fix_issue(self, task: Dict[str, Any]):
        """Process a fix issue task."""
        repo = task.get("repo")
        issue_number = task.get("issue_number")
        
        try:
            result = await self.opencode.execute_task(task)
            
            if result.get("success"):
                pr_url = result.get("pr_url", "")
                self.github.comment_issue(
                    repo, issue_number,
                    f"✅ **OpenCode** has generated a fix!\n\n"
                    f"**Changes:** {result.get('summary', 'See PR for details')}\n\n"
                    f"🔗 **Pull Request:** {pr_url if pr_url else 'No PR created'}"
                )
            else:
                self.github.comment_issue(
                    repo, issue_number,
                    f"❌ **OpenCode** could not generate a fix automatically.\n\n"
                    f"**Reason:** {result.get('error', 'Unknown error')}"
                )
        except Exception as e:
            logger.exception(f"Error processing fix_issue task: {e}")
    
    async def _process_analyze_issue(self, task: Dict[str, Any]):
        """Process an analyze issue task."""
        repo = task.get("repo")
        issue_number = task.get("issue_number")
        
        try:
            issue = self.github.get_issue(repo, issue_number)
            analysis = await self.analyzer.analyze_issue(issue)
            
            labels = analysis.get("suggested_labels", [])
            if labels:
                self.github.add_label(repo, issue_number, labels)
                
        except Exception as e:
            logger.exception(f"Error processing analyze_issue task: {e}")
    
    def stop(self):
        """Stop the worker."""
        self.running = False
