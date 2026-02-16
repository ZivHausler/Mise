---
name: run-project
description: Run the Mise project (backend API and frontend web servers)
user-invocable: true
allowed-tools: Bash
---

Run the Mise project dev servers using Turborepo.

First, ensure infrastructure services (PostgreSQL, MongoDB, Redis, RabbitMQ) are running:

```
docker compose up -d
```

Then start the dev servers:

```
pnpm dev
```

This starts both the backend API (`apps/api`) and the frontend web app (`apps/web`) concurrently via Turborepo.

Run both commands in the background so the user can continue working.
