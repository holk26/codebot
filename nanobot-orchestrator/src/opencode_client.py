"""Client for native OpenCode server REST API."""
import logging
from typing import Dict, Any, Optional

import httpx

from src.config import settings

logger = logging.getLogger(__name__)


class OpenCodeClient:
    """Client to communicate with the native opencode serve HTTP API."""
    
    def __init__(self):
        self.base_url = settings.OPCODE_API_URL.rstrip("/")
        self.auth = (
            settings.OPENCODE_SERVER_USERNAME,
            settings.OPENCODE_SERVER_PASSWORD
        )
        self.timeout = 600.0  # 10 minutes for long agent operations
        self.headers = {"Content-Type": "application/json"}
    
    async def health_check(self) -> bool:
        """Check if OpenCode server is healthy."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/global/health",
                    auth=self.auth,
                    timeout=5.0
                )
                return response.status_code == 200
        except Exception:
            return False
    
    async def create_session(self, title: str) -> Optional[str]:
        """Create a new opencode session. Returns session ID."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/session",
                    auth=self.auth,
                    headers=self.headers,
                    json={"title": title},
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()
                session_id = data.get("id")
                logger.info(f"Created opencode session: {session_id}")
                return session_id
        except Exception as e:
            logger.error(f"Failed to create session: {e}")
            return None
    
    async def init_project(
        self,
        session_id: str,
        provider_id: str = "moonshotai",
        model_id: Optional[str] = None
    ) -> bool:
        """Initialize project (creates AGENTS.md)."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/session/{session_id}/init",
                    auth=self.auth,
                    headers=self.headers,
                    json={
                        "providerID": provider_id,
                        "modelID": model_id or settings.OPENCODE_LLM_MODEL
                    },
                    timeout=60.0
                )
                response.raise_for_status()
                logger.info(f"Initialized project for session {session_id}")
                return True
        except Exception as e:
            logger.error(f"Failed to init project: {e}")
            return False
    
    async def send_message(
        self,
        session_id: str,
        message: str,
        model: Optional[str] = None,
        agent: str = "build"
    ) -> Dict[str, Any]:
        """Send a message to opencode and wait for response (blocking)."""
        try:
            async with httpx.AsyncClient() as client:
                logger.info(f"Sending message to session {session_id}")
                response = await client.post(
                    f"{self.base_url}/session/{session_id}/message",
                    auth=self.auth,
                    headers=self.headers,
                    json={
                        "parts": [{"type": "text", "text": message}],
                        "model": model or settings.OPENCODE_LLM_MODEL,
                        "agent": agent
                    },
                    timeout=self.timeout
                )
                response.raise_for_status()
                result = response.json()
                logger.info(f"Message completed for session {session_id}")
                return {"success": True, "data": result}
        except httpx.HTTPStatusError as e:
            logger.error(f"OpenCode HTTP error: {e.response.status_code} - {e.response.text}")
            return {"success": False, "error": f"HTTP {e.response.status_code}: {e.response.text}"}
        except httpx.RequestError as e:
            logger.error(f"OpenCode request error: {e}")
            return {"success": False, "error": f"Connection error: {str(e)}"}
        except Exception as e:
            logger.exception(f"Unexpected error calling OpenCode: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_diff(self, session_id: str) -> Dict[str, Any]:
        """Get file diff for a session."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/session/{session_id}/diff",
                    auth=self.auth,
                    timeout=30.0
                )
                response.raise_for_status()
                return {"success": True, "data": response.json()}
        except Exception as e:
            logger.error(f"Failed to get diff: {e}")
            return {"success": False, "error": str(e)}
    
    async def abort_session(self, session_id: str) -> bool:
        """Abort a running session."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/session/{session_id}/abort",
                    auth=self.auth,
                    timeout=10.0
                )
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to abort session: {e}")
            return False
    
    async def delete_session(self, session_id: str) -> bool:
        """Delete a session."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.base_url}/session/{session_id}",
                    auth=self.auth,
                    timeout=10.0
                )
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Failed to delete session: {e}")
            return False
