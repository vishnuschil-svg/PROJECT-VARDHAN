# VARDHAN Chit Pro — Operations Runbook

## Health checks

| Check | Endpoint / location |
|---|---|
| API liveness | `GET /api/health` |
| Database | health payload `database` boolean |
| JWT configured | health payload `jwt` |
| OCR key present | health payload `ocrProvider` (config only, not live Gemini call) |
| Ingestion queue | Inspect `INGESTION_QUEUE_BACKEND` + job table / SQLite file |

Do not expose raw DB/provider errors to customers. Map to domain codes (`OCR_RATE_LIMIT`, `DOCUMENT_UNREADABLE`, `AUTH_REQUIRED`, etc.).

## Common failures

| Symptom | Action |
|---|---|
| Gemini 429 / RATE_LIMITED | Continue with local draft + review; do not invent results; wait for quota |
| Tesseract missing | Install Tesseract + `eng`/`tel` packs; XLSX/CSV/digital PDF still work |
| LibreOffice missing | Legacy DOC conversion unavailable; ask for DOCX/PDF |
| Job lost after restart (prod) | Switch to Postgres queue adapter (`docs/VARDHAN_INGESTION_QUEUE_PRODUCTION_MIGRATION.md`) |
| Duplicate collection blocked | Expected — idempotency/duplicate guard working |
| Trial limit reached | Archive/complete groups or upgrade ₹99/199/299 plan |

## Maintenance mode

Prefer read-only subscription mode after trial expiry (data preserved). For full maintenance, stop writers at API gateway and keep Supabase read access.

## Backup / restore

- Supabase: use platform backup for durable money-path tables.
- Ingestion queue: Postgres `ingestion_jobs` + object/file store for binaries.
- Local SQLite: copy `backend/data/ingestion_queue.db` and `ingestion_files/`.

## Rollback

1. Redeploy previous API/frontend artifact.
2. Do not force-reset databases.
3. Leave secrets unchanged unless rotating credentials intentionally.

## Security

- All Chit APIs require auth + workspace header.
- Ingestion jobs are tenant-scoped on read/update.
- Immutable audit/receipts: correct via reversal entries, never silent edits.
