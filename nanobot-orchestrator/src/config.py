"""Configuration settings for nanobot orchestrator (Hardened)."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path("/app/.env")
if env_path.exists():
    load_dotenv(env_path)
load_dotenv()


class Settings:
    """Application settings."""
    
    # GitHub
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    GITHUB_WEBHOOK_SECRET: str = os.getenv("GITHUB_WEBHOOK_SECRET", "")
    GITHUB_REPO: str = os.getenv("GITHUB_REPO", "")
    GITHUB_APP_ID: str = os.getenv("GITHUB_APP_ID", "")
    GITHUB_PRIVATE_KEY: str = os.getenv("GITHUB_PRIVATE_KEY", "")
    
    # LLM
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "openrouter")
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "anthropic/claude-opus-4")
    
    # OpenCode Executor
    OPCODE_API_URL: str = os.getenv("OPCODE_API_URL", "http://opencode-executor:8001")
    
    # Internal Service Auth
    INTERNAL_API_KEY: str = os.getenv("INTERNAL_API_KEY", "")
    
    # Webhook Server
    WEBHOOK_PORT: int = int(os.getenv("WEBHOOK_PORT", "8080"))
    WEBHOOK_HOST: str = os.getenv("WEBHOOK_HOST", "0.0.0.0")
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")
    REDIS_PASSWORD: str = os.getenv("REDIS_PASSWORD", "")
    
    # Workspace
    WORKSPACE_DIR: str = os.getenv("WORKSPACE_DIR", "/workspace")
    
    # Security
    ALLOWED_ACTIONS: set = set(os.getenv("ALLOWED_ACTIONS", "opened,reopened").split(","))
    SKIP_LABEL: str = os.getenv("SKIP_LABEL", "agent-skip")
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Nanobot
    NANOBOT_CONFIG_PATH: str = os.getenv("NANOBOT_CONFIG_PATH", "/app/config/nanobot.json")


settings = Settings()
