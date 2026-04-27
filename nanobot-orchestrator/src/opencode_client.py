"""Client for OpenCode executor service (with internal auth)."""
import logging
from typing import Dict, Any

import httpx

from src.config import settings
from shared.security import API_KEY_HEADER

logger = logging.getLogger(__name__)


class OpenCodeClient:
    """Client to communicate with the OpenCode executor service."""
    
    def __init__(self):
        self.base_url = settings.OPCODE_API_URL
        self.api_key = settings.INTERNAL_API_KEY
        self.timeout = 300.0  # 5 minutes for long operations
        self.headers = {
            "Content-Type": "application/json",
            API_KEY_HEADER: self.api_key
        }
    
    async def execute_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Send a task to the OpenCode executor."""
        try:
            async with httpx.AsyncClient() as client:
                logger.info(f"Sending task to OpenCode executor: {task.get('task_type')}")
                
                response = await client.post(
                    f"{self.base_url}/execute",
                    json=task,
                    headers=self.headers,
                    timeout=self.timeout
                )
                response.raise_for_status()
                
                result = response.json()
                logger.info(f"OpenCode executor result: {result.get('success')}")
                return result
                
        except httpx.HTTPStatusError as e:
            logger.error(f"OpenCode executor HTTP error: {e.response.status_code} - {e.response.text}")
            return {
                "success": False,
                "error": f"HTTP {e.response.status_code}: {e.response.text}"
            }
        except httpx.RequestError as e:
            logger.error(f"OpenCode executor request error: {e}")
            return {
                "success": False,
                "error": f"Connection error: {str(e)}"
            }
        except Exception as e:
            logger.exception(f"Unexpected error calling OpenCode executor: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def health_check(self) -> bool:
        """Check if OpenCode executor is healthy."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/health",
                    headers=self.headers,
                    timeout=5.0
                )
                return response.status_code == 200
        except Exception:
            return False
    
    async def get_status(self) -> Dict[str, Any]:
        """Get executor status."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/status",
                    headers=self.headers,
                    timeout=5.0
                )
                return response.json()
        except Exception as e:
            return {"error": str(e)}
