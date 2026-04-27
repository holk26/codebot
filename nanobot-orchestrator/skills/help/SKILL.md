---
name: help
description: >
  Show help and available commands.
  Use when the user asks for help, commands, what can you do, how to use, or similar.
  Examples: "help", "what can you do", "commands", "how does this work", "ayuda".
metadata:
  nanobot:
    requires:
      bins: []
      env: []
---

# Help Skill

## Purpose
Provide the user with a clear list of what I can do and how to interact with me.

## When to use
- User says: "help", "ayuda", "what can you do"
- User says: "commands", "how do I use this"
- User seems confused about the system

## Response
Respond in the same language the user is using. Provide this information:

```
Hello! I am Nanobot, the Codebot orchestrator. I automatically fix GitHub issues using AI.

Available commands:
1. fix issue #N                → Automatically analyze and fix an issue
2. fix issue #N in owner/repo  → Fix an issue in a specific repository
3. status                      → Check if all services are healthy
4. help                        → Show this message

How it works:
When a GitHub issue is opened in the monitored repository, I:
1. Analyze the issue with AI
2. Clone the repository
3. Generate a code fix using OpenCode (Moonshot AI)
4. Create a Pull Request with the fix
5. Comment on the issue with the PR link

Monitored repository: {GITHUB_REPO}
```

Replace `{GITHUB_REPO}` with the value from the environment variable `GITHUB_REPO` if available, or say "(not configured)" if not.

## Notes
- Keep responses concise but complete.
- If the user speaks Spanish, respond in Spanish.
- Never reveal the INTERNAL_API_KEY or other secrets.
