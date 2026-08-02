# VARDHAN Ingestion Queue — Production Migration

## Goal

Keep the local SQLite adapter for development. Use Postgres/Supabase for production so ingestion jobs survive backend restart and multi-instance deploys. **Production never silently falls back to SQLite.**

## Adapters

| Backend | Class | When used |
|---|---|---|
| `sqlite` | `IngestionQueueStore` | Local/dev only |
| `postgres` | `PostgresIngestionQueueStore` | Production / explicit `postgres` |

Factory: `backend/ingestion/queue/factory.py` → `create_ingestion_queue_store()` / `resolve_queue_backend()`.

## Required environment-variable NAMES only

| Name | Required for | Notes |
|---|---|---|
| `INGESTION_QUEUE_BACKEND` | Optional override | `sqlite` or `postgres` |
| `DATABASE_URL` | Postgres queue | Server-side DSN; never `VITE_*` |
| `APP_ENV` | Environment lock | `production` / `prod` forces Postgres |
| `ENVIRONMENT` | Alternate env lock | Same as `APP_ENV` if `APP_ENV` unset |
| `INGESTION_QUEUE_PATH` | SQLite only | Local file path |

Related (not queue-specific, but needed for API auth/OCR):

| Name |
|---|
| `SUPABASE_JWT_SECRET` |
| `SUPABASE_JWT_AUDIENCE` |
| `SUPABASE_URL` |
| `GEMINI_API_KEY` |
| `GEMINI_MODEL` |

## Fail-closed rules

1. `APP_ENV`/`ENVIRONMENT` in `{production, prod}` **rejects** `INGESTION_QUEUE_BACKEND=sqlite`.
2. `postgres` backend **requires** `DATABASE_URL` or factory raises `IngestionQueueConfigurationError`.
3. Local/dev without override continues to use SQLite.

## Migration

SQL migration (idempotent): `supabase/migrations/010_ingestion_jobs_queue.sql`

- Creates `public.ingestion_jobs`
- Indexes for batch, hash dedupe, status, tenant/workspace
- Enables RLS with deny-all for `anon`/`authenticated` (backend/service role uses `DATABASE_URL`)

The Postgres adapter also creates the table idempotently on first connect if migration has not been applied yet.

## Health

`GET /api/health` includes:

```json
"ingestionQueue": {
  "backend": "sqlite|postgres|unknown",
  "ready": true,
  "errorCode": null,
  "productionLocked": false
}
```

No DSNs or secrets are returned.

## Verification evidence (2026-08-02)

| Check | Result |
|---|---|
| Resolve postgres | PASS |
| Production forbids sqlite | PASS |
| Queue restart persistence (new store instance) | PASS |
| SHA-256 dedupe | PASS |
| Cross-tenant hash isolation | PASS |
| Local sqlite still available | PASS |

## Operational steps

1. Apply `010_ingestion_jobs_queue.sql` (or allow adapter auto-create).
2. Install `psycopg[binary]` on the API host.
3. Set `DATABASE_URL`.
4. Set `INGESTION_QUEUE_BACKEND=postgres` and/or `APP_ENV=production`.
5. Restart API; confirm health `ingestionQueue.backend=postgres` and `ready=true`.
6. Upload one file via `/api/v1/ingestion/jobs`, restart API, confirm job still loads.

## Rollback

1. Only in non-production: set `INGESTION_QUEUE_BACKEND=sqlite`.
2. Production rollback of queue backend requires changing `APP_ENV` out of production **or** keeping Postgres; SQLite is forbidden while production-locked.
