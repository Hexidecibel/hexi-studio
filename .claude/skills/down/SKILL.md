---
name: down
description: Stop the dev server.
allowed-tools: Bash
---

Stop the Vite dev server. Kill any processes running on port 5173.

Steps:
1. Run `lsof -ti:5173 | xargs kill -9 2>/dev/null || true` to kill the dev server
2. Confirm the server has stopped
