---
name: status
description: >
  Check system health and status.
  Use when the user asks about status, health, if everything is working, or service status.
  Examples: "status", "is everything ok", "health check", "are services up", "estado".
metadata:
  nanobot:
    requires:
      bins: [curl]
      env: [INTERNAL_API_KEY, OPENCODE_SERVER_PASSWORD]
---

# Status Skill

## Purpose
Check the health of all system components and report back to the user.

## When to use
- User says: "status", "health", "is everything ok"
- User says: "are services up", "check status", "estado"

## How to use

Use the `exec` tool to run these checks:

### 1. Check orchestrator health
```bash
curl -s http://localhost:8080/health
```

### 2. Check opencode executor health
```bash
curl -s -u "opencode:$OPENCODE_SERVER_PASSWORD" http://opencode-executor:8001/global/health
```

### 3. Check Redis
```bash
redis-cli -a "$REDIS_PASSWORD" ping
```

## Response
Interpret the results and tell the user:

- If all checks pass: "All systems operational! Orchestrator, OpenCode executor, and Redis are healthy."
- If opencode fails: "OpenCode executor is not responding. The fix pipeline may be unavailable."
- If redis fails: "Redis is not responding. Task queue may be affected."
- If orchestrator fails: "The webhook server is not responding. GitHub webhooks may not be processed."

## Notes
- Keep it brief. The user just wants to know if things are working.
- Do not show raw JSON unless the user asks.
