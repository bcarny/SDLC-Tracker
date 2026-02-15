# SDLC Maturity Tracker

FFIEC-aligned SDLC maturity tracker for applications and teams. Supports manual application entry or sync from ServiceNow CMDB/APM, application–team relationships, maturity comparison across teams, and export to Power BI and ServiceNow.

## Prerequisites

- Node.js 18+
- PostgreSQL (local or Docker)

## Run locally

**1. Install dependencies**

```bash
npm install
```

**2. Start PostgreSQL** (pick one)

- **Docker:** `docker-compose up -d` (uses `docker-compose.yml`; creates DB `sdlc` with user `postgres` / password `postgres`). If you have Docker Compose V2, you can use `docker compose up -d` instead.
- **Existing Postgres:** Create a database (e.g. `sdlc`) and set its URL in `.env` (see step 3).

**3. Environment**

A `.env` file is already set for the Docker Postgres above. If you use different credentials, edit `.env`:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sdlc"
PORT=3000
NODE_ENV=development
```

**4. Generate Prisma client and run migrations**

```bash
npm run db:generate
npm run db:migrate:dev
```

**5. Start the app**

```bash
npm run dev
```

- **App (frontend):** http://localhost:3000  
- **Health:** http://localhost:3000/health  
- **API:** http://localhost:3000/api — Applications: `GET/POST /api/applications`, `GET/PATCH/DELETE /api/applications/:id`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run with tsx watch |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled app (no migrations) |
| `npm run start:migrate` | Run migrations then start |
| `npm test` | Run test suite |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Lint source |
| `npm run format` | Format with Prettier |
| `npm run db:migrate` | Deploy migrations (production) |
| `npm run db:studio` | Open Prisma Studio |

## Deploy on Railway

1. Create a new project and add **PostgreSQL** (Railway sets `DATABASE_URL`).
2. Connect the repo; Railway will use the **Dockerfile** to build.
3. Deploy; the start command runs `prisma migrate deploy` then starts the app.
4. Health check: Railway pings `GET /health` (configured in `railway.toml`).

No code changes needed; ensure all secrets are in Railway project variables.

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) – Module layout and where to change what.
- FFIEC alignment: [Development, Acquisition, and Maintenance](https://ithandbook.ffiec.gov/it-booklets/development-acquisition-and-maintenance/).
