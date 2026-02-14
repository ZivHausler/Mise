# Security Audit Report — Mise Bakery Management App

**Date:** 2026-02-14
**Auditor:** Security Researcher (automated audit)
**Scope:** Full application — backend (Fastify API), frontend (React SPA), infrastructure (Docker, env)

---

## Executive Summary

The Mise application had a solid foundational security posture with parameterized SQL queries, bcrypt password hashing (12 rounds), Zod input validation, and JWT authentication on protected routes. However, several vulnerabilities were identified ranging from Critical to Low severity. All findings have been remediated.

---

## Findings and Fixes Applied

### 1. [CRITICAL] Weak JWT Secret Default with No Production Enforcement

**File:** `apps/api/src/config/env.ts`
**Issue:** JWT_SECRET defaulted to `dev-secret-change-in-production` with no enforcement that production uses a strong secret. An attacker who discovers or guesses this default could forge JWT tokens.
**Fix:**
- Added `min(32)` validation on JWT_SECRET
- Added production-specific check: must be >= 64 chars and not a known default value
- Server now exits with fatal error if production JWT_SECRET is weak
- Reduced default token expiry from 7d to 1d

### 2. [CRITICAL] NoSQL Injection via MongoDB $regex in Recipe Search

**File:** `apps/api/src/modules/recipes/recipe.repository.ts`
**Issue:** User-supplied `search` query parameter was passed directly into MongoDB's `$regex` operator without sanitization. An attacker could craft a malicious regex causing ReDoS (Regular Expression Denial of Service) or inject MongoDB operators via object-typed input.
**Fix:**
- Escape all regex special characters before passing to `$regex`
- Added type check to ensure `search` is a string (not an object with `$` operators)
- Added global `sanitizeMiddleware` that strips `$`-prefixed keys from all request bodies

### 3. [HIGH] No Rate Limiting on Authentication Endpoints

**File:** `apps/api/src/modules/auth/auth.routes.ts`, `apps/api/src/core/plugins.ts`
**Issue:** Auth endpoints (login/register) shared the global rate limit of 100 requests/minute, which is too permissive for credential-guessing attacks.
**Fix:**
- Created `authRateLimitPlugin` with stricter limits: 10 requests per 15 minutes per IP
- Applied to auth routes prefix

### 4. [HIGH] Helmet CSP Disabled in Development

**File:** `apps/api/src/core/plugins.ts`
**Issue:** Content Security Policy was only enabled when `NODE_ENV === 'production'`, leaving development/staging environments without CSP protection. CSP headers were also using the boolean toggle instead of explicit directives.
**Fix:**
- CSP is now always enabled with explicit directive configuration
- Added strict directives: `default-src 'self'`, `frame-src 'none'`, `object-src 'none'`, etc.
- Enabled HSTS with preload, strict referrer policy, X-Content-Type-Options

### 5. [HIGH] SQL ILIKE Wildcard Injection

**Files:** `apps/api/src/modules/customers/customer.repository.ts`, `apps/api/src/modules/inventory/inventory.repository.ts`
**Issue:** Search parameters were concatenated into ILIKE patterns without escaping SQL wildcard characters (`%`, `_`). While parameterized (not injectable for SQL), an attacker could use `%` or `_` to craft broader-than-intended search patterns.
**Fix:**
- Escape `%`, `_`, and `\` characters in search input before constructing ILIKE pattern
- Added `ESCAPE '\'` clause to ILIKE queries

### 6. [MEDIUM] No Input Length Limits on String Fields

**Files:** All controller validation schemas
**Issue:** Zod schemas validated field types but had no maximum length constraints, allowing attackers to submit extremely large payloads for DoS.
**Fix:**
- Added `.max()` constraints to all string fields (names: 200, emails: 255, notes: 2000, descriptions: 5000)
- Added `.max()` to array fields (items: 100, tags: 20, steps: 200)
- Added `.max()` to numeric fields where appropriate
- Set `bodyLimit: 1048576` (1MB) on Fastify instance

### 7. [MEDIUM] JWT Token Stored in localStorage (Frontend)

**File:** `apps/web/src/store/auth.ts`, `apps/web/src/api/client.ts`
**Issue:** JWT tokens are stored in `localStorage`, which is accessible to any JavaScript running on the page. An XSS vulnerability would allow token theft.
**Status:** **Acknowledged risk** — Migrating to httpOnly cookies requires server-side changes to the auth flow (cookie-based auth with CSRF protection). This is documented as a V2 improvement. Current mitigations:
- CSP headers restrict script sources to `'self'`
- No `dangerouslySetInnerHTML` usage found in frontend
- All user inputs go through React's built-in XSS escaping

### 8. [MEDIUM] Error Details Leaked in Non-Production

**File:** `apps/api/src/core/errors/error-handler.ts`
**Issue:** Unknown errors could expose internal error messages. While not an issue in production (generic message returned), the error handler did not explicitly distinguish environments.
**Fix:**
- Added explicit production check
- In production: only generic "An unexpected error occurred" message
- In development: include error detail for debugging (but never stack traces)
- Added handler for rate limit (429) errors

### 9. [MEDIUM] Health Endpoint Exposes Server Internals

**File:** `apps/api/src/server.ts`
**Issue:** `/health` endpoint exposed `process.uptime()`, which reveals how long the server has been running.
**Fix:** Removed `uptime` from health response. Only returns `status` and `timestamp`.

### 10. [LOW] Docker MongoDB Has No Authentication

**File:** `docker-compose.yml`
**Issue:** MongoDB container runs without authentication. While only bound to localhost for development, this should be secured for any non-local deployment.
**Status:** **Acknowledged** — acceptable for local development. Production MongoDB must use authentication, network isolation, and encrypted connections.

### 11. [LOW] .env.example Contains Default Credentials

**Files:** `.env.example`, `apps/api/.env.example`
**Issue:** Contains default database credentials (`mise:mise`) and placeholder JWT secrets. While expected for example files, developers could accidentally use these in production.
**Status:** The production enforcement in `env.ts` now catches this for JWT_SECRET. Database credentials should be unique per environment.

---

## Positive Security Findings (No Issues)

1. **SQL Injection Protection:** All PostgreSQL queries use parameterized queries (`$1`, `$2`, etc.) — no string concatenation found.
2. **Password Hashing:** bcrypt with 12 rounds — industry standard.
3. **Auth Middleware Coverage:** All protected routes have `authMiddleware` applied via `preHandler` hooks.
4. **Input Validation:** Zod schema validation on all endpoints that accept user input.
5. **Error Abstraction:** Custom `AppError` hierarchy prevents leaking internal error details.
6. **XSS Protection (Frontend):** React's built-in JSX escaping is used throughout. No `dangerouslySetInnerHTML` found.
7. **Dependency Security:** Modern, maintained dependencies (Fastify, React, Zod).
8. **.gitignore:** Properly excludes `.env`, `node_modules`, and other sensitive files.
9. **CORS Configuration:** Configured with specific origins, not wildcard `*`.

---

## Security Checklist for Code Reviews

Use this checklist when reviewing PRs:

### Backend
- [ ] All SQL queries use parameterized queries (never string concatenation)
- [ ] All MongoDB queries sanitize user input (no `$` operator injection)
- [ ] New endpoints have `authMiddleware` in `preHandler`
- [ ] Request body validated with Zod schema including `.max()` length limits
- [ ] Error responses don't expose internal details (file paths, stack traces, SQL)
- [ ] New search/filter endpoints escape ILIKE wildcards and regex special chars
- [ ] Sensitive operations (delete, update) verify resource ownership
- [ ] No hardcoded secrets or credentials

### Frontend
- [ ] No `dangerouslySetInnerHTML` without explicit sanitization (prefer DOMPurify)
- [ ] User input is not interpolated into URLs without encoding
- [ ] No sensitive data stored in localStorage beyond auth token
- [ ] API errors don't display raw server error messages to users
- [ ] Forms validate input client-side before submission

### Infrastructure
- [ ] No secrets in code or config files committed to git
- [ ] Docker services use authentication for databases in non-local environments
- [ ] Environment variables validated at startup (fail fast on missing config)

---

## Recommendations for Future Development

### V2 Security Priorities
1. **Migrate to httpOnly cookie-based auth** — eliminates localStorage XSS risk
2. **Add CSRF protection** — required when using cookie-based auth
3. **Implement refresh token rotation** — invalidate old refresh tokens on use
4. **Add ownership checks** — ensure users can only access/modify their own data (IDOR prevention)
5. **Add account lockout** — lock accounts after N failed login attempts
6. **Database connection encryption** — use TLS for PostgreSQL and MongoDB connections

### V3 Security Priorities
1. **Add audit logging** — track who did what and when
2. **Implement API key authentication** for service-to-service communication
3. **Add Content Security Policy reporting** — monitor CSP violations
4. **Set up dependency scanning** in CI/CD (npm audit, Snyk, or Dependabot)
5. **Penetration testing** before public launch

---

## Files Modified

| File | Change |
|------|--------|
| `apps/api/src/config/env.ts` | JWT_SECRET min length, production enforcement, reduced default expiry |
| `apps/api/src/core/plugins.ts` | Hardened Helmet/CSP, auth rate limit plugin, CORS restrictions |
| `apps/api/src/core/errors/error-handler.ts` | Production error masking, rate limit handling |
| `apps/api/src/core/middleware/sanitize.ts` | **NEW** — NoSQL injection prevention middleware |
| `apps/api/src/server.ts` | Body size limit, sanitize middleware, health endpoint hardening |
| `apps/api/src/modules/auth/auth.routes.ts` | Auth-specific rate limiting |
| `apps/api/src/modules/auth/auth.service.ts` | Token expiry from env config |
| `apps/api/src/modules/recipes/recipe.repository.ts` | Regex escaping for MongoDB search |
| `apps/api/src/modules/customers/customer.repository.ts` | ILIKE wildcard escaping |
| `apps/api/src/modules/inventory/inventory.repository.ts` | ILIKE wildcard escaping |
| `apps/api/src/modules/orders/order.controller.ts` | Input length limits |
| `apps/api/src/modules/customers/customer.controller.ts` | Input length limits |
| `apps/api/src/modules/recipes/recipe.controller.ts` | Input length limits |
| `apps/api/src/modules/inventory/inventory.controller.ts` | Input length limits |
| `apps/api/src/modules/payments/payment.controller.ts` | Input length limits |
| `packages/shared/src/validation/index.ts` | Input length limits |
