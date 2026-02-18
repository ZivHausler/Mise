# Mise Project - Full Security & Architecture Review

**Date**: February 17, 2026

## Architecture Overview

Mise is a **bakery management SaaS** built as a monorepo (pnpm + Turborepo):
- **Backend**: Fastify API with PostgreSQL, MongoDB, Redis, RabbitMQ
- **Frontend**: React + Vite + Tailwind + Zustand
- **Shared packages**: `db`, `shared`, `ui`
- **Multi-tenant**: Store-based isolation via JWT claims

---

## CRITICAL Vulnerabilities

### 1. IDOR - Groups CRUD Missing Store Authorization
**Files**: `apps/api/src/modules/settings/groups/groups.repository.ts:36-59`

The `update()` and `delete()` methods use only `id` in the WHERE clause — no `store_id` check. An attacker who guesses a group ID can **modify or delete groups belonging to other stores**.

```sql
-- Current (vulnerable):
UPDATE groups SET ... WHERE id = $N
DELETE FROM groups WHERE id = $1

-- Should be:
UPDATE groups SET ... WHERE id = $N AND store_id = $M
DELETE FROM groups WHERE id = $1 AND store_id = $2
```

Same issue in `findById()` (line 16) — any authenticated user can read any group.

### 2. Auth Tokens Stored in localStorage (XSS = Full Account Takeover)
**File**: `apps/web/src/store/auth.ts:53,58,74`

Tokens and user data are stored in `localStorage`. A single XSS vulnerability would let an attacker steal tokens and impersonate any user. Tokens should be in **httpOnly secure cookies**.

### 3. Invitation Links Logged to stdout
**File**: `apps/api/src/modules/stores/store.service.ts:53`

```typescript
console.log(`\n📧 INVITE LINK for ${email}: ${inviteLink}\n`);
```

Invitation tokens with full privilege are printed to logs. In production, anyone with log access gets account access.

---

## HIGH Severity

### 4. No Token Revocation / Blacklist
**File**: `apps/api/src/modules/auth/auth.service.ts:91-96`

There's no logout invalidation. Stolen tokens work until natural expiry (1 day). `JWT_REFRESH_EXPIRES_IN` is defined in env config but **never used** — all tokens use the same expiry.

### 5. Store Invitation Role Escalation
**File**: `apps/api/src/modules/stores/store.service.ts:45-48`

The `sendInvite` endpoint checks that the inviter is an OWNER, but does **not** validate the `inviteRole` parameter. An owner could invite someone as OWNER, and there's no schema validation restricting allowed role values.

### 6. Units/Groups findById Has No Tenant Scoping
**File**: `apps/api/src/modules/settings/groups/groups.repository.ts:16-23`

```typescript
SELECT ... FROM groups WHERE id = $1  // No storeId!
```

Any authenticated user can fetch any group/unit by ID across all stores.

---

## MEDIUM Severity

### 7. No Database TLS/SSL
**Files**: `apps/api/src/core/database/postgres.ts`, `packages/db/src/connections/mongo.ts`

Neither PostgreSQL nor MongoDB connections configure SSL. Fine for localhost dev, but **must be added before production** deployment.

### 8. CSP Allows `unsafe-inline` for Styles
**File**: `apps/api/src/core/plugins.ts:27`

```typescript
styleSrc: ["'self'", "'unsafe-inline'"],
```

This opens a CSS injection vector. Consider nonce-based CSP or Tailwind CSS extraction.

### 9. Invite Tokens in URL Parameters
**File**: `apps/web/src/pages/RegisterPage.tsx:15-16`

Invite tokens are passed as `?invite=TOKEN` in URLs — visible in browser history, Referer headers, proxy logs, and browser extensions.

### 10. No Redis Authentication
**Config**: `redis://localhost:6379` with no password. Production Redis must require auth.

### 11. Google Client ID Committed to Git
**File**: `apps/web/.env:1`

While public Client IDs are technically safe, this one is in git history. If the repo goes public, it should be rotated and domain-restricted.

### 12. Analytics SQL Uses JSON on User-Controlled Data
**File**: `apps/api/src/modules/analytics/analytics.routes.ts:43-52`

```sql
SELECT item->>'recipeId' ... FROM orders, jsonb_array_elements(items::jsonb) as item
```

The `items` JSON structure originates from user input. If item structure isn't validated at creation time, this could be exploited.

---

## LOW Severity

| Issue | Location |
|-------|----------|
| Password policy missing special character requirement | `auth/use-cases/registerUser.ts:9-17` |
| `console.log` used instead of Pino logger in 3+ files | `di/container.ts`, `store.service.ts`, `rabbitmq-event-bus.ts` |
| No security event logging (failed auth attempts) | `core/middleware/auth.ts` |
| `sendInvite` uses global rate limit (100/min) not auth rate limit (10/15min) | `stores/store.routes.ts:20` |
| Docker-compose exposes all DB ports (5432, 27017, 6379, 5672, 15672) | `docker-compose.yml` |
| Order update allows modifying `items` and `totalAmount` directly | `orders/order.repository.ts:84-102` |
| No JWT secret rotation mechanism | `config/env.ts:23-26` |
| `HOST` defaults to `0.0.0.0` | `config/env.ts:9` |

---

## What's Done Well

- Parameterized SQL queries everywhere (no SQL injection)
- NoSQL injection middleware strips `$` operators globally
- Helmet with strong security headers (HSTS, XSS filter, no-sniff, referrer-policy)
- Rate limiting on auth endpoints (10/15min)
- bcrypt with 12 salt rounds
- Zod validation on all inputs
- Google OAuth with audience validation
- Production error handler hides stack traces
- JWT secret enforced >= 64 chars in production
- CORS restricted to configured origins (no wildcards)
- Graceful shutdown handling
- Health checks on all services
- `.env` files properly gitignored
- GitGuardian configured

---

## Top 5 Action Items (Priority Order)

1. **Fix IDOR in groups/units** — add `AND store_id = $N` to all update/delete/findById queries
2. **Move tokens to httpOnly cookies** — eliminate localStorage token storage
3. **Remove console.log of invite links** — replace with proper email delivery
4. **Implement token blacklist** — invalidate tokens on logout (Redis-based)
5. **Add TLS/SSL to database connections** — mandatory before any production deployment
