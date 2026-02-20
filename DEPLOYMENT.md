# Mise — GCP Deployment Guide

> Everything needed to deploy Mise (API + Web) to Google Cloud Platform.
> Estimated monthly cost: **~$7/mo** (Cloud SQL only — everything else is free tier).

---

## Table of Contents

1. [Architecture](#architecture)
2. [Decisions & Rationale](#decisions--rationale)
3. [Cost Breakdown](#cost-breakdown)
4. [Prerequisites](#prerequisites)
5. [GCP One-Time Setup](#gcp-one-time-setup)
6. [GCE e2-micro Setup (Redis + RabbitMQ)](#gce-e2-micro-setup-redis--rabbitmq)
7. [Cloud SQL (PostgreSQL)](#cloud-sql-postgresql)
8. [MongoDB Atlas (Free Tier)](#mongodb-atlas-free-tier)
9. [Database Migrations](#database-migrations)
10. [Cloud Run Deployment (API)](#cloud-run-deployment-api)
11. [Firebase Hosting (Web)](#firebase-hosting-web)
12. [GitHub Actions CI/CD](#github-actions-cicd)
13. [Environment Variables](#environment-variables)
14. [Files to Create / Modify](#files-to-create--modify)
15. [Verification Checklist](#verification-checklist)

---

## Architecture

```
                          ┌─────────────────────────────────────────────┐
                          │                   GCP                       │
                          │                                             │
   Users ──── HTTPS ────▶ │  Firebase Hosting (SPA)                     │
                          │    ├── Static assets (Vite build)           │
                          │    └── /api/* rewrite ──▶ Cloud Run (API)   │
                          │                              │              │
                          │         ┌────────────────────┼──────┐       │
                          │         │                    │      │       │
                          │         ▼                    ▼      ▼       │
                          │   Cloud SQL (PG)     GCE e2-micro  Atlas   │
                          │   ~$7/mo             (free tier)   (free)  │
                          │                      ┌──────────┐          │
                          │                      │ Redis    │          │
                          │                      │ RabbitMQ │          │
                          │                      └──────────┘          │
                          └─────────────────────────────────────────────┘

   Cloud Run  ──▶  Cloud SQL     via Unix socket (/cloudsql/PROJECT:REGION:INSTANCE)
   Cloud Run  ──▶  GCE           via internal IP (Redis :6379, RabbitMQ :5672)
   Cloud Run  ──▶  Atlas         via connection string (mongodb+srv://...)
```

---

## Decisions & Rationale

| Decision | Why |
|---|---|
| **GCP over AWS/Azure** | Firebase Hosting is free with generous limits; Cloud Run has a permanent free tier (2M requests/mo); tight integration between services. |
| **Cloud SQL for PostgreSQL** | Mise's core data (users, orders, inventory, recipes, payments, stores, settings) lives in PG. Managed backups, patching, and HA available. The smallest instance (db-f1-micro) is ~$7/mo. |
| **MongoDB Atlas free tier** | Mise uses MongoDB for analytics/audit logs (non-critical). Atlas M0 gives 512 MB free, no credit card required, accessible from anywhere. |
| **Self-host Redis + RabbitMQ on GCE e2-micro** | GCP has no free managed Redis or RabbitMQ. An e2-micro VM is free-tier eligible (1 per billing account). Docker Compose keeps it simple. |
| **Cloud Run (not GKE/GCE)** | Zero-to-hero scaling, no cluster management, pay-per-request, built-in Cloud SQL Auth Proxy via Unix socket. |
| **Firebase Hosting (not Cloud Storage + LB)** | Free SSL, free CDN, automatic cache invalidation, SPA rewrite rules, and free `/api/*` rewrite to Cloud Run — no load balancer cost. |

---

## Cost Breakdown

| Service | Tier | Monthly Cost |
|---|---|---|
| Cloud Run | Free tier (2M requests, 360k vCPU-sec) | $0 |
| Cloud SQL (db-f1-micro, 10 GB) | Paid (cheapest PG instance) | ~$7 |
| GCE e2-micro | Free tier (1 per billing account) | $0 |
| MongoDB Atlas M0 | Free tier (512 MB) | $0 |
| Firebase Hosting | Free tier (10 GB storage, 360 MB/day transfer) | $0 |
| Artifact Registry | Free tier (500 MB) | $0 |
| **Total** | | **~$7/mo** |

---

## Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed and authenticated (`gcloud auth login`)
- `firebase` CLI installed (`npm i -g firebase-tools`)
- MongoDB Atlas account (free)
- Domain name (optional — Firebase provides a `.web.app` subdomain)

---

## GCP One-Time Setup

All commands use the project ID `mise-prod` — replace with your actual project ID.

### 1. Create project and enable APIs

```bash
# Create project
gcloud projects create mise-prod --name="Mise Production"
gcloud config set project mise-prod

# Link billing account
gcloud billing accounts list
gcloud billing projects link mise-prod --billing-account=YOUR_BILLING_ACCOUNT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  compute.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  firebase.googleapis.com
```

### 2. Set default region

```bash
gcloud config set compute/region me-west1
gcloud config set compute/zone me-west1-a
gcloud config set run/region me-west1
```

> Use `me-west1` (Tel Aviv) for lowest latency to Israel. Substitute your preferred region.

### 3. Create Artifact Registry repository

```bash
gcloud artifacts repositories create mise-docker \
  --repository-format=docker \
  --location=me-west1 \
  --description="Mise Docker images"
```

### 4. Create service accounts

```bash
# Cloud Run service account
gcloud iam service-accounts create mise-api \
  --display-name="Mise API (Cloud Run)"

# Grant Cloud SQL Client role
gcloud projects add-iam-policy-binding mise-prod \
  --member="serviceAccount:mise-api@mise-prod.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# GitHub Actions deployer
gcloud iam service-accounts create github-deployer \
  --display-name="GitHub Actions Deployer"

# Grant roles to deployer
for role in roles/run.admin roles/artifactregistry.writer roles/iam.serviceAccountUser roles/firebase.admin roles/storage.admin; do
  gcloud projects add-iam-policy-binding mise-prod \
    --member="serviceAccount:github-deployer@mise-prod.iam.gserviceaccount.com" \
    --role="$role"
done

# Create key for GitHub Actions
gcloud iam service-accounts keys create github-deployer-key.json \
  --iam-account=github-deployer@mise-prod.iam.gserviceaccount.com
# ⚠ Store this JSON as GitHub secret GCP_SA_KEY, then delete the local file
```

---

## GCE e2-micro Setup (Redis + RabbitMQ)

### 1. Create the VM

```bash
gcloud compute instances create mise-services \
  --machine-type=e2-micro \
  --zone=me-west1-a \
  --image-family=cos-stable \
  --image-project=cos-cloud \
  --tags=mise-services \
  --metadata=startup-script='#!/bin/bash
    # Install Docker Compose via docker run
    mkdir -p /opt/mise
    cat > /opt/mise/docker-compose.yml <<COMPOSE
version: "3.8"
services:
  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru

  rabbitmq:
    image: rabbitmq:3-alpine
    restart: always
    ports:
      - "5672:5672"
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: mise
      RABBITMQ_DEFAULT_PASS: CHANGE_ME_RABBITMQ_PASSWORD

volumes:
  redis-data:
  rabbitmq-data:
COMPOSE
    cd /opt/mise
    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v /opt/mise:/opt/mise -w /opt/mise docker/compose:latest up -d
  '
```

> **Container-Optimized OS** (cos-stable) comes with Docker pre-installed. For the `docker-compose` plugin on COS, you may need to use `docker compose` (v2) or pull the compose image. Adjust the startup script accordingly if needed.

### 2. Firewall rules (internal only)

```bash
# Allow Cloud Run (and other GCP services) to reach Redis + RabbitMQ
# Only from internal GCP IPs — NOT the public internet
gcloud compute firewall-rules create allow-mise-services \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:6379,tcp:5672 \
  --source-ranges=10.0.0.0/8 \
  --target-tags=mise-services
```

### 3. Note the internal IP

```bash
gcloud compute instances describe mise-services \
  --zone=me-west1-a \
  --format='get(networkInterfaces[0].networkIP)'
# Example: 10.128.0.2 — use this for REDIS_URL and RABBITMQ_URL
```

---

## Cloud SQL (PostgreSQL)

### 1. Create instance

```bash
gcloud sql instances create mise-pg \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=me-west1 \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --availability-type=zonal
```

### 2. Set password and create database

```bash
# Set postgres user password
gcloud sql users set-password postgres \
  --instance=mise-pg \
  --password=CHANGE_ME_PG_PASSWORD

# Create application database
gcloud sql databases create mise --instance=mise-pg

# Create application user
gcloud sql users create mise \
  --instance=mise-pg \
  --password=CHANGE_ME_MISE_PG_PASSWORD
```

### 3. Connection string

Cloud Run connects via Unix socket (no public IP needed):

```
DATABASE_URL=postgresql://mise:CHANGE_ME_MISE_PG_PASSWORD@localhost/mise?host=/cloudsql/mise-prod:me-west1:mise-pg
```

For local access (migrations, debugging), use Cloud SQL Auth Proxy:

```bash
# Install proxy
gcloud components install cloud-sql-proxy

# Connect locally
cloud-sql-proxy mise-prod:me-west1:mise-pg &
# Then connect on localhost:5432
```

---

## MongoDB Atlas (Free Tier)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and create an account
2. Create a **free M0 cluster** (choose GCP, region closest to `me-west1`)
3. Create a database user (username: `mise`, strong password)
4. Under **Network Access**, add `0.0.0.0/0` (required for Cloud Run's dynamic IPs)
   - For tighter security, use a Serverless VPC connector + NAT gateway (adds cost)
5. Get the connection string:

```
MONGODB_URI=mongodb+srv://mise:CHANGE_ME_MONGO_PASSWORD@cluster0.xxxxx.mongodb.net/mise?retryWrites=true&w=majority
```

---

## Database Migrations

Mise has 13 SQL migration files in `packages/db/src/migrations/`:

```
001_initial.sql          — Core tables (users, tenants, etc.)
002_settings.sql         — Settings tables
003_default_groups.sql   — Default group seed data
004_inventory_log_price.sql — Inventory log price column
005_package_size.sql     — Package size field
006_google_auth.sql      — Google OAuth fields
007_order_number.sql     — Order numbering
008_stores.sql           — Stores table
009_invitation_only.sql  — Invitation system
010_admin_role.sql       — Admin role
011_admin_module.sql     — Admin module tables
012_audit_log_bodies.sql — Audit log request/response bodies
013_split_audit_log_bodies.sql — Split audit log bodies
```

### Run migrations against Cloud SQL

```bash
# Option A: Via Cloud SQL Auth Proxy (recommended for first-time setup)
cloud-sql-proxy mise-prod:me-west1:mise-pg &

for f in packages/db/src/migrations/*.sql; do
  echo "Running $f..."
  PGPASSWORD=CHANGE_ME_MISE_PG_PASSWORD psql -h 127.0.0.1 -U mise -d mise -f "$f"
done

# Option B: Via gcloud (for individual files)
gcloud sql connect mise-pg --user=mise --database=mise < packages/db/src/migrations/001_initial.sql
```

> **Important:** Run migrations in order (001 through 013). Each is idempotent if it uses `IF NOT EXISTS`, but check individual files before re-running.

---

## Cloud Run Deployment (API)

### 1. Build and push image

```bash
# Authenticate Docker to Artifact Registry
gcloud auth configure-docker me-west1-docker.pkg.dev

# Build from project root (Dockerfile at apps/api/Dockerfile)
docker build -t me-west1-docker.pkg.dev/mise-prod/mise-docker/api:latest -f apps/api/Dockerfile .

# Push
docker push me-west1-docker.pkg.dev/mise-prod/mise-docker/api:latest
```

### 2. Deploy

```bash
gcloud run deploy mise-api \
  --image=me-west1-docker.pkg.dev/mise-prod/mise-docker/api:latest \
  --region=me-west1 \
  --platform=managed \
  --allow-unauthenticated \
  --service-account=mise-api@mise-prod.iam.gserviceaccount.com \
  --add-cloudsql-instances=mise-prod:me-west1:mise-pg \
  --port=3001 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="PORT=3001" \
  --set-env-vars="HOST=0.0.0.0" \
  --set-env-vars="DATABASE_URL=postgresql://mise:CHANGE_ME_MISE_PG_PASSWORD@localhost/mise?host=/cloudsql/mise-prod:me-west1:mise-pg" \
  --set-env-vars="MONGODB_URI=mongodb+srv://mise:CHANGE_ME_MONGO_PASSWORD@cluster0.xxxxx.mongodb.net/mise?retryWrites=true&w=majority" \
  --set-env-vars="REDIS_URL=redis://10.128.0.2:6379" \
  --set-env-vars="RABBITMQ_URL=amqp://mise:CHANGE_ME_RABBITMQ_PASSWORD@10.128.0.2:5672" \
  --set-env-vars="JWT_SECRET=CHANGE_ME_GENERATE_64_CHAR_SECRET" \
  --set-env-vars="JWT_EXPIRES_IN=1d" \
  --set-env-vars="JWT_REFRESH_EXPIRES_IN=7d" \
  --set-env-vars="GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID" \
  --set-env-vars="FRONTEND_URL=https://mise-prod.web.app" \
  --set-env-vars="ADMIN_SECRET=CHANGE_ME_GENERATE_32_CHAR_SECRET" \
  --set-env-vars="CORS_ORIGIN=https://mise-prod.web.app" \
  --set-env-vars="RATE_LIMIT_MAX=1000" \
  --set-env-vars="RATE_LIMIT_WINDOW=1 minute" \
  --set-env-vars="AUTH_RATE_LIMIT_MAX=10" \
  --set-env-vars="AUTH_RATE_LIMIT_WINDOW=15 minutes" \
  --set-env-vars="LOG_LEVEL=info"
```

> **Note on VPC:** For Cloud Run to reach the GCE e2-micro internal IP, you need a **Serverless VPC Access connector**:
>
> ```bash
> gcloud compute networks vpc-access connectors create mise-vpc-connector \
>   --region=me-west1 \
>   --range=10.8.0.0/28
>
> # Then add to the deploy command:
> #   --vpc-connector=mise-vpc-connector
> ```
>
> Alternatively, give the GCE VM a public IP and use that (less secure but simpler for a small deployment).

### 3. Get the service URL

```bash
gcloud run services describe mise-api --region=me-west1 --format='value(status.url)'
# Example: https://mise-api-xxxxxx-zz.a.run.app
```

---

## Firebase Hosting (Web)

### 1. Initialize Firebase

```bash
firebase login
firebase projects:adddFirebase mise-prod   # Add Firebase to existing GCP project
firebase init hosting                       # Select mise-prod, set public dir to apps/web/dist
```

### 2. Create `firebase.json` (project root)

```json
{
  "hosting": {
    "public": "apps/web/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/api/**",
        "run": {
          "serviceId": "mise-api",
          "region": "me-west1"
        }
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/assets/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      }
    ]
  }
}
```

### 3. Build and deploy

```bash
# Build the web app (from project root)
pnpm --filter @mise/web build

# Deploy
firebase deploy --only hosting
```

### 4. Important: Update web app env

The web app needs `VITE_API_URL` to point to the same domain (since Firebase rewrites `/api/*`):

```bash
# In apps/web/.env.production
VITE_API_URL=https://mise-prod.web.app
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
```

> If the API is mounted at `/api` on the same domain via Firebase rewrite, set `VITE_API_URL` to empty string or `/api` depending on how `apps/web/src/api/client.ts` constructs URLs.

---

## GitHub Actions CI/CD

Create two workflow files:

### `.github/workflows/deploy-api.yml`

```yaml
name: Deploy API to Cloud Run

on:
  push:
    branches: [main]
    paths:
      - "apps/api/**"
      - "packages/**"
      - "pnpm-lock.yaml"

env:
  PROJECT_ID: mise-prod
  REGION: me-west1
  REPO: mise-docker
  IMAGE: api

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to GCP
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker
        run: gcloud auth configure-docker ${{ env.REGION }}-docker.pkg.dev --quiet

      - name: Build and push image
        run: |
          docker build \
            -t ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPO }}/${{ env.IMAGE }}:${{ github.sha }} \
            -t ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPO }}/${{ env.IMAGE }}:latest \
            -f apps/api/Dockerfile .
          docker push ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPO }}/${{ env.IMAGE }}:${{ github.sha }}
          docker push ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPO }}/${{ env.IMAGE }}:latest

      - name: Deploy to Cloud Run
        uses: google-github-actions/deploy-cloudrun@v2
        with:
          service: mise-api
          region: ${{ env.REGION }}
          image: ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPO }}/${{ env.IMAGE }}:${{ github.sha }}

      - name: Verify deployment
        run: |
          URL=$(gcloud run services describe mise-api --region=${{ env.REGION }} --format='value(status.url)')
          curl -sf "$URL/health" || exit 1

      - name: Cleanup old images (keep last 2)
        run: |
          # List all image digests sorted by upload time (oldest first), skip the 2 most recent
          gcloud artifacts docker images list \
            ${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPO }}/${{ env.IMAGE }} \
            --sort-by=UPDATE_TIME \
            --format='get(version)' \
            | head -n -2 \
            | while read -r DIGEST; do
                gcloud artifacts docker images delete \
                  "${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPO }}/${{ env.IMAGE }}@${DIGEST}" \
                  --quiet --delete-tags 2>/dev/null || true
              done
```

### `.github/workflows/deploy-web.yml`

```yaml
name: Deploy Web to Firebase Hosting

on:
  push:
    branches: [main]
    paths:
      - "apps/web/**"
      - "packages/**"
      - "pnpm-lock.yaml"
      - "firebase.json"

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9.1.0

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm --filter @mise/web build
        env:
          VITE_API_URL: https://mise-prod.web.app
          VITE_GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}

      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.GCP_SA_KEY }}
          projectId: mise-prod
          channelId: live
```

### `.github/workflows/ci.yml` (runs on every branch push + PR)

```yaml
name: CI

on:
  push:
    branches-ignore: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: mise
          POSTGRES_PASSWORD: mise
          POSTGRES_DB: mise
        ports:
          - 5432:5432
        options: >-
          --health-cmd="pg_isready -U mise"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

      mongodb:
        image: mongo:7
        ports:
          - 27017:27017

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

      rabbitmq:
        image: rabbitmq:3-alpine
        ports:
          - 5672:5672

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9.1.0

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm type-check

      - name: Lint
        run: pnpm lint

      - name: Run unit tests
        run: pnpm test
        env:
          DATABASE_URL: postgresql://mise:mise@localhost:5432/mise
          MONGODB_URI: mongodb://localhost:27017/mise
          REDIS_URL: redis://localhost:6379
          RABBITMQ_URL: amqp://localhost:5672
          JWT_SECRET: ci-test-secret-that-is-long-enough-for-validation
          ADMIN_SECRET: ci-test-admin-secret-long-enough

      - name: Run migrations
        run: |
          for f in packages/db/src/migrations/*.sql; do
            PGPASSWORD=mise psql -h localhost -U mise -d mise -f "$f"
          done

      - name: Run e2e tests
        run: pnpm test:e2e
        env:
          DATABASE_URL: postgresql://mise:mise@localhost:5432/mise
          MONGODB_URI: mongodb://localhost:27017/mise
          REDIS_URL: redis://localhost:6379
          RABBITMQ_URL: amqp://localhost:5672
          JWT_SECRET: ci-test-secret-that-is-long-enough-for-validation
          ADMIN_SECRET: ci-test-admin-secret-long-enough
```

> **Branch protection:** In GitHub, go to **Settings > Branches > Add rule** for `main`:
> - Check **"Require a pull request before merging"**
> - Check **"Require status checks to pass before merging"**
> - Search and add the **"test"** status check
>
> After this, no one can merge to `main` unless CI passes.

### GitHub Secrets to configure

| Secret | Value |
|---|---|
| `GCP_SA_KEY` | Contents of `github-deployer-key.json` |
| `GOOGLE_CLIENT_ID` | Your Google OAuth Client ID |

---

## Environment Variables

### API (Cloud Run) — Complete list

| Variable | Production Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Enables production checks in `env.ts` |
| `PORT` | `3001` | Cloud Run will also set `PORT` automatically |
| `HOST` | `0.0.0.0` | Required for Cloud Run |
| `DATABASE_URL` | `postgresql://mise:***@localhost/mise?host=/cloudsql/mise-prod:me-west1:mise-pg` | Unix socket path |
| `MONGODB_URI` | `mongodb+srv://mise:***@cluster0.xxxxx.mongodb.net/mise?retryWrites=true&w=majority` | Atlas connection string |
| `REDIS_URL` | `redis://10.128.0.2:6379` | GCE internal IP |
| `RABBITMQ_URL` | `amqp://mise:***@10.128.0.2:5672` | GCE internal IP |
| `JWT_SECRET` | (generate: `openssl rand -hex 64`) | Must be >= 64 chars in production |
| `JWT_EXPIRES_IN` | `1d` | |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | |
| `GOOGLE_CLIENT_ID` | Your OAuth client ID | From Google Cloud Console |
| `FRONTEND_URL` | `https://mise-prod.web.app` | Must not be localhost in production |
| `ADMIN_SECRET` | (generate: `openssl rand -hex 32`) | Must be >= 32 chars in production |
| `CORS_ORIGIN` | `https://mise-prod.web.app` | Match FRONTEND_URL |
| `RATE_LIMIT_MAX` | `1000` | |
| `RATE_LIMIT_WINDOW` | `1 minute` | |
| `AUTH_RATE_LIMIT_MAX` | `10` | |
| `AUTH_RATE_LIMIT_WINDOW` | `15 minutes` | |
| `LOG_LEVEL` | `info` | |

### Web (Firebase Hosting) — Build-time only

| Variable | Production Value |
|---|---|
| `VITE_API_URL` | `https://mise-prod.web.app` (or empty if using Firebase rewrite) |
| `VITE_GOOGLE_CLIENT_ID` | Your OAuth client ID |

---

## Files to Create / Modify

| Action | File | Purpose |
|---|---|---|
| **Create** | `firebase.json` | Firebase Hosting config with SPA rewrite + Cloud Run proxy |
| **Create** | `.github/workflows/deploy-api.yml` | CI/CD for API → Cloud Run |
| **Create** | `.github/workflows/deploy-web.yml` | CI/CD for Web → Firebase Hosting |
| **Create** | `apps/web/.env.production` | Production env vars for Vite build |
| **Verify** | `apps/api/Dockerfile` | Already exists — no changes needed |
| **Verify** | `apps/web/Dockerfile` | Exists but not used (Firebase Hosting serves static files directly) |
| **Optional** | `.firebaserc` | Created by `firebase init`, stores project alias |

---

## Verification Checklist

Run through these after deployment to confirm everything works end-to-end:

### Infrastructure

- [ ] Cloud SQL instance `mise-pg` is running: `gcloud sql instances describe mise-pg`
- [ ] GCE VM `mise-services` is running: `gcloud compute instances describe mise-services --zone=me-west1-a`
- [ ] Redis is reachable from GCE: `gcloud compute ssh mise-services -- "docker exec -it \$(docker ps -qf name=redis) redis-cli ping"`
- [ ] RabbitMQ is reachable from GCE: `gcloud compute ssh mise-services -- "docker exec -it \$(docker ps -qf name=rabbitmq) rabbitmqctl status"`
- [ ] All 13 migrations ran successfully: connect to Cloud SQL and check table count

### API (Cloud Run)

- [ ] Service is deployed: `gcloud run services list --region=me-west1`
- [ ] Health check passes: `curl https://mise-api-xxxxxx-zz.a.run.app/health`
- [ ] Health response shows `postgres: ok`, `mongo: ok`, `redis: ok`
- [ ] Auth endpoints work: test Google OAuth flow
- [ ] API can write to PostgreSQL: create a test entity

### Web (Firebase Hosting)

- [ ] Site is live: visit `https://mise-prod.web.app`
- [ ] SPA routing works: navigate to a sub-route and refresh
- [ ] API rewrite works: `curl https://mise-prod.web.app/api/health` (should proxy to Cloud Run)
- [ ] Google OAuth login works end-to-end

### CI/CD

- [ ] Push a change to `apps/api/` and verify GitHub Actions deploys to Cloud Run
- [ ] Push a change to `apps/web/` and verify GitHub Actions deploys to Firebase Hosting
- [ ] Check that the `deploy-api` workflow hits `/health` successfully after deploy

### Security

- [ ] Cloud SQL has no public IP (connections via Unix socket only)
- [ ] GCE firewall only allows internal traffic on ports 6379 and 5672
- [ ] `JWT_SECRET` is >= 64 characters and not a default value
- [ ] `ADMIN_SECRET` is >= 32 characters and not a default value
- [ ] Atlas network access is restricted (ideally not `0.0.0.0/0` — use VPC connector + NAT if possible)
- [ ] CORS_ORIGIN matches only your production domain
