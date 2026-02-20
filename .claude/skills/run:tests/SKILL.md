---
name: run:tests
description: Run all tests (unit + e2e) for the Mise project
user-invocable: true
allowed-tools: Bash, Skill, Read
---

Run the full test suite for the Mise project: **unit tests** (Vitest, apps/api) and **e2e tests** (Playwright, apps/e2e).

## 1. Ensure infrastructure is running

E2E tests need Docker services (PostgreSQL, MongoDB, Redis, RabbitMQ) and the dev servers (API + Web).

Check if Docker containers are running:

```
/Applications/Docker.app/Contents/Resources/bin/docker ps --format '{{.Names}}' 2>/dev/null | grep -q mise-postgres
```

If containers are NOT running, invoke the `/run:project` skill to start everything (Docker + dev servers). Wait for both servers to be healthy before proceeding:
- API: `curl -sf http://localhost:3001/health`
- Web: `curl -sf http://localhost:5173`

If containers ARE running, still check that dev servers are up. If not, start them with `pnpm dev` in background.

## 2. Run unit tests

```
pnpm --filter @mise/api test
```

This runs `vitest run` for the API package. Report pass/fail count.

## 3. Run e2e tests

```
cd apps/e2e && pnpm exec playwright test --workers=1
```

IMPORTANT: Use `--workers=1` because CRUD tests are serial and share state across files. The Playwright config already starts dev servers, but since we started them in step 1, `reuseExistingServer` will use the running instances.

## 4. Report results

Summarize results for both suites:
- Unit tests: X passed, Y failed
- E2E tests: X passed, Y failed
- Overall: PASS or FAIL

If any tests fail, show the relevant failure output to help debug.
