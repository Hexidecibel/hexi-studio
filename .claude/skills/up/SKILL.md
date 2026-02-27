---
name: up
description: Start the dev server. Kills any existing instances first.
allowed-tools: Bash
---

Start the Hexi Gallery dev servers (API + Dashboard). First kill any existing instances, then start fresh.

Steps:
1. Run `bin/down` from the project root to kill any existing instances
2. Run `bin/up` from the project root using `run_in_background: true`
3. Wait 3 seconds, then check `/tmp/hexi-api.log` and `/tmp/hexi-dashboard.log` to confirm startup
