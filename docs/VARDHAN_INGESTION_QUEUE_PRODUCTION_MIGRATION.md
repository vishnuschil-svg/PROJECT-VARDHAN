# VARDHAN Ingestion Queue — Production Migration

## Goal

Keep the local SQLite adapter for development. Add a production-safe Postgres adapter so ingestion jobs survive backend restart and multi-instance deploys.

## Adapters

| Backend | Class | When used |
|---|---|---|
| `sqlite` | `IngestionQueueStore` | Default local/dev |
| `postgres` | `PostgresIngestionQueueStore` | Production / explicit config |

Factory: `backend/ingestion/queue/factory.py` → `create_ingestion_queue_store()`.

## Configuration (server-side only)

| Env | Purpose |
|---|---|
| `INGESTION_QUEUE_BACKEND` | `sqlite` or `postgres` (optional override) |
| `DATABASE_URL` | Postgres DSN for production queue |
| `APP_ENV` / `ENVIRONMENT` | When `production` + `DATABASE_URL`, factory selects postgres |
| `INGESTION_QUEUE_PATH` | SQLite file path (local only) |

Never put queue credentials in `VITE_*` variables.

## Operational behavior

1. Upload creates a durable job row (`UPLOADED`).
2. Source bytes are stored under `backend/data/ingestion_files/{jobId}.bin` (local) or beside the configured SQLite path.
3. Processing updates status through `ROUTED` → `PARSING` / `PROCESSING_LOCAL_OCR` → optional `PROCESSING_AI` → `NEEDS_REVIEW`.
4. Postgres `claim_next` uses `FOR UPDATE SKIP LOCKED` for multi-worker safety.
5. SHA-256 + tenant + parserVersion + schemaVersion dedupe remains identical across adapters.
6. Gemini `RATE_LIMITED` preserves local draft on both adapters.

## Migration steps

1. Ensure `DATABASE_URL` is set on the API host.
2. Install `psycopg[binary]` (listed in `requirements.txt`).
3. Set `INGESTION_QUEUE_BACKEND=postgres` or `APP_ENV=production`.
4. Restart API. Schema `ingestion_jobs` is created idempotently.
5. Smoke-test: upload one CSV via `/chits/ingest`, restart API, confirm job still loads.
6. Do **not** delete the SQLite adapter.

## Rollback

1. Set `INGESTION_QUEUE_BACKEND=sqlite`.
2. Restart API.
3. New jobs use SQLite; historical Postgres jobs remain in the database for audit.

## Notes

- Existing Universal File Ingestion Engine adapters/parsers are unchanged.
- Frontend continues to call `/api/v1/ingestion/*` only.
