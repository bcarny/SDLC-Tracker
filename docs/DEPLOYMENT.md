# Deployment Guide (dev → prod)

AppCompass uses GitHub Actions for CI/CD with a simple dev → prod pipeline.

## Pipeline Overview

- **CI**: Runs on every push and pull request to `main` and `develop`
  - Lint, format check
  - Unit tests
  - Build
  - Docker build (verification)

- **Deploy to dev**: Triggers on push to `main`
  - Deploys the latest `main` to the dev environment

- **Deploy to prod**: Triggers on:
  - Push of a tag matching `v*` (e.g. `v1.0.0`)
  - Manual workflow dispatch with environment `prod`

## GitHub Setup

### 1. Create Environments

In your repository: **Settings → Environments**

- Create `dev` (optional: no protection)
- Create `prod` (recommended: add required reviewers for approval)

### 2. Configure Secrets

Add these secrets under **Settings → Secrets and variables → Actions** (or per-environment):

| Secret | Description |
|--------|-------------|
| `RAILWAY_TOKEN_DEV` | Railway API token for dev project |
| `RAILWAY_TOKEN_PROD` | Railway API token for prod project |

### 3. Railway (Optional)

If using Railway:

1. Create two Railway projects: one for dev, one for prod
2. Connect each to the repo or use Railway CLI in the deploy job
3. Add `DATABASE_URL` (PostgreSQL) and other env vars in each project

Example deploy step with Railway CLI:

```yaml
- uses: railwayapp/railway-cli@v1
- run: railway up
  env:
    RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN_DEV }}
```

## Workflow Files

- [.github/workflows/ci.yml](../.github/workflows/ci.yml) — Lint, test, build
- [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) — Deploy to dev/prod

## Extending the Pipeline

To add test or stage environments later:

1. Add new GitHub Environment(s)
2. Add deploy job(s) in `deploy.yml` with appropriate triggers
3. Configure environment-specific secrets
