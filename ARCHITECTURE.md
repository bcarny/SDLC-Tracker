# SDLC Maturity Tracker – Architecture

## Module map

```
src/
├── index.ts              # Entry: loads env, starts HTTP server
├── app.ts                # Express app: mounts routes, no DB/env
├── config/
│   ├── env.ts            # Environment validation (Zod)
│   └── db.ts             # Prisma client singleton
├── routes/
│   ├── healthRoutes.ts
│   ├── applicationRoutes.ts   # apps + :id/teams, :id/assessments
│   ├── teamRoutes.ts
│   └── assessmentRoutes.ts    # POST / (applicationId, teamId?, scores)
├── services/
│   ├── healthService.ts
│   ├── applicationService.ts  # addTeamToApplication, removeTeamFromApplication
│   ├── teamService.ts
│   └── assessmentService.ts  # getAssessmentsForApplication, saveAssessment
├── repositories/
│   ├── applicationRepository.ts  # addTeam, removeTeam; list includes assessments
│   ├── teamRepository.ts
│   └── assessmentRepository.ts   # listByApplication, create
└── integrations/         # ServiceNow, PowerBI clients – one entry per system
    ├── servicenow/
    │   ├── servicenowClient.ts      # REST API client
    │   ├── servicenowSyncService.ts # Sync logic (import/export)
    │   ├── servicenowMapper.ts      # Map ServiceNow ↔ AppCompass models
    │   └── servicenowRoutes.ts      # API endpoints
    └── powerbi/
        ├── powerbiClient.ts         # REST API client with OAuth
        ├── powerbiExportService.ts  # Data transformation and export
        ├── powerbiMapper.ts         # Map AppCompass data to PowerBI schema
        └── powerbiRoutes.ts         # API endpoints
```

## Data flow

- **Request** → route (validation) → service → repository → Prisma → DB
- **Response** ← route ← service ← repository

**Application-first model:** Applications are the primary entity. Teams are linked to applications (many-to-many). Assessments belong to an application and optionally to a team (application-level vs team-level). Not all applications can reach the same maturity (e.g. SaaS, COTS); the UI supports assessing at both application and team scope.

## Where to change what

| Change | Location |
|--------|----------|
| New API endpoint | Add in `routes/`, call existing or new service |
| New business rule | `services/` |
| New query or table usage | `repositories/` |
| Env vars | `config/env.ts` (schema) and `.env.example` |
| ServiceNow / Power BI | `integrations/` (and services that call them) |

## Tests

- **Unit:** `src/**/*.test.ts` – mock repositories and integrations.
- **Integration:** API tests against test DB (see `src/app.test.ts` for pattern with mocked DB).
- **E2E:** Critical flows via API or browser (future).

Run: `npm test`
