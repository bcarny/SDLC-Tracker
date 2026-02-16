# AppCompass

**Navigating the wild landscape of our software lifecycle.**

AppCompass captures existing SDLC maturity across your organization's application landscape using FFIEC-aligned criteria, enabling you to build data-driven roadmaps for improvement. With an **application-first** workflow, you assess maturity at the application level and link teams to applications, recognizing that not all applications can reach the same maturity level (e.g., SaaS/COTS have limited control). Track maturity over time, compare across applications and teams, and export data for integration with ServiceNow, Power BI, and other tools.

## User Interface

AppCompass provides an intuitive interface for tracking application maturity across your organization. Here are the key views:

### Main Dashboard
![Applications View](docs/images/home-applications.png)
*Overview of all applications with maturity scores and quick access to assessments*

### Application Detail
![Application Detail](docs/images/application-detail.png)
*View application details, linked teams, and run maturity assessments*

### Maturity Assessment
![Assessment Form - Part 1](docs/images/assessment-form1.png)
*Requirements & Planning, Design & Architecture categories*

![Assessment Form - Part 2](docs/images/assessment-form2.png)
*Development & Code Quality (including AI Coding Assistants & Agentic Development), Testing & Quality Assurance categories*

![Assessment Form - Part 3](docs/images/assessment-form3.png)
*Security & Compliance, Deployment & Release, Operations & Monitoring, Governance & Documentation categories. Includes AI Coding Assistants & Agentic Development criterion.*

### Comparison View
![Comparison - Radar Chart](docs/images/comparison-view1.png)
*Radar chart comparing maturity across multiple applications*

![Comparison - Score Table](docs/images/comparison-view2.png)
*Detailed comparison table with maturity scores and levels*

### Teams Management
![Teams](docs/images/teams-view.png)
*Manage teams and see which applications they maintain*

### Documentation
![Documentation](docs/images/docs-view.png)
*User guide and API reference for integrations*

> **Note:** Screenshots will be added to `docs/images/` directory. See [SCREENSHOTS.md](docs/SCREENSHOTS.md) for capture guidelines.

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

# Optional: ServiceNow integration
# SERVICENOW_BASE_URL=https://your-instance.service-now.com
# SERVICENOW_USER=api_user
# SERVICENOW_PASSWORD=api_password
# Or use OAuth:
# SERVICENOW_CLIENT_ID=
# SERVICENOW_CLIENT_SECRET=

# Optional: PowerBI integration
# POWERBI_CLIENT_ID=service_principal_client_id
# POWERBI_CLIENT_SECRET=service_principal_secret
# POWERBI_TENANT_ID=azure_tenant_id
# POWERBI_WORKSPACE_ID=target_workspace_id
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
- **API:** http://localhost:3000/api  
  - Applications: `GET/POST /api/applications`, `GET/PATCH/DELETE /api/applications/:id` (PATCH body: `{ name?, description?, type?, externalId?, source?, dimensions? }`)  
  - Link teams: `POST /api/applications/:id/teams` (body: `{ teamId }`), `DELETE /api/applications/:id/teams/:teamId`  
  - Assessments: `GET /api/applications/:id/assessments` (all assessments for history), `POST /api/assessments` (body: `{ applicationId, teamId?, scores }`)  
  - Teams: `GET/POST /api/teams`, `GET/PATCH/DELETE /api/teams/:id` (PATCH body: `{ name?, externalId? }`; delete removes the team and unlinks from applications)
  - **ServiceNow Integration:** `POST /api/integrations/servicenow/sync` (sync applications), `POST /api/integrations/servicenow/sync/teams` (sync teams), `POST /api/integrations/servicenow/sync/assessment` (export assessment), `GET /api/integrations/servicenow/status` (check connection)
  - **PowerBI Integration:** `POST /api/integrations/powerbi/export` (export data), `GET /api/integrations/powerbi/status` (check connection), `GET /api/integrations/powerbi/datasets` (list datasets)

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

**Required Environment Variables:**
- `DATABASE_URL` - Automatically set when you add PostgreSQL
- `PORT` - Automatically set by Railway (defaults to 3000)
- `NODE_ENV` - Set to `production` (optional, defaults to `development`)

**Optional Integration Variables:**
If you want to use ServiceNow or PowerBI integrations, add these to Railway project variables:

**ServiceNow:**
- `SERVICENOW_BASE_URL` - Your ServiceNow instance URL (e.g., `https://your-instance.service-now.com`)
- `SERVICENOW_USER` - API user username (for Basic Auth)
- `SERVICENOW_PASSWORD` - API user password (for Basic Auth)
- Or use OAuth:
  - `SERVICENOW_CLIENT_ID` - OAuth client ID
  - `SERVICENOW_CLIENT_SECRET` - OAuth client secret

**PowerBI:**
- `POWERBI_CLIENT_ID` - Azure AD Service Principal client ID
- `POWERBI_CLIENT_SECRET` - Azure AD Service Principal client secret
- `POWERBI_TENANT_ID` - Azure AD tenant ID
- `POWERBI_WORKSPACE_ID` - PowerBI workspace ID (optional, uses default workspace if not set)

No code changes needed; ensure all secrets are in Railway project variables.

## Integrations

AppCompass supports integrations with ServiceNow and PowerBI to sync data and enable advanced reporting.

### ServiceNow Integration

Sync applications and teams from ServiceNow CMDB and export maturity assessments back to ServiceNow.

**Setup:**
1. Configure ServiceNow credentials in `.env` (see Environment section above)
2. Use Basic Auth (username/password) or OAuth (client ID/secret)

**API Endpoints:**
- `POST /api/integrations/servicenow/sync` - Sync applications from ServiceNow CMDB (body: `{ tableName?, query?, preserveManualEdits? }`)
- `POST /api/integrations/servicenow/sync/teams` - Sync teams from ServiceNow (body: `{ tableName?, query? }`)
- `POST /api/integrations/servicenow/sync/assessment` - Export assessment to ServiceNow (body: `{ applicationId, tableName? }`)
- `GET /api/integrations/servicenow/status` - Check ServiceNow connection status

**Usage:**
- Applications are synced from the `cmdb_ci_appl` table by default
- Teams are synced from the `sys_user_group` table by default
- Use `externalId` to link AppCompass records to ServiceNow `sys_id`
- Set `preserveManualEdits: true` to avoid overwriting manual changes

### PowerBI Integration

Export maturity assessment data to PowerBI for visualization and reporting.

**Setup:**
1. Create an Azure AD Service Principal with PowerBI API permissions
2. Configure PowerBI credentials in `.env` (see Environment section above)

**API Endpoints:**
- `POST /api/integrations/powerbi/export` - Export all data to PowerBI (body: `{ clearExisting?, datasetName? }`)
- `GET /api/integrations/powerbi/status` - Check PowerBI connection status
- `GET /api/integrations/powerbi/datasets` - List available PowerBI datasets

**Data Exported:**
- Applications table: ApplicationId, Name, Type, Description, ExternalId, Source, CreatedAt, UpdatedAt
- Assessments table: AssessmentId, ApplicationId, TeamId, AssessmentDate, OverallScore, MaturityLevel, ScoresSnapshot, Status
- Teams table: TeamId, Name, ExternalId
- ApplicationTeams table: ApplicationId, TeamId, Role

**Usage:**
- Data is exported to a PowerBI dataset named "SDLC Maturity Tracker" by default
- Set `clearExisting: true` to replace all data in the dataset
- The dataset is created automatically if it doesn't exist

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) – Module layout and where to change what.
- [SCREENSHOTS.md](docs/SCREENSHOTS.md) – Guidelines for capturing UI screenshots.
- FFIEC alignment: [Development, Acquisition, and Maintenance](https://ithandbook.ffiec.gov/it-booklets/development-acquisition-and-maintenance/).
