"""Core task execution engine."""
import asyncio
import json
import logging
import os
import time
from typing import Dict, Any, List

from src.tools import ToolManager
from src.git_utils import GitManager
from src.llm_client import LLMClient
from src.config import settings

logger = logging.getLogger(__name__)


class TaskExecutor:
    """Executes code tasks using LLM reasoning and tools."""
    
    def __init__(self):
        self.tools = ToolManager()
        self.git = GitManager()
        self.llm = LLMClient()
        self.tool_calls = 0
        self.max_calls = settings.MAX_TOOL_CALLS
        self.start_time = None
    
    async def execute(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a task end-to-end."""
        self.start_time = time.time()
        self.tool_calls = 0
        
        repo = task["repo"]
        issue_number = task["issue_number"]
        issue_title = task["issue_title"]
        issue_body = task["issue_body"]
        analysis = task.get("analysis", {})
        
        logger.info(f"Starting execution for issue #{issue_number}: {issue_title}")
        
        try:
            # Setup workspace
            repo_dir = await self._setup_workspace(repo, issue_number)
            
            # Analyze codebase and plan changes
            plan = await self._create_plan(repo_dir, issue_title, issue_body, analysis)
            logger.info(f"Execution plan: {plan.get('summary', 'No summary')}")
            
            # Execute plan
            changes = await self._execute_plan(repo_dir, plan)
            
            if not changes:
                return {
                    "success": False,
                    "error": "No changes were generated",
                    "summary": "Could not determine necessary code changes"
                }
            
            # Create branch and commit
            branch_name = f"agent/fix-issue-{issue_number}"
            await self.git.create_branch(repo_dir, branch_name)
            await self.git.commit_changes(repo_dir, f"Fix issue #{issue_number}: {issue_title}")
            
            # Push and create PR
            await self.git.push_branch(repo_dir, branch_name)
            pr_info = self.git.create_pull_request(
                repo,
                title=f"Fix #{issue_number}: {issue_title}",
                body=self._generate_pr_body(issue_number, issue_title, issue_body, plan, changes),
                head_branch=branch_name
            )
            
            execution_time = time.time() - self.start_time
            logger.info(f"Task completed in {execution_time:.1f}s. PR: {pr_info.get('html_url', 'N/A')}")
            
            return {
                "success": True,
                "summary": plan.get("summary", "Changes applied"),
                "pr_url": pr_info.get("html_url", ""),
                "changes": changes,
                "execution_time": execution_time
            }
            
        except Exception as e:
            logger.exception(f"Task execution failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "summary": f"Execution failed: {str(e)}"
            }
    
    async def _setup_workspace(self, repo: str, issue_number: int) -> str:
        """Clone or update repository in workspace."""
        repo_name = repo.split("/")[1]
        repo_dir = os.path.join(settings.WORKSPACE_DIR, repo_name)
        
        if os.path.exists(repo_dir):
            logger.info(f"Updating existing repo at {repo_dir}")
            await self.tools.run_bash(f"cd {repo_dir} && git fetch origin && git reset --hard origin/main", repo_dir)
        else:
            logger.info(f"Cloning {repo} to {repo_dir}")
            await self.tools.run_bash(f"git clone https://{settings.GITHUB_TOKEN}@github.com/{repo}.git {repo_dir}", settings.WORKSPACE_DIR)
        
        return repo_dir
    
    async def _create_plan(self, repo_dir: str, title: str, body: str, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Create an execution plan using LLM."""
        
        # Get project structure
        structure = await self._get_project_structure(repo_dir)
        
        system_prompt = """You are an expert software engineer. Analyze the issue and create a precise plan to fix it.

Respond ONLY with a JSON object:
{
  "summary": "Brief description of what will be changed",
  "files_to_read": ["list of files to examine first"],
  "files_to_modify": [
    {"path": "relative/path", "action": "edit|create|delete", "reason": "why"}
  ],
  "tests_needed": true|false,
  "test_files": ["test files to create or modify"],
  "verification_commands": ["commands to run to verify the fix"]
}"""

        user_prompt = f"""Issue Title: {title}
Issue Body: {body}

Analysis: {json.dumps(analysis, indent=2)}

Project Structure:
{structure}

Create a fix plan. Be specific about file paths and changes needed."""
        
        response = await self.llm.call(system_prompt, user_prompt)
        
        try:
            plan = json.loads(self._extract_json(response))
            return plan
        except Exception:
            logger.warning("Failed to parse plan JSON, using fallback")
            return {
                "summary": "Manual fix required",
                "files_to_read": [],
                "files_to_modify": [],
                "tests_needed": False,
                "verification_commands": []
            }
    
    async def _execute_plan(self, repo_dir: str, plan: Dict[str, Any]) -> List[Dict[str, str]]:
        """Execute the plan step by step."""
        changes = []
        
        # Read files first
        files_to_read = plan.get("files_to_read", [])
        file_contents = {}
        
        for file_path in files_to_read[:10]:  # Limit to 10 files
            if self.tool_calls >= self.max_calls:
                break
            
            full_path = os.path.join(repo_dir, file_path)
            content = await self.tools.read_file(full_path)
            if content is not None:
                file_contents[file_path] = content
        
        # Modify files
        for mod in plan.get("files_to_modify", []):
            if self.tool_calls >= self.max_calls:
                logger.warning("Max tool calls reached, stopping")
                break
            
            file_path = mod.get("path", "")
            action = mod.get("action", "edit")
            full_path = os.path.join(repo_dir, file_path)
            
            if action == "create":
                # Generate content using LLM
                content = await self._generate_file_content(repo_dir, file_path, plan, file_contents)
                if content:
                    await self.tools.write_file(full_path, content)
                    changes.append({"file": file_path, "action": "created"})
            
            elif action == "edit":
                if file_path in file_contents or os.path.exists(full_path):
                    current = file_contents.get(file_path) or await self.tools.read_file(full_path)
                    new_content = await self._generate_edit(repo_dir, file_path, current, plan, file_contents)
                    if new_content and new_content != current:
                        await self.tools.write_file(full_path, new_content)
                        changes.append({"file": file_path, "action": "modified"})
            
            elif action == "delete":
                await self.tools.run_bash(f"rm {full_path}", repo_dir)
                changes.append({"file": file_path, "action": "deleted"})
        
        # Run verification commands
        for cmd in plan.get("verification_commands", [])[:3]:
            if self.tool_calls >= self.max_calls:
                break
            result = await self.tools.run_bash(cmd, repo_dir)
            logger.info(f"Verification '{cmd}': {result[:200]}...")
        
        return changes
    
    async def _generate_file_content(self, repo_dir: str, file_path: str, plan: Dict[str, Any], context: Dict[str, str]) -> str:
        """Generate content for a new file."""
        system_prompt = f"""You are writing code for a software project. Generate the complete content for the file.

Respond ONLY with the raw file content, no markdown code blocks, no explanations."""

        user_prompt = f"""Create file: {file_path}

Plan: {json.dumps(plan, indent=2)}

Related files context:
{json.dumps(context, indent=2)[:2000]}

Generate complete, production-ready file content."""
        
        response = await self.llm.call(system_prompt, user_prompt)
        # Strip markdown if present
        return self._strip_markdown(response, file_path)
    
    async def _generate_edit(self, repo_dir: str, file_path: str, current_content: str, plan: Dict[str, Any], context: Dict[str, str]) -> str:
        """Generate edited content for a file."""
        system_prompt = """You are editing code. Given the current file content and the issue description, produce the complete updated file content.

Respond ONLY with the raw updated file content, no markdown code blocks, no explanations.
Preserve the exact structure and indentation. Only change what is necessary to fix the issue."""

        user_prompt = f"""File: {file_path}

Current content:
```
{current_content[:4000]}
```

Plan: {json.dumps(plan, indent=2)}

Context from other files:
{json.dumps(context, indent=2)[:2000]}

Provide the complete updated file content."""
        
        response = await self.llm.call(system_prompt, user_prompt)
        return self._strip_markdown(response, file_path)
    
    async def _get_project_structure(self, repo_dir: str) -> str:
        """Get a summary of the project structure."""
        result = await self.tools.run_bash(
            f"cd {repo_dir} && find . -type f -not -path './.git/*' -not -path './node_modules/*' -not -path './venv/*' -not -path './__pycache__/*' | head -50",
            repo_dir
        )
        return result
    
    def _generate_pr_body(self, issue_number: int, title: str, body: str, plan: Dict[str, Any], changes: List[Dict[str, str]]) -> str:
        """Generate a pull request description."""
        changes_md = "\n".join([f"- `{c['file']}`: {c['action']}" for c in changes])
        
        return f"""## Summary
This PR fixes issue #{issue_number}: {title}

## Changes
{changes_md}

## Plan
{plan.get('summary', 'Automated fix generated by OpenCode executor')}

## Verification
{chr(10).join(['- `' + cmd + '`' for cmd in plan.get('verification_commands', [])]) or 'No verification commands configured.'}

## Original Issue
{body[:1000] if body else 'No description provided.'}

---
*This PR was automatically generated by the Nanobot + OpenCode agent system.*
"""
    
    def _extract_json(self, text: str) -> str:
        """Extract JSON from text."""
        text = text.strip()
        if text.startswith("{") and text.endswith("}"):
            return text
        
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            return text[start:end+1]
        
        return text
    
    def _strip_markdown(self, text: str, file_path: str) -> str:
        """Strip markdown code blocks from response."""
        text = text.strip()
        
        # Determine language for code block
        ext = os.path.splitext(file_path)[1].lower()
        lang_map = {
            '.py': 'python', '.js': 'javascript', '.ts': 'typescript',
            '.jsx': 'jsx', '.tsx': 'tsx', '.json': 'json',
            '.yaml': 'yaml', '.yml': 'yaml', '.md': 'markdown',
            '.sh': 'bash', '.bash': 'bash', '.go': 'go',
            '.rs': 'rust', '.java': 'java', '.c': 'c',
            '.cpp': 'cpp', '.h': 'c', '.html': 'html',
            '.css': 'css', '.sql': 'sql'
        }
        lang = lang_map.get(ext, '')
        
        # Remove code block markers
        if f"```{lang}" in text:
            start = text.find(f"```{lang}") + len(f"```{lang}")
            end = text.find("```", start)
            return text[start:end].strip()
        elif "```" in text:
            start = text.find("```") + 3
            if text[start:].startswith(lang):
                start += len(lang)
            end = text.find("```", start)
            if end != -1:
                return text[start:end].strip()
        
        return text
