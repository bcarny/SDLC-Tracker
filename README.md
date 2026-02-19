# AppCompass

**Navigating the wild landscape of our software lifecycle.**

AppCompass captures existing SDLC maturity across your organization's application landscape using FFIEC-aligned criteria, enabling you to build data-driven roadmaps for improvement. **Organizations** group applications and teams; each application belongs to one organization. The app starts with **organization selection**: you choose (or create) an organization, then view and manage its applications, run assessments, and compare maturity within that context. Use **Switch organization** to change context. Track maturity over time, compare across applications and teams, and export data for integration with ServiceNow, Power BI, and other tools.

## User Interface

AppCompass provides an intuitive interface for tracking application maturity across your organization.

### Organization picker (entry)

When you open the app, you first select an organization from the list (or create one if none exist). **Create, edit, and delete organizations** are done on this entry screen only—management of orgs does not happen inside an existing org. The picker shows a **Create organization** form and a list of org cards (name, application/team counts, **Open**, **Edit**, **Delete**). Click **Open** to work within that organization. Use **Switch organization** in the header to return to the picker and manage orgs or choose another org. The selected organization is reflected in the URL (`?organizationId=...`) so you can bookmark or share a link to a specific org.

### App flow

```mermaid
flowchart LR
    Entry[Organization Picker] --> Main[Main Dashboard]
    Main --> Applications[Applications]
    Main --> Comparison[Comparison]
    Main --> Teams[Teams]
    Main --> Docs[Docs]
    Applications --> Detail[Application Detail]
    Detail --> Assessment[Assessment Form]
```

### Main views

| View | Description |
|------|-------------|
| **Applications** | Overview of all applications with maturity scores, grouped by team. Add applications, filter by type/source, and open assessments. |
| **Application Detail** | View application details, linked teams, assessment history, and run maturity assessments. |
| **Maturity Assessment** | FFIEC-aligned form with 17 criteria across 8 categories: Requirements & Planning, Design & Architecture, Development & Code Quality (including AI Coding Assistants & Agentic Development), Testing & Quality Assurance, Security & Compliance, Deployment & Release, Operations & Monitoring, Governance & Documentation. |
| **Comparison** | Radar chart and score table comparing maturity across applications. |
| **Teams** | Manage teams and see which applications they maintain. |
| **Docs** | User guide and API reference for integrations. |

### Global search

A search bar in the header is visible on all pages. Use it to quickly find and navigate to organizations, applications, and teams.

```mermaid
flowchart TB
    Search[Search Bar - Cmd+K] --> API["GET /api/search?q=..."]
    API --> Results[Results Overlay]
    Results --> Org[Organizations]
    Results --> App[Applications]
    Results --> Team[Teams]
    Facets[Faceted Filters] --> API
```

- **Placement:** Header (right-aligned), available when selecting orgs or working inside an org.
- **Search types:** Faceted, fuzzy (typo-tolerant), and keyword search across organizations, applications, and teams.
- **Keyboard shortcut:** Cmd+K (Mac) or Ctrl+K (Windows/Linux) to focus the search bar.
- **Filters:** Entity type (Organization, Application, Team), application type (Custom, SaaS, COTS), source (manual, ServiceNow), and optional "Current org only" when inside an organization.
- **Results:** Grouped by type; click a result to navigate to that entity.

To add screenshots later, run the app (`npm run dev`), capture views, and save PNGs to `docs/images/`.

## Prerequisites

- Node.js 18+
- PostgreSQL (local or Docker)

## npm warnings and vulnerabilities

- **`npm warn Unknown env config "devdir"`** — This comes from your local npm config (or environment), not from this project. You can ignore it or run `npm config delete devdir` to remove it.
- **`npm audit` reports moderate vulnerabilities** — All reported issues are in **dev-only** dependencies and do not affect production runtime:
  - **ESLint** (ajv): Used for lint config validation. Fixing would require downgrading ESLint and breaking the tooling.
  - **Prisma CLI** (hono, lodash): Used only for `prisma generate`, `prisma migrate`, and `prisma studio`. Fixing would require downgrading Prisma and breaking compatibility with `@prisma/client`. Your running app uses only the generated client.
  Do not run `npm audit fix --force`; it would downgrade ESLint and Prisma and break the project. In a production deploy (`npm install --omit=dev`), only runtime dependencies are installed; the Prisma CLI and ESLint are not, so those advisories do not apply at runtime.

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
  - **Organizations:** `GET/POST /api/organizations`, `GET/PATCH/DELETE /api/organizations/:id` (POST/PATCH body: `{ name, description? }`). Applications and teams are scoped by organization; create at least one organization before adding applications or syncing from ServiceNow.  
  - **Search:** `GET /api/search?q=...` – Global search with faceted, fuzzy, and keyword support. Query params: `q` (required), `entityType`, `appType`, `appSource`, `organizationId`.
  - **Applications:** `GET/POST /api/applications`, `GET/PATCH/DELETE /api/applications/:id`. List supports `?organizationId=`, `?type=`, `?source=`. POST body: `{ organizationId, name, description?, type, externalId?, source?, dimensions? }`. PATCH body: `{ name?, description?, type?, externalId?, source?, dimensions? }`.  
  - Link teams: `POST /api/applications/:id/teams` (body: `{ teamId, role? }`), `DELETE /api/applications/:id/teams/:teamId`  
  - **Assessments:** `GET /api/applications/:id/assessments` (all assessments for history), `POST /api/assessments` (body: `{ applicationId, teamId?, scores }`)  
  - **Teams:** `GET/POST /api/teams`, `GET/PATCH/DELETE /api/teams/:id` (PATCH body: `{ name?, externalId? }`; delete removes the team and unlinks from applications). Teams may be associated with an organization via `organizationId`.  
  - **ServiceNow Integration:** `POST /api/integrations/servicenow/sync` (sync applications), `POST /api/integrations/servicenow/sync/teams` (sync teams), `POST /api/integrations/servicenow/sync/assessment` (export assessment), `GET /api/integrations/servicenow/status` (check connection). **Prerequisite:** Create at least one organization; new applications from ServiceNow are assigned to the first organization.  
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
- Applications table: ApplicationId, Name, Type, Description, ExternalId, Source, CreatedAt, UpdatedAt (applications are scoped by organization in the API; use `GET /api/applications?organizationId=...` to filter)
- Assessments table: AssessmentId, ApplicationId, TeamId, AssessmentDate, OverallScore, MaturityLevel, ScoresSnapshot, Status
- Teams table: TeamId, Name, ExternalId
- ApplicationTeams table: ApplicationId, TeamId, Role

**Usage:**
- Data is exported to a PowerBI dataset named "SDLC Maturity Tracker" by default
- Set `clearExisting: true` to replace all data in the dataset
- The dataset is created automatically if it doesn't exist

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) – Module layout and where to change what.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) – CI/CD pipeline (dev → prod) and GitHub Actions setup.
- FFIEC alignment: [Development, Acquisition, and Maintenance](https://ithandbook.ffiec.gov/it-booklets/development-acquisition-and-maintenance/).
