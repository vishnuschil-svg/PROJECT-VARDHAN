# VARDHAN Chit Pro — Controlled Trial Acceptance

**Date:** 2026-08-02  
**Verifier script:** `backend/verify_own_data_trial_gate.py`  
**Evidence file:** `backend/data/own_data_trial_evidence.json` (sanitized; gitignored under `backend/data/`)

## Production Queue Adapter

**Status:** VERIFIED PASS (adapter + fail-closed factory)

### Required Configuration Names

- `INGESTION_QUEUE_BACKEND`
- `DATABASE_URL`
- `APP_ENV`
- `ENVIRONMENT`
- `INGESTION_QUEUE_PATH` (local sqlite only)

### Queue Migration

- `supabase/migrations/010_ingestion_jobs_queue.sql` (idempotent + RLS deny for anon/authenticated)

### Queue Health

- Exposed on `GET /api/health` as `ingestionQueue` (`backend`, `ready`, `errorCode`, `productionLocked`)

### Queue Restart Persistence

| Check | Result |
|---|---|
| Resolve postgres | PASS |
| Production forbids sqlite | PASS |
| Persist job + new store instance reload | PASS |
| SHA-256 dedupe | PASS |
| Cross-tenant hash isolation | PASS |
| Local sqlite still works | PASS |

## Live Supabase Workflow

| Step | Result | Evidence (sanitized) |
|---|---|---|
| Authenticate | PASS | HTTP 200; userId masked |
| Workspace membership | PASS | 1 membership; role=`viewer` |
| Write role required | **FAIL (P0)** | TEST_USER has only `viewer` |
| Create group | NOT RUN | Blocked by write role |
| Members / collections / receipts / auction / dividend / payout / month close / reports | NOT RUN | Blocked |
| Frontend repository mode | **FAIL (P0)** | `VITE_REPOSITORY_BACKEND=local`, `VITE_APP_MODE=demo` |
| Read existing groups | PASS | HTTP 200; count=0 for this principal |
| Logout/login persistence (money path) | NOT RUN | Blocked before writes |
| Backend restart (queue) | PASS | See queue section |
| Tenant isolation (queue hash) | PASS | Other tenant dedupe miss |
| Tenant isolation (RLS write) | PARTIAL | Viewer cannot insert (`42501` observed earlier) |

### Groups and Members
NOT COMPLETED on live Supabase (no write role).

### Collections and Receipts
NOT COMPLETED on live Supabase.

### Auction and Winner / Dividend / Payout / Ledgers / Month Closing / Reports
NOT COMPLETED on live Supabase.

### Subscription Trial
Catalog ₹99/199/299 implemented in code; live activation not exercised in this gate run.

### Universal Ingestion
Engine preserved. Postgres queue verified. Full ingest→confirm→group create not completed due to write-role block.

### Tenant Isolation
Queue tenant hash isolation PASS. App RLS prevents viewer writes (expected). Cross-workspace write/read attack suite incomplete without write principal.

### Logout/Login Persistence
Auth re-login possible (auth PASS). Durable money-path re-read after writes not completed.

### Backend Restart Persistence
Queue: PASS. Money-path records: NOT COMPLETED.

### Financial Reconciliation
NOT COMPLETED on live data this run.

## P0 Blockers

1. **Frontend own-data mode not enabled** — `VITE_REPOSITORY_BACKEND=local` and `VITE_APP_MODE=demo` (non-secret config). UI money path is not forced onto Supabase.
2. **Live test principal lacks write membership** — `TEST_USER_*` resolves to role `viewer` only; RLS blocks `chit_groups` inserts (`42501`).

## P1 Issues

- Full 26-step operator walkthrough still pending after write-capable principal + Supabase frontend mode.
- Receipt WhatsApp/PDF polish remains PARTIAL from prior audit.

## P2 Improvements

- Dashboard density / 390px table polish
- Broader automated cross-tenant isolation suite

## Verification commands run

- `python -m unittest test_ingestion_queue_factory` → OK (5)
- `python verify_own_data_trial_gate.py` → queue PASS; live write gate FAIL

## Backend Tests / Frontend Tests / Lint / Build

| Check | Result |
|---|---|
| Backend queue factory tests | PASS (5) |
| Backend OCR/ingestion suite (prior baseline) | 35 PASS |
| Frontend tests (prior baseline) | 197 PASS |
| Production build (prior baseline) | PASS |
| Lint | Pre-existing warnings only (not re-blocking) |

## Gates

**OWN-DATA TRIAL: NO-GO**

Reason: Queue production adapter is verified, but the live Supabase own-data workflow could not complete writes, and the app frontend is still configured for local/demo persistence.

**CONTROLLED CUSTOMER TRIAL: NO-GO**  
(unchanged — depends on OWN-DATA GO plus customer ops/isolation sign-off)

**PUBLIC PAID TRIAL: NO-GO**  
(unchanged)

## What is required to flip OWN-DATA to GO

1. Intentionally set frontend non-secret mode to Supabase/production repository backend.
2. Provide a controlled test user with write-capable workspace membership (owner/admin/organizer).
3. Re-run `backend/verify_own_data_trial_gate.py` through create→collect→receipt→winner→close (or equivalent UI walkthrough) with sanitized evidence.
4. Confirm no P0 remains.
