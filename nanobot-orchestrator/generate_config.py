#!/usr/bin/env python3
"""Generate nanobot config.json from environment variables."""
import json
import os
from pathlib import Path

CONFIG_DIR = Path(os.getenv("HOME", "/home/appuser")) / ".nanobot"
CONFIG_FILE = CONFIG_DIR / "config.json"

def get_env(key, default=""):
    """Get environment variable with default."""
    return os.getenv(key, default)

def main():
    print("[config-generator] Generating nanobot config...")
    
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    
    # Build providers dict (only include if API key is set)
    providers = {}
    
    moonshot_key = get_env("MOONSHOT_API_KEY")
    if moonshot_key:
        providers["moonshot"] = {
            "apiKey": moonshot_key,
            "baseUrl": "https://api.moonshot.ai/v1"
        }
    
    openrouter_key = get_env("OPENROUTER_API_KEY")
    if openrouter_key:
        providers["openrouter"] = {
            "apiKey": openrouter_key,
            "baseUrl": "https://openrouter.ai/api/v1"
        }
    
    openai_key = get_env("OPENAI_API_KEY")
    if openai_key:
        providers["openai"] = {"apiKey": openai_key}
    
    anthropic_key = get_env("ANTHROPIC_API_KEY")
    if anthropic_key:
        providers["anthropic"] = {"apiKey": anthropic_key}
    
    deepseek_key = get_env("DEEPSEEK_API_KEY")
    if deepseek_key:
        providers["deepseek"] = {
            "apiKey": deepseek_key,
            "baseUrl": "https://api.deepseek.com"
        }
    
    google_key = get_env("GOOGLE_API_KEY")
    if google_key:
        providers["google"] = {"apiKey": google_key}
    
    mistral_key = get_env("MISTRAL_API_KEY")
    if mistral_key:
        providers["mistral"] = {"apiKey": mistral_key}
    
    provider = get_env("NANOBOT_LLM_PROVIDER", "moonshot")
    model = get_env("NANOBOT_LLM_MODEL", "kimi-k2.6")
    
    telegram_token = get_env("TELEGRAM_BOT_TOKEN")
    discord_token = get_env("DISCORD_BOT_TOKEN")
    slack_token = get_env("SLACK_BOT_TOKEN")
    
    github_token = get_env("GITHUB_TOKEN")
    github_repo = get_env("GITHUB_REPO")
    webhook_secret = get_env("GITHUB_WEBHOOK_SECRET")
    
    log_level = get_env("LOG_LEVEL", "INFO")
    
    gateway_port = int(get_env("NANOBOT_GATEWAY_PORT", "8081"))
    
    config = {
        "providers": providers,
        "agents": {
            "defaults": {
                "provider": provider,
                "model": model,
                "temperature": 0.3,
                "max_tokens": 4096
            },
            "issue_analyzer": {
                "provider": provider,
                "model": model,
                "temperature": 0.2,
                "max_tokens": 2048
            },
            "code_reviewer": {
                "provider": provider,
                "model": model,
                "temperature": 0.1,
                "max_tokens": 4096
            }
        },
        "channels": {
            "telegram": {
                "enabled": bool(telegram_token),
                "token": telegram_token,
                "allowed_users": [],
                "notify_on_issue": True,
                "notify_on_pr": True
            },
            "discord": {
                "enabled": bool(discord_token),
                "token": discord_token,
                "guild_id": get_env("DISCORD_GUILD_ID", "")
            },
            "slack": {
                "enabled": bool(slack_token),
                "token": slack_token,
                "channel": get_env("SLACK_CHANNEL", "")
            },
            "websocket": {
                "enabled": True,
                "port": gateway_port,
                "host": "0.0.0.0"
            }
        },
        "memory": {
            "enabled": True,
            "type": "sqlite",
            "path": str(CONFIG_DIR / "data" / "memory.db"),
            "max_tokens": 8000,
            "context_window": 128000
        },
        "skills": {
            "enabled": ["shell", "file", "git", "web_search", "github"],
            "disabled": [],
            "custom_skills_path": str(CONFIG_DIR / "skills")
        },
        "sandbox": {
            "enabled": True,
            "allowed_paths": ["/workspace", str(CONFIG_DIR / "data")],
            "blocked_commands": [
                "rm -rf /",
                "mkfs",
                "dd",
                "> /dev/sda",
                "chmod -R 777 /"
            ]
        },
        "logging": {
            "level": log_level,
            "file": str(CONFIG_DIR / "logs" / "nanobot.log"),
            "max_size": "10MB",
            "backup_count": 5
        }
    }
    
    # Add GitHub integration if token is available
    if github_token:
        config["github_integration"] = {
            "enabled": True,
            "token": github_token,
            "webhook_secret": webhook_secret,
            "auto_comment": True,
            "auto_label": True,
            "default_repo": github_repo
        }
    
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)
    
    print(f"[config-generator] Config written to {CONFIG_FILE}")
    print(f"[config-generator] Provider: {provider}, Model: {model}")
    print(f"[config-generator] Active providers: {list(providers.keys())}")

if __name__ == "__main__":
    main()
