# VARDHAN Chit Pro — Operations Runbook

## Health checks

| Check | Endpoint / location |
|---|---|
| API liveness | `GET /api/health` |
| Database | `database` boolean |
| JWT configured | `jwt` boolean |
| OCR key present | `ocrProvider` boolean (config only) |
| Ingestion queue | `ingestionQueue.backend` / `ingestionQueue.ready` |

Never expose raw DB/provider errors or secret values to customers.

## Queue configuration NAMES

- `INGESTION_QUEUE_BACKEND`
- `DATABASE_URL`
- `APP_ENV`
- `ENVIRONMENT`
- `INGESTION_QUEUE_PATH` (sqlite/local only)

Production must use Postgres. Invalid production queue config fails closed (`IngestionQueueConfigurationError`).

## Common failures

| Symptom | Action |
|---|---|
| `ingestionQueue.ready=false` in production | Check `DATABASE_URL`, `psycopg`, network to Postgres |
| Gemini 429 / RATE_LIMITED | Continue with local draft + review; do not invent results |
| RLS 42501 on writes | User role lacks write permission (viewer cannot create groups) |
| Frontend still local/demo | Set non-secret mode vars to Supabase/production intentionally before own-data UI trial |
| Job lost after restart (prod) | Ensure Postgres queue; SQLite is forbidden in production |

## Maintenance mode

Prefer read-only subscription mode after trial expiry (data preserved). For full maintenance, stop writers at API gateway and keep Supabase read access.

## Backup / restore

- Supabase: platform backup for durable money-path tables.
- Ingestion queue: Postgres `ingestion_jobs` (+ file store for binaries).
- Local SQLite: copy `backend/data/ingestion_queue.db` and `ingestion_files/`.

## Rollback

1. Redeploy previous API/frontend artifact.
2. Do not force-reset databases.
3. Leave secrets unchanged unless rotating credentials intentionally.

## Security

- All Chit APIs require auth + workspace header.
- Ingestion jobs are tenant-scoped on read/update.
- Browser clients are denied direct `ingestion_jobs` access via RLS deny policies.
- Immutable audit/receipts: correct via reversal entries, never silent edits.
