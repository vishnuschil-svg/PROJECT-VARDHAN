# OCR Runtime Contract

The local OCR path is intentionally fixed to one contract:

- Frontend adapter: `POST /api/v1/ocr/extract`
- Vite proxy: `/api` -> `http://127.0.0.1:8000` (no rewrite)
- FastAPI router: `/api` + `/v1/ocr/extract`

Backend configuration is loaded automatically from `backend/.env` (with root `.env` as fallback).
The OCR route requires all three safe readiness checks:

1. `DATABASE_URL` connects successfully.
2. Supabase JWT verification is configured through `SUPABASE_URL`/JWKS or the
   legacy `SUPABASE_JWT_SECRET` path.
3. `GEMINI_API_KEY` is configured.

`GET /api/health` reports only booleans for `database`, `jwt`, and `ocrProvider`; it never returns secret values.

The frontend now displays the backend's exact safe error detail instead of replacing every 503 with a generic OCR failure.

## Authenticated integration test data

The live integration runner reads test credentials only from the ignored
`backend/.env.test.local` file and uses the synthetic
`backend/tests/fixtures/synthetic_chit_receipt.png` fixture. Neither file
contains production customer data.

The development database contains a dedicated `demo_sandbox` workspace named
`VARDHAN OCR Integration Sandbox`. The configured test user has an active
`viewer` membership, which is the least-privileged role needed to exercise the
authenticated OCR endpoint. This workspace and membership are development/test
data only; they must not be promoted to or treated as production tenant data.
