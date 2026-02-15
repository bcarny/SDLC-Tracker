# SDLC Maturity Tracker – Architecture

## Module map

```
src/
├── index.ts              # Entry: loads env, starts HTTP server
├── app.ts                # Express app: mounts routes, no DB/env
├── config/
│   ├── env.ts            # Environment validation (Zod)
│   └── db.ts             # Prisma client singleton
├── routes/               # HTTP only: validate input, call services, return JSON
│   ├── healthRoutes.ts
│   └── applicationRoutes.ts
├── services/             # Use-case logic: call repositories, no HTTP/DB details
│   ├── healthService.ts
│   └── applicationService.ts
├── repositories/         # All DB access per entity (Prisma)
│   ├── applicationRepository.ts
│   └── teamRepository.ts
└── integrations/         # (Future) ServiceNow, Power BI clients – one entry per system
```

## Data flow

- **Request** → route (validation) → service → repository → Prisma → DB
- **Response** ← route ← service ← repository

Routes do not call repositories directly. External systems are used only from `integrations/` and called by services.

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
