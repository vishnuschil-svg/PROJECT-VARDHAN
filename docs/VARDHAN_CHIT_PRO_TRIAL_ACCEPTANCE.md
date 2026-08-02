# VARDHAN Chit Pro — Controlled Trial Acceptance

**Date:** 2026-08-02  
**Scope:** Real-data controlled trial readiness after Phase 0–14 workstream start.

## Scenario checklist (operator)

1. Create tenant/workspace — Core auth path  
2. Activate trial plan (`trial-99` / `trial-199` / `trial-299`) — catalog in `src/config/chitTrialPlans.js`  
3. Create or import plan via `/chits/ingest`  
4. Review + confirm Plan Version (organizer confirmation required)  
5. Create group on `/chits/groups`  
6. Add members to capacity on `/chits/members`  
7. Record collections → receipts → ledger/finance  
8. Pending collections verification  
9. Auction / lucky draw / winner confirmation  
10. Dividend + payout  
11. Month closing `/chits/month-closing`  
12. Partial + advance payment month  
13. Duplicate collection rejection  
14. Reversal where permitted  
15. Tenant isolation spot-check  
16. Refresh + logout/login  
17. Backend restart + queue persistence (Postgres in prod)  
18. Chit completion `/chits/completion`  
19. Export reports  

## Automated coverage added/verified this batch

- Groups summary + code/name formatting + trial slot rules (`chitTrialClosure.test.mjs`)
- Existing money-path persistence suites (collections, winners, closing)
- Ingestion engine + queue factory tests
- Frontend suite + production build

## Final report

### P0 Blockers
1. Production Postgres queue requires `DATABASE_URL` + `psycopg` on the API host (adapter shipped; env not configured in this session).
2. End-to-end operator walkthrough on a live Supabase tenant not executed in this session (services/UI wired; live GO needs that run).
3. Receipt WhatsApp/PDF polish and full report matrix remain PARTIAL.

### P1 Issues
- AI Chit upload still Gemini-primary; prefer `/chits/ingest` for multi-format local-first.
- Dense tables at 390px need continued polish.
- Expense dedicated route still thin.

### P2 Improvements
- Dashboard density
- Native XLSX report export
- Deeper automated cross-tenant isolation suite

### Area status

| Area | Status |
|---|---|
| Groups and Members | Improved — real metrics, capacity/duplicate guards, trial limits |
| Collections and Receipts | Existing durable path retained |
| Auction and Winner | Existing durable path retained |
| Payout / Dividend / Ledger / Finance | Existing services retained |
| Month Closing | UI route added on top of durable service |
| Chit Completion | UI route added; frees active trial slot |
| Reports | PARTIAL |
| Subscription | Trial catalog ₹99/199/299 added; activation UI still Core-tied |
| Universal Ingestion | Engine preserved; prod queue adapter added |
| Tenant Isolation | App+RLS path retained; more automated tests recommended |
| Responsive UI | Groups metrics responsive; broader polish open |
| Operations | Runbook + queue migration docs added |

### Verification

| Check | Result |
|---|---|
| Targeted Tests | See session run |
| Full Tests | See session run |
| Lint | Warnings only (pre-existing) |
| Production Build | See session run |
| Reconciliation Result | Engine present; live tenant not re-run here |
| Backend Restart Persistence | SQLite local yes; Postgres adapter ready |
| Queue Persistence | Adapter abstraction complete |

### Gates

**OWN-DATA TRIAL: CONDITIONAL GO** — GO for local/Supabase own-data once Postgres queue env is set and one live walkthrough passes. Treat as **NO-GO** until that walkthrough is recorded.

**CONTROLLED CUSTOMER TRIAL: NO-GO** — Requires zero P0, live isolation proof, and ops checklist signed.

**PUBLIC PAID TRIAL: NO-GO** — Subscription activation UX, billing invoices, and public ops maturity incomplete.

Update this file after the live walkthrough to flip OWN-DATA to unconditional GO.
