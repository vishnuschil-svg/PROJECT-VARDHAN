# VARDHAN CHIT MANAGEMENT PRO â€” Production Closure Audit

**Product:** VARDHAN CHIT MANAGEMENT PRO (short: VARDHAN CHIT PRO)
**Previous working title in Batch 1 docs:** MITRA NIDHI CHITI PRO (historical references preserved below)
**Baseline commit:** `2496b486561dc630ecf0357be545ec92cc240673` (`main`)
**Audit date:** 2026-08-02
**Scope:** VARDHAN CHIT MANAGEMENT PRO only (School/College ERP excluded)
**Method:** Code, repository wiring, Supabase migrations, and existing automated tests. No guessed status.
**Brand note:** Database tables, API routes, repository keys, and historical audit IDs are **not** renamed for branding.

---

## 1. Current production architecture

| Layer | Implementation |
| --- | --- |
| Frontend | Vite React SPA on Vercel |
| API | Vercel rewrite `/api/*` â†’ `api/index.py` â†’ FastAPI `backend/main.py` |
| Auth / DB | Supabase Auth + Postgres (migrations `000`â€“`006`) |
| OCR | Authenticated `POST /api/v1/ocr/extract` (Gemini); unauthenticated â†’ 401 |
| Rate limit | Redis-backed in production (`backend/rate_limit.py`) |
| Repository gate | `src/config/repositoryBackend.js` forces Supabase in production |
| Provider wiring | `repositoryProvider.js` exposes Groups, Members, Collections, Receipts, Finance, Auction, Payout, Ledger, Winners, LuckyDraws |

**Critical gap (preâ€“Batch 1):** Most money and lifecycle services imported `repositories/chits/*` or `scopedStorageRepository` directly, so production still persisted many records to browser `localStorage` even though the gate forbids configuring a local backend.

---

## 2. Workflow classification (40)

| # | Workflow | Classification | Evidence |
| --- | --- | --- | --- |
| 1 | Business onboarding / workspace creation | PARTIAL | `WorkspaceRepository` + license helpers exist; workspace active id still uses `localStorage` |
| 2 | Customer / business separation | PARTIAL | Tenant/`data_scope` context exists; many pages still load local lists |
| 3 | User roles / permission matrix | PARTIAL | `PermissionService` + `RolePermissionRepository` (scopedStorage) |
| 4 | Subscription / licence enforcement | PARTIAL | `licenseService` / `LicenseRepository`; needs production verification of enforcement on every launch path |
| 5 | Chit group creation | PARTIAL â†’ COMPLETE* | `ChitGroups.jsx` uses `*Persistent` helpers; schema + RLS present |
| 6 | Flexible chit-plan rules | PARTIAL | Rule/schedule engines + `ChitRuleRepository` (local); Supabase `chit_rules` exists but not wired from UI services |
| 7 | Member onboarding / history | COMPLETE* (Batch 1) | `Members.jsx` â†’ `*Persistent` helpers + Supabase `chit_members` |
| 8 | Smart import / OCR capture | COMPLETE (OCR path) / PARTIAL (import) | Production OCR authenticated; import/capture repos largely scopedStorage |
| 9 | Collections / instalment validation | COMPLETE* (Batch 1) | Async `recordCollectionPayment` + persistent collections/receipts/finance/ledger |
| 10 | Receipt generation / print / PDF / share | PARTIAL â†’ COMPLETE* (persist) | Client share/print remain; durable `chit_receipts` via Batch 1 mappers |
| 11 | Pending collections | COMPLETE* (Batch 1) | `useTenantCollections` loads persistent collections |
| 12 | Member ledger / passbook | COMPLETE* (Batch 2) | Authoritative ledger entries + `buildAuthoritativeMemberLedger` |
| 13 | Auction workflow | COMPLETE* (Batch 2) | Durable auctions + RPC winner confirm; schedule/rules still local |
| 14 | Lucky-draw workflow | COMPLETE* (Batch 2) | Durable `lucky_draws` + randomness metadata + RPC confirm |
| 15 | Winner locking / history | COMPLETE* (Batch 2) | `chit_winners` + uniqueness + immutability trigger + authorized cancel |
| 16 | Payout workflow | COMPLETE* (Batch 2) | Durable payouts + payment RPC idempotency + winner linkage |
| 17 | Dividends | LOCAL-ONLY / PARTIAL | UI + local patterns; `chit_dividends` table exists |
| 18 | Expenses | LOCAL-ONLY | `ExpenseRepository` scopedStorage + local Finance writes; `expenses` table exists |
| 19 | Investors | LOCAL-ONLY / NOT IMPLEMENTED (DB) | `InvestorRepository` scopedStorage; no `investors` table in migrations |
| 20 | Finance and accounts | COMPLETE* (money path Batch 1â€“2) | Collection/winner/payout finance via persistent helpers/RPCs; other finance UI may still mix |
| 21 | Payment modes | LOCAL-ONLY | `PaymentSettingsRepository` scopedStorage; table `payment_settings` exists |
| 22 | Batches | LOCAL-ONLY | `BatchRepository` scopedStorage |
| 23 | Notifications / communication jobs | LOCAL-ONLY / PARTIAL | Local notification store; Communication Center documents provider gaps |
| 24 | Reports / exports | LOCAL-ONLY / PARTIAL | Local `ReportsRepository`; validators exist; no durable export pipeline verified |
| 25 | Month closing | LOCAL-ONLY | `MonthClosingRepository` scopedStorage; `month_closing` table exists |
| 26 | Chit completion | LOCAL-ONLY | `ChitCompletionRepository` scopedStorage |
| 27 | Business Health dashboard | PARTIAL | Aggregates from mixed local sources; not production-durable |
| 28 | Audit trail / activity history | LOCAL-ONLY | `ActivityRepository` localStorage |
| 29 | Settings | PARTIAL | Mix of local settings / supabase `chit_settings` |
| 30 | Backup / import / export | PARTIAL | Migration engine + local import sessions; production cutover not verified |
| 31 | Mobile responsiveness | PARTIAL | Layout/CSS present; needs production device verification |
| 32 | Loading / empty / error states | PARTIAL | Present on many pages; inconsistent async/error handling on money paths |
| 33 | Duplicate prevention | PARTIAL | CollectionEngine duplicate checks; DB unique on `(tenant_id, data_scope, receipt_no)` â€” unused while local |
| 34 | Tenant / workspace isolation | PARTIAL | RLS SQL + tenant scope helpers; localStorage paths rely on client scope keys only |
| 35 | Supabase production persistence | PARTIAL | Groups path wired; money path and most lifecycle entities not |
| 36 | Offline / localStorage fallback | MOCK/FALLBACK (unsafe in prod) | Gate blocks configuring local backend, but bypass imports still write localStorage |
| 37 | Security / authorization | PARTIAL | JWT + OCR auth + RLS scripts; role matrix local; demo-auth risks called out in prior audits |
| 38 | Performance | PARTIAL | Route splitting; money path sync localStorage hides latency until persistence is real |
| 39 | Accessibility | PARTIAL | Some labeled controls; no automated a11y gate in CI |
| 40 | Production monitoring / failure recovery | NEEDS PRODUCTION VERIFICATION | Health endpoint exists; alerting/backups/recovery drills not proven in this audit |

\*Items marked COMPLETE* were closed in Batch 1 / Batch 2; historical LOCAL-ONLY labels in earlier narrative sections below are retained as Batch 1 findings history.

---

## 3. Completed modules

- Production deploy path (Vercel remote build) and green CI verify/deploy.
- `/api/health` contracts: database, JWT, OCR provider.
- Authenticated Smart Chit Capture OCR (Gemini).
- Redis rate limiting with invalid-URL fallback (no import-time crash).
- Repository backend production gate (forbids configured local backend).
- Chit group create/list/update via `*Persistent` + Supabase `chit_groups`.
- Domain engines for collections, receipts, auctions, payouts, winners (calculation logic largely present).
- Supabase schema + RLS migration artifacts for core chit tables.

---

## 4. Partially completed modules

- Workspace/onboarding, licences, permissions (logic exists; durable role storage incomplete).
- Auctions, ledger, reports, settings, Business Health (UI/engines exist; mixed persistence).
- Smart import (OCR live; durable import session / apply path incomplete).
- Mobile / a11y / monitoring (present but not launch-certified).

---

## 5. Broken flows (historical Batch 1 findings â€” now closed for money path)

> Preserved from Batch 1 audit. Status after Batch 2: collection/member/receipt/finance/winner/payout/ledger durability closed; remaining broken areas are month close, completion, expenses, roles.

1. ~~**Collections save in production** wrote only to local browser storage~~ â†’ fixed Batch 1.
2. ~~**Receipt / finance side-effects** local + schema mismatches~~ â†’ fixed Batch 1.
3. ~~**Members** local-only while groups remote~~ â†’ fixed Batch 1.
4. ~~**Payout / winner confirmation** local finance / entities~~ â†’ fixed Batch 2 (RPC + `chit_winners`).
5. ~~**Root `CollectionsRepository` facade** never called provider~~ â†’ money path bypasses facade via Persistent helpers.

---

## 6. Local-only or mock behaviour

- Almost all `scopedStorageRepository` entities (winners, month close, completion, expenses, investors, lucky draw, batches, payment settings, role permissions, schedules, rules, activity, notifications, etc.).
- Root `PayoutRepository`, `LedgerRepository` (non-provider usage), `ReportsRepository`, `ActivityRepository`, `NotificationRepository`.
- Communication â€œjobsâ€ without configured WhatsApp/SMS/email providers (manual share fallback).

---

## 7. Missing Supabase persistence

| Entity | Table exists? | App wired to Supabase? |
| --- | --- | --- |
| Groups | Yes | Yes (page-level Persistent) |
| Members | Yes | No (Batch 1) |
| Collections | Yes | No (Batch 1) |
| Receipts | Yes | No (Batch 1) |
| Finance entries | Yes | No (Batch 1) |
| Auctions | Yes | Provider exists; services inconsistent |
| Payouts | Yes (`chit_payouts`) | Service uses scopedStorage |
| Ledger | Yes (`chit_ledger_entries`) | Incomplete |
| Dividends / lucky draws / month closing / expenses / payment settings | Yes | No |
| Investors | **No table** | Local only |
| Activity / notifications (app) | Partial/other tables | Local stores |
| Winners (dedicated) | No dedicated winners table | Local only |

---

## 8. Security gaps

- Client-side persistence bypass undermines RLS (data never reaches DB).
- Role/permission matrix in scopedStorage is not server-authoritative.
- Prior Phase 13 notes: demo auth / credentials must stay disabled in production.
- Service-role key must never ship to frontend (current client uses anon key â€” preserve).

---

## 9. Permission gaps

- `RolePermissionRepository` is local-only.
- Month reopen and some admin actions check permissions client-side only.
- No verified server-side permission enforcement for chit mutations beyond RLS tenant membership.

---

## 10. Production UX gaps

- Collections/Members pages assume sync local reads (no loading/error for remote persistence).
- Pending collections / payouts / auctions still hydrate from local lists in production.
- Empty states exist; durable â€œfailed to load from serverâ€ patterns incomplete on money pages.

---

## 11. P0 critical blockers

1. Collections / receipts / finance money path local-only in production (data loss).
2. Members local-only while groups may be remote (broken FK / split brain).
3. Supabase field-map mismatches for collections/receipts/finance.
4. Non-UUID local ids (`collection-${Date.now()}`) incompatible with UUID PKs.
5. Winner/payout finance side-effects local-only (incorrect books / lost obligations).
6. Bypass of `repositoryProvider` for money services.
7. Tenant leakage risk if any future direct queries omit scope (RLS helps only when data is in DB).

---

## 12. P1 launch requirements

1. Wire auctions, payouts, ledger, dividends through provider + schema mappers.
2. Persist winners (schema or metadata strategy) with lock history.
3. Month closing + chit completion durable.
4. Expenses + payment settings durable.
5. Role permissions durable + enforcement tests.
6. Pending collections / member pages fully async remote.
7. Reports durable exports + reconciliation against finance.
8. Activity/audit trail durable.
9. Communication providers or explicit â€œmanual-onlyâ€ production copy.
10. Production E2E of collect â†’ receipt â†’ finance â†’ pending â†’ payout.

---

## 13. P2 post-launch improvements

1. Investors schema + module.
2. Automated a11y / visual / real-device matrix.
3. Monitoring, backup drills, retention, deletion ops.
4. Offline-safe queue with explicit sync (not silent localStorage).
5. Performance budgets on financial dashboards.
6. Academy/support ticket centralization.

---

## 14. Exact files involved (Batch 1 focus)

- `src/config/repositoryBackend.js`
- `src/repositories/repositoryProvider.js`
- `src/repositories/CollectionsRepository.js`
- `src/repositories/supabase/{Collections,Receipts,Finance,Members}Repository.js`
- `src/services/chitDataService.js`
- `src/services/collectionService.js`
- `src/services/chitCollectionsStore.js`
- `src/services/{payoutService,winnerService,expenseService}.js`
- `src/pages/chits/{Collections,Members,PendingCollections}.jsx`
- `supabase/migrations/001_production_schema.sql`
- `docs/MITRA_NIDHI_PRODUCTION_CLOSURE_AUDIT.md`

---

## 15. Recommended implementation order (batches)

| Batch | Focus |
| --- | --- |
| **1 (this task)** | Members + collections + receipts + finance persistence; schema mappers; Collections/Members UI async; finance side-effects for winner/payout |
| **2** | Payouts + auctions + ledger via provider; winner lock durable |
| **3** | Month closing + chit completion + dividends + expenses |
| **4** | Permissions/roles durable; settings; payment modes; batches |
| **5** | Reports/exports, activity audit, notifications |
| **6** | Production E2E + monitoring + launch acceptance sign-off |

---

## 16. Estimated batches (not time promises)

- **6 closure batches** as above.
- Batch 1 is the minimum coherent money-path safety batch.
- Full launch acceptance requires Batches 1â€“5 verified plus Batch 6 sign-off.

---

## 17. Launch acceptance criteria

MITRA NIDHI CHITI PRO / VARDHAN CHIT MANAGEMENT PRO may be declared production-complete only when **all** are true:

1. Group, member, collection, receipt, and finance create/list survive hard refresh and a second browser session against Supabase.
2. No money-path service imports `repositories/chits/*` or scopedStorage for durable entities in production mode.
3. Duplicate receipt/collection constraints enforced in DB and reflected in UI errors.
4. Pending collections reflect server state.
5. Winner lock + payout + finance obligation are durable and tenant-scoped.
6. Month close and chit completion are durable and reversible only with audited permission.
7. RLS isolation verification passes against a production-like project.
8. OCR remains authenticated; health checks green; CI green.
9. No permanent demo credentials or mock business totals in production builds.
10. Backup/restore and incident runbook exercised once.
11. Mobile critical paths (collect, receipt share, pending) verified on a real device.
12. This auditâ€™s P0 and P1 lists are closed or explicitly waived in writing by the product owner.

**Status after Batch 2:** Product is **not** fully launch-complete. Batches 1â€“2 close money-path + auction/winner/payout/ledger durability. Month close, completion, expenses, roles, reports, and monitoring remain.

---

## 18. Closure Batch 1 â€” status

**Implemented:**

1. Allowlist + field maps on Supabase Collections / Receipts / Finance / Members repositories.
2. `*Persistent` helpers for members, collections, receipts, finance (same pattern as groups).
3. Async `recordCollectionPayment` production path with UUID ids and mapped columns.
4. Collections / PendingCollections / Members pages load and save via persistent APIs.
5. Winner/payout finance writes go through finance persistent helper (superseded by Batch 2 RPC path).
6. Focused tests in `src/tests/services/collectionProductionPersistence.test.mjs`.

---

## 18b. Closure Batch 2 â€” status

**Branch:** `closure/vardhan-chit-production` (local only; not pushed)
**Product brand in this batch:** VARDHAN CHIT MANAGEMENT PRO / VARDHAN CHIT PRO
**Audit path:** `docs/VARDHAN_CHIT_MANAGEMENT_PRO_PRODUCTION_CLOSURE_AUDIT.md` (renamed from MITRA NIDHI audit; findings preserved)

**Root problems fixed:**

1. Auctions / lucky draws / winners / payouts still used localStorage facades.
2. No durable `chit_winners` entity or one-winner-per-month DB guard.
3. Winner confirmation was non-transactional (auction + winner + finance could diverge).
4. Payout payments lacked idempotent payment references.
5. Member ledger was collection-derived only; no authoritative ledger posts for winner/payout/collection events.
6. Confirmed winners lacked immutability / authorized correction path.

**Implemented:**

1. Migration `007_chit_winner_payout_durability.sql`: `chit_winners`, uniqueness indexes, payout `reference_no`/`winner_id`, RPCs `confirm_chit_winner_event` + `record_chit_payout_payment` with role checks + idempotency.
2. Migration `008_chit_winner_immutability.sql`: immutability trigger + `cancel_chit_winner_event` (owner/admin soft-cancel with required reason).
3. Schema mappers for auction, lucky draw, winner, payout, ledger.
4. `winnerLifecyclePersistence.js` persistent list/save + RPC wrappers; local deterministic fallback with duplicate prevention.
5. Auction / lucky-draw / winner / payout / ledger services rewritten to async durable paths.
6. Collections also post idempotent ledger rows (`collection:{id}`).
7. Payouts + Member Ledger pages load durable server data.
8. Focused tests: `src/tests/services/winnerPayoutLedgerPersistence.test.mjs`.

**Exact schema objects:** `chit_winners`, indexes `uq_chit_winners_*`, `uq_chit_auctions_group_month_confirmed`, `uq_lucky_draws_group_month_confirmed`, `uq_chit_payouts_*`, RPCs `confirm_chit_winner_event`, `record_chit_payout_payment`, `cancel_chit_winner_event`, trigger `enforce_chit_winner_immutability`.

**Still open (next batches):** month closing, chit completion, dividends/expenses, role matrix durability, reports/activity, monitoring/E2E sign-off.

---

## 19. Counts (after Batch 2)

| Priority | Count |
| --- | --- |
| P0 | 2 (month close / chit completion durability; durable client role matrix beyond RPC checks) |
| P1 | 8 |
| P2 | 6 |
| Controlled beta | **NO-GO** until Batch 3 closes month completion + P0 role gaps are accepted or fixed |

**Launch status:** NOT COMPLETE. Controlled beta remains **NO-GO**.
**Do not claim VARDHAN CHIT MANAGEMENT PRO is launch-ready.**
