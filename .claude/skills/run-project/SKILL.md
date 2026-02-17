---
name: run-project
description: Run the Mise project (backend API and frontend web servers)
user-invocable: true
allowed-tools: Bash
---

Run the Mise project dev servers using Turborepo.

## 1. Start infrastructure services

Start PostgreSQL, MongoDB, Redis, and RabbitMQ via Docker Compose.

IMPORTANT: The `docker` symlink at `/usr/local/bin/docker` is broken. Use the full path to Docker Desktop's binary:

```
/Applications/Docker.app/Contents/Resources/bin/docker compose up -d
```

If this fails with "no such file or directory", Docker Desktop is not running. Ask the user to open Docker Desktop and wait for it to be ready, then retry.

## 2. Start dev servers

```
pnpm dev
```

This starts both servers concurrently via Turborepo:
- **Backend API** (`apps/api`): http://localhost:3001
- **Frontend Web** (`apps/web`): Vite dev server

Run both commands in the background so the user can continue working.
