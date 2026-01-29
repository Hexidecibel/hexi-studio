---
name: up
description: Start the dev server. Kills any existing instances first.
allowed-tools: Bash
---

Start the Vite dev server for the project. First kill any existing Vite dev server processes, then start a fresh one in the background.

Steps:
1. Kill any existing Vite/node processes running on port 5173: `lsof -ti:5173 | xargs kill -9 2>/dev/null || true`
2. Run `npm run dev` in the background from the project root directory using `run_in_background: true`
3. Confirm the server is running by checking the output
