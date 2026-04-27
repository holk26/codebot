#!/usr/bin/env python3
"""Generate nanobot config.json from environment variables.
Only includes keys that nanobot-ai's Config model accepts.
"""
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
    
    gateway_port = int(get_env("NANOBOT_GATEWAY_PORT", "8081"))
    
    # Minimal config that nanobot-ai accepts
    # Reference: https://github.com/HKUDS/nanobot/blob/main/nanobot/config/loader.py
    config = {
        "providers": providers,
        "agents": {
            "defaults": {
                "provider": provider,
                "model": model,
                "temperature": 0.3,
                "max_tokens": 4096
            }
        },
        "channels": {
            "telegram": {
                "enabled": bool(telegram_token),
                "token": telegram_token,
                "allowFrom": ["*"]
            },
            "discord": {
                "enabled": bool(discord_token),
                "token": discord_token,
                "allowFrom": ["*"]
            },
            "slack": {
                "enabled": bool(slack_token),
                "token": slack_token,
                "allowFrom": ["*"]
            },
            "websocket": {
                "enabled": True,
                "port": gateway_port
            }
        }
    }
    
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)
    
    print(f"[config-generator] Config written to {CONFIG_FILE}")
    print(f"[config-generator] Provider: {provider}, Model: {model}")
    print(f"[config-generator] Active providers: {list(providers.keys())}")

if __name__ == "__main__":
    main()
