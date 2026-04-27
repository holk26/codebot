"""LLM client for reasoning and code generation (Moonshot compatible)."""
import json
import logging
from typing import Optional

import httpx

from src.config import settings

logger = logging.getLogger(__name__)


class LLMClient:
    """Client for LLM API calls."""
    
    def __init__(self):
        self.api_key = settings.LLM_API_KEY
        self.provider = settings.LLM_PROVIDER
        self.model = settings.LLM_MODEL
    
    async def call(self, system_prompt: str, user_prompt: str, temperature: float = 0.3) -> str:
        """Call the LLM with system and user prompts."""
        
        if self.provider == "anthropic":
            return await self._call_anthropic(system_prompt, user_prompt, temperature)
        elif self.provider == "moonshot":
            return await self._call_openai_compatible(system_prompt, user_prompt, temperature, "https://api.moonshot.cn/v1")
        else:
            return await self._call_openai_compatible(system_prompt, user_prompt, temperature)
    
    async def _call_openai_compatible(self, system_prompt: str, user_prompt: str, temperature: float, base_url: str = None) -> str:
        """Call OpenAI-compatible API (includes OpenRouter, Moonshot, OpenAI, DeepSeek)."""
        
        if base_url is None:
            if self.provider == "openrouter":
                base_url = "https://openrouter.ai/api/v1"
            elif self.provider == "deepseek":
                base_url = "https://api.deepseek.com/v1"
            else:
                base_url = "https://api.openai.com/v1"
        
        async with httpx.AsyncClient() as client:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            # Add OpenRouter-specific headers
            if self.provider == "openrouter":
                headers["HTTP-Referer"] = "https://github.com/opencode-executor"
                headers["X-Title"] = "OpenCode Executor"
            
            response = await client.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": temperature,
                    "max_tokens": 4000
                },
                timeout=120.0
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    
    async def _call_anthropic(self, system_prompt: str, user_prompt: str, temperature: float) -> str:
        """Call Anthropic API."""
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.api_key,
                    "Content-Type": "application/json",
                    "anthropic-version": "2023-06-01"
                },
                json={
                    "model": self.model,
                    "max_tokens": 4000,
                    "system": system_prompt,
                    "messages": [
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": temperature
                },
                timeout=120.0
            )
            response.raise_for_status()
            data = response.json()
            return data["content"][0]["text"]
