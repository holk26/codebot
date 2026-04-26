"""Issue analysis using LLM."""
import json
import logging
from typing import Dict, Any

import httpx

from src.config import settings

logger = logging.getLogger(__name__)


class IssueAnalyzer:
    """Analyzes GitHub issues to determine required actions."""
    
    def __init__(self):
        self.api_key = settings.LLM_API_KEY
        self.provider = settings.LLM_PROVIDER
        self.model = settings.LLM_MODEL
    
    async def analyze_issue(self, issue: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze an issue and determine if code changes are needed."""
        
        system_prompt = """You are an expert software engineering assistant. Analyze GitHub issues and determine the best course of action.

Respond ONLY with a JSON object in this exact format:
{
  "summary": "Brief description of the issue and what needs to be done",
  "issue_type": "bug|feature|documentation|question|other",
  "severity": "critical|high|medium|low",
  "requires_code_changes": true|false,
  "affected_areas": ["list", "of", "likely", "affected", "files", "or", "areas"],
  "suggested_labels": ["bug", "enhancement", "documentation", "good first issue", etc],
  "estimated_effort": "small|medium|large",
  "confidence": 0.0-1.0,
  "auto_close": false,
  "reasoning": "Brief explanation of your analysis"
}

Rules:
- Set requires_code_changes=true ONLY if the issue clearly describes a bug fix or feature request that needs code modification
- Set auto_close=true only for trivial fixes with very high confidence (e.g., typo fixes, documentation updates)
- severity should reflect impact on users
- Be conservative: when in doubt, set requires_code_changes=false and let humans decide"""

        user_prompt = f"""Please analyze this GitHub issue:

Title: {issue.get('title', 'No title')}
Body: {issue.get('body', 'No description')}
Labels: {', '.join(issue.get('labels', []))}
Author: {issue.get('user', 'Unknown')}
"""
        
        try:
            response = await self._call_llm(system_prompt, user_prompt)
            
            # Extract JSON from response
            json_str = self._extract_json(response)
            analysis = json.loads(json_str)
            
            # Ensure required fields
            analysis.setdefault("requires_code_changes", False)
            analysis.setdefault("summary", "No summary generated")
            analysis.setdefault("confidence", 0.5)
            
            return analysis
            
        except Exception as e:
            logger.error(f"LLM analysis failed: {e}")
            return {
                "summary": f"Failed to analyze: {str(e)}",
                "issue_type": "other",
                "severity": "medium",
                "requires_code_changes": False,
                "affected_areas": [],
                "suggested_labels": [],
                "estimated_effort": "unknown",
                "confidence": 0.0,
                "auto_close": False,
                "reasoning": "Analysis failed, defaulting to human review"
            }
    
    async def _call_llm(self, system_prompt: str, user_prompt: str) -> str:
        """Call LLM API based on configured provider."""
        
        if self.provider in ("openrouter", "openai"):
            return await self._call_openai_compatible(system_prompt, user_prompt)
        elif self.provider == "anthropic":
            return await self._call_anthropic(system_prompt, user_prompt)
        else:
            # Default to OpenAI-compatible
            return await self._call_openai_compatible(system_prompt, user_prompt)
    
    async def _call_openai_compatible(self, system_prompt: str, user_prompt: str) -> str:
        """Call OpenAI-compatible API."""
        base_url = "https://openrouter.ai/api/v1" if self.provider == "openrouter" else "https://api.openai.com/v1"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://github.com/nanobot-orchestrator",
                    "X-Title": "Nanobot Orchestrator"
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.2,
                    "max_tokens": 1000
                },
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    
    async def _call_anthropic(self, system_prompt: str, user_prompt: str) -> str:
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
                    "max_tokens": 1000,
                    "system": system_prompt,
                    "messages": [
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.2
                },
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            return data["content"][0]["text"]
    
    def _extract_json(self, text: str) -> str:
        """Extract JSON from LLM response."""
        text = text.strip()
        
        # Try to find JSON in code blocks
        if "```json" in text:
            start = text.find("```json") + 7
            end = text.find("```", start)
            return text[start:end].strip()
        elif "```" in text:
            start = text.find("```") + 3
            end = text.find("```", start)
            return text[start:end].strip()
        
        # Try to find JSON object directly
        if text.startswith("{") and text.endswith("}"):
            return text
        
        # Find first { and last }
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            return text[start:end+1]
        
        raise ValueError("No JSON found in response")
