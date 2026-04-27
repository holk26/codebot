---
name: opencode
description: >
  Fix GitHub issues automatically using the OpenCode executor.
  Use when the user asks to fix, resolve, patch, implement, or create a pull request for a GitHub issue.
  Examples: "fix issue #5", "resolve bug #42 in owner/repo", "implement feature #10", "create PR for issue 123".
metadata:
  nanobot:
    requires:
      bins: [curl]
      env: [INTERNAL_API_KEY]
---

# OpenCode Executor Skill

## Purpose
This skill lets me (the AI agent) automatically fix GitHub issues by delegating to the OpenCode executor service, which clones the repository, generates code changes using an LLM, and opens a Pull Request.

## When to use
- User says: "fix issue #N in OWNER/REPO"
- User says: "resolve bug #N"
- User says: "implement feature #N"
- User says: "create a PR for issue #N"
- User says: "patch issue #N"

## How to use

### Step 1: Extract parameters
From the user's message, extract:
- `repo`: The repository in `owner/repo` format. If the user says "my repo" or omits the owner/repo, use the `GITHUB_REPO` environment variable as default. Only ask for clarification if `GITHUB_REPO` is also not set.
- `issue_number`: The issue number (integer after `#` or just a number).
- `issue_title`: A brief title for the issue (can be a short summary if not provided).
- `issue_body`: The issue description (can be empty if not provided).

### Step 2: Call the orchestrator API
Use the `exec` tool to run curl:

```bash
curl -s -X POST http://localhost:8080/api/fix-issue \
  -H "Content-Type: application/json" \
  -H "X-Internal-API-Key: $INTERNAL_API_KEY" \
  -d '{
    "repo": "OWNER/REPO",
    "issue_number": N,
    "issue_title": "TITLE",
    "issue_body": "BODY"
  }'
```

Replace:
- `OWNER/REPO` with the actual repository
- `N` with the issue number
- `TITLE` with the issue title
- `BODY` with the issue body (or empty string)

### Step 3: Interpret the response
The response is a JSON object. Tell the user:
- If `status` is "accepted": "I've started fixing the issue! I'll create a pull request shortly."
- If there's an error: "I couldn't start the fix automatically. Error: <error>"

## Important notes
- The orchestrator runs the fix workflow asynchronously.
- The `INTERNAL_API_KEY` environment variable is pre-configured and passed automatically.
- Do not show the API key to the user.
