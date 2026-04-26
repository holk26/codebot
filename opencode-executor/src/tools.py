"""Tool implementations for code execution."""
import logging
import os
import subprocess
from typing import Optional

from src.config import settings

logger = logging.getLogger(__name__)


class ToolManager:
    """Manages tool execution with safety limits."""
    
    def __init__(self):
        self.call_count = 0
        self.allowed_paths = [settings.WORKSPACE_DIR]
    
    async def run_bash(self, command: str, cwd: str = None, timeout: int = 60) -> str:
        """Execute a bash command safely."""
        self.call_count += 1
        
        # Security: prevent dangerous commands
        dangerous = ["rm -rf /", "> /dev/sda", "mkfs", "dd if=/dev/zero", ":(){ :|:& };:"]
        for d in dangerous:
            if d in command:
                return f"ERROR: Dangerous command blocked: {d}"
        
        # Ensure cwd is within allowed paths
        if cwd and not any(str(cwd).startswith(p) for p in self.allowed_paths):
            return f"ERROR: Working directory {cwd} not in allowed paths"
        
        try:
            result = subprocess.run(
                command,
                shell=True,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            output = result.stdout
            if result.stderr:
                output += f"\nSTDERR:\n{result.stderr}"
            
            if result.returncode != 0:
                output += f"\nEXIT CODE: {result.returncode}"
            
            return output
            
        except subprocess.TimeoutExpired:
            return f"ERROR: Command timed out after {timeout}s"
        except Exception as e:
            return f"ERROR: {str(e)}"
    
    async def read_file(self, file_path: str) -> Optional[str]:
        """Read a file safely."""
        self.call_count += 1
        
        if not os.path.exists(file_path):
            return None
        
        if not any(str(file_path).startswith(p) for p in self.allowed_paths):
            logger.warning(f"Attempted to read file outside workspace: {file_path}")
            return None
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                # Limit size
                if len(content) > 500_000:
                    content = content[:500_000] + "\n... [truncated]"
                return content
        except Exception as e:
            logger.error(f"Failed to read {file_path}: {e}")
            return None
    
    async def write_file(self, file_path: str, content: str) -> bool:
        """Write a file safely."""
        self.call_count += 1
        
        if not any(str(file_path).startswith(p) for p in self.allowed_paths):
            logger.warning(f"Attempted to write file outside workspace: {file_path}")
            return False
        
        try:
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            logger.info(f"Wrote file: {file_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to write {file_path}: {e}")
            return False
    
    async def edit_file(self, file_path: str, old_string: str, new_string: str) -> bool:
        """Edit a file by replacing a string."""
        self.call_count += 1
        
        content = await self.read_file(file_path)
        if content is None:
            return False
        
        if old_string not in content:
            logger.warning(f"Old string not found in {file_path}")
            return False
        
        new_content = content.replace(old_string, new_string, 1)
        return await self.write_file(file_path, new_content)
