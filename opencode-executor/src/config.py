"""Configuration for OpenCode executor (Hardened)."""
import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path("/app/.env")
if env_path.exists():
    load_dotenv(env_path)
load_dotenv()


class Settings:
    """OpenCode executor settings."""
    
    # LLM
    LLM_PROVIDER: str = os.getenv("OPENCODE_LLM_PROVIDER", "openrouter")
    LLM_API_KEY: str = os.getenv("OPENCODE_LLM_API_KEY", "")
    LLM_MODEL: str = os.getenv("OPENCODE_LLM_MODEL", "anthropic/claude-opus-4")
    
    # API
    API_PORT: int = int(os.getenv("OPENCODE_API_PORT", "8001"))
    API_HOST: str = os.getenv("OPENCODE_API_HOST", "0.0.0.0")
    
    # Internal Service Auth
    INTERNAL_API_KEY: str = os.getenv("INTERNAL_API_KEY", "")
    
    # GitHub
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    
    # Workspace
    WORKSPACE_DIR: str = os.getenv("WORKSPACE_DIR", "/workspace")
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "")
    
    # Limits
    MAX_TOOL_CALLS: int = int(os.getenv("MAX_TOOL_CALLS", "50"))
    MAX_EXECUTION_TIME: int = int(os.getenv("MAX_EXECUTION_TIME", "600"))  # seconds
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")


settings = Settings()
