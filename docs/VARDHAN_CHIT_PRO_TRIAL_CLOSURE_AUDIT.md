# VARDHAN Chit Management Pro — Trial Closure Audit

**Branch:** `design/vardhan-natural-ui`  
**Date:** 2026-08-02  
**Baseline:** Backend OCR+ingestion 32 ✓ · Frontend 191 ✓ · Production build ✓  
**Constraint:** Do not rebuild Universal File Ingestion Engine. No push/deploy/secrets.

## Classification legend

| Tag | Meaning |
|---|---|
| COMPLETE | Durable save, refresh/login safe, tenant+permission, validation, audit, tests, VARDHAN UI |
| PARTIAL | Core path exists but missing UX, limits, or production durability |
| BROKEN | Implemented but fails critical acceptance |
| UI ONLY | Screen exists without durable/business completion |
| LOCAL STORAGE ONLY | Works in local backend mode; not production-safe alone |
| SUPABASE DURABLE | Production persistence path exists via Supabase |
| MISSING | No meaningful implementation |
| BLOCKED | Depends on external/config gap |
| NOT APPLICABLE | Out of product scope for this trial |

## Feature audit (30 areas)

| # | Feature | Status | Persistence | Notes / P0 impact |
|---|---|---|---|---|
| 1 | Dashboard | PARTIAL | SUPABASE DURABLE / LOCAL | Real KPIs via services; density polish open |
| 2 | Chit Groups | PARTIAL | SUPABASE DURABLE | CRUD/status/audit exist; missing summary metrics, tenure progress, action set, date formatting |
| 3 | Members | PARTIAL | SUPABASE DURABLE | Create/edit/capacity mostly present; documents/history gaps |
| 4 | Collections | PARTIAL → near COMPLETE | SUPABASE DURABLE | Atomic collection→receipt→ledger→finance path exists with tests |
| 5 | Receipts | PARTIAL | SUPABASE DURABLE | Unique receipt + persistence; PDF/WhatsApp/cancel polish open |
| 6 | Pending Collections | PARTIAL | SUPABASE DURABLE | List + aging mostly present; export/reminder polish |
| 7 | Auction | PARTIAL | SUPABASE DURABLE | Bid/confirm/lock with tests; UI consistency open |
| 8 | Lucky Draw | PARTIAL | SUPABASE DURABLE | Engine + page exist |
| 9 | Winner Confirmation | PARTIAL | SUPABASE DURABLE | Immutability migrations 007/008; confirmation required |
| 10 | Payout | PARTIAL | SUPABASE DURABLE | Lifecycle persistence + finance/ledger hooks |
| 11 | Dividend | PARTIAL | SUPABASE DURABLE | Rule-engine aware service; UI present |
| 12 | Member Ledger | PARTIAL | SUPABASE DURABLE | Passbook aggregation present |
| 13 | Chit Ledger | PARTIAL | SUPABASE DURABLE | Via finance/ledger services |
| 14 | Finance and Accounts | PARTIAL | SUPABASE DURABLE | Income/expense/cash views; mismatch detection via reconciliation |
| 15 | Expenses | PARTIAL | SUPABASE DURABLE | Service exists; dedicated route weak |
| 16 | Month Closing | PARTIAL / UI MISSING | SUPABASE DURABLE | `monthClosingService` + migration 009; **no dedicated route** |
| 17 | Chit Completion | PARTIAL / UI MISSING | SUPABASE DURABLE | `chitCompletionService` + ActiveSlotEngine; **no dedicated route** |
| 18 | Reports | PARTIAL | MIXED | Real-data engine present; some exports HTML/CSV |
| 19 | Subscription and Trial | PARTIAL / MISSING plans | MIXED | Licensing exists; **₹99/199/299 30-day trial plans not productized** |
| 20 | Manual Plan Creation | PARTIAL | SUPABASE DURABLE | Groups modal + AI/manual paths |
| 21 | Templates and Clone | PARTIAL | LOCAL / SUPABASE | Template service present |
| 22 | Excel / CSV Import | PARTIAL | LOCAL + INGESTION | Legacy import + new universal adapters |
| 23 | Universal File Ingestion | COMPLETE (engine) | SQLite queue (dev) | Engine tested; **prod Postgres queue adapter missing** |
| 24 | OCR / Smart Capture | PARTIAL | Gemini + local | Local-first path via ingestion; AI Chit still Gemini-primary |
| 25 | Tenant Isolation | PARTIAL | RLS + app scope | Strong for money path; need more automated isolation tests |
| 26 | Roles and Permissions | PARTIAL | Core | Permission builder; some actions not fully gated in UI |
| 27 | Responsive UI | PARTIAL | — | Shell aligned; 390px table polish open |
| 28 | Error Handling | PARTIAL | — | Boundaries exist; customer-safe mapping incomplete in places |
| 29 | Backup / Queue / Recovery | PARTIAL | — | Ingestion SQLite only; health endpoint partial |
| 30 | Full Workflow Tests | PARTIAL | — | Money-path + ingestion tested; end-to-end trial acceptance doc missing |

## P0 blockers (must clear for any GO)

1. **Production ingestion queue** — SQLite only today; jobs must survive multi-instance/restart in production via Postgres adapter (keep SQLite for local).
2. **Trial plan productization** — ₹99 / ₹199 / ₹299 with active-chit limits and read-only expiry.
3. **Month Closing + Chit Completion UI** — services exist but organizers cannot run the workflow from routes.
4. **Chit Groups operational completeness** — real summary metrics + correct code/name/tenure/actions for trial operators.
5. **Ingestion → Plan Version → Group** confirmation bridge must stay non-activating until organizer confirms (verify + harden).

## P1 issues

- Receipt PDF / WhatsApp share polish
- Expense dedicated screen
- Tenant isolation automated suite expansion
- Responsive table overflow at 390px
- AI Chit upload still Gemini-primary (ingestion is preferred for multi-format)

## P2 improvements

- Dashboard density polish
- Report Excel native XLSX
- Academy/support copy polish

## Batch plan (implementation)

| Batch | Scope | Commit |
|---|---|---|
| A | Audit docs + Groups page completion | `feat(chits): complete groups and members` *(groups first; members follow)* |
| B | Collections/receipts hardening if gaps | `feat(chits): close collections and receipts` |
| C | Auction/winner/payout UI gates | `feat(chits): complete auction winner and payout` |
| D | Dividend/ledger/finance polish | `feat(chits): complete dividend ledger and finance` |
| E | Month closing + completion routes | `feat(chits): add month closing and completion` |
| F | Reports + ₹99/199/299 trial | `feat(chits): complete reports and subscription trial` |
| G | Production ingestion queue adapter | `feat(ingestion): add production queue adapter` |
| H | Tenant isolation tests + ops runbook | `fix(chits): harden tenant security and operations` |
| I | UI consistency sweep | `design(chits): unify all chit management screens` |
| J | Controlled trial acceptance + GO/NO-GO | `test(chits): add controlled trial acceptance workflow` |

## Files planned (Batch A–G primary)

- `docs/VARDHAN_CHIT_PRO_TRIAL_CLOSURE_AUDIT.md` (this file)
- `src/pages/chits/ChitGroups.jsx` + `.css`
- `src/pages/chits/Members.jsx` (capacity/deactivate hardening)
- `src/pages/chits/MonthClosing.jsx` + `ChitCompletion.jsx` (new)
- `src/routes/AppRouter.jsx`, `ChitNavigation.jsx`
- `src/config/chitTrialPlans.js` + subscription service hooks
- `backend/ingestion/queue/postgres_store.py` + adapter factory
- `docs/VARDHAN_INGESTION_QUEUE_PRODUCTION_MIGRATION.md`
- `docs/VARDHAN_CHIT_PRO_OPERATIONS_RUNBOOK.md`
- `docs/VARDHAN_CHIT_PRO_TRIAL_ACCEPTANCE.md`
- Targeted tests under `src/tests/` and `backend/test_ingestion_*.py`

**Updated:** 2026-08-02 (trial closure batch A–G progress)

## Implementation progress (this session)

| Batch | Status |
|---|---|
| A Groups + Members hardening | Done |
| E Month closing + completion UI | Done |
| F Trial plans ₹99/199/299 | Catalog + slot rules Done; Core activation UI PARTIAL |
| G Production queue adapter | Done + **live restart persistence PASS** |
| Queue fail-closed + health + migration 010 | Done |
| Live Supabase own-data walkthrough | **STOPPED** — P0 write role + frontend local/demo |

## Gate after queue+live attempt (2026-08-02)

| Gate | Decision |
|---|---|
| OWN-DATA TRIAL | **NO-GO** (queue verified; live write path blocked) |
| CONTROLLED CUSTOMER TRIAL | **NO-GO** |
| PUBLIC PAID TRIAL | **NO-GO** |

Evidence: `docs/VARDHAN_CHIT_PRO_TRIAL_ACCEPTANCE.md`, `backend/data/own_data_trial_evidence.json` (local).


