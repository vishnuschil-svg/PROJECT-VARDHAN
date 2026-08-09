# VARDHAN Group Manager safety migration audit

Date: 2026-08-09
Baseline: `npm.cmd test` (285 passed), `npm.cmd run build` (passed)

## A. Current code audit

The application already has tenant-scoped repository boundaries, Supabase RLS migrations, collection-to-receipt/finance/ledger persistence, reports, audit/activity services, permissions, AI import, backup, and premium product shells. Those foundations are retained.

The released `/chits/auctions` workflow is not record-only. `Auctions.jsx`, `auctionService.js`, `AuctionEngine`, and `chitAuctionEngine.js` preview/calculate bid outcomes and confirm winner/payout side effects. The page can also select a random eligible financial member. This is `AUTOMATED_DECISION` and must be unreachable by default.

The released `/chits/lucky-draw` workflow imports eligible members from group financial data and persists a selected winner. This is also `AUTOMATED_DECISION`. A safe random-name utility must accept only manually entered names and have no repository or financial side effects.

Legacy winner, payout, dividend, commission, closing, and report code includes both accounting history and decision engines. Historical readers and accounting adapters must remain compatible; new default writes must use manual record/distribution entities.

Receipt generation already uses organizer bank details, but its visible issuer is the old product, its default collector can be VARDHAN, and the required organizer/software-provider fields and disclaimer are absent.

Onboarding provisions a tenant safely but does not capture the required declaration. AI has tenant and confirmation checks but no explicit recipient/bid/winner recommendation refusal.

## B. Classification

| Classification | Existing surfaces | Treatment |
|---|---|---|
| KEEP | Dashboard, groups, members, schedules, collections, pending, receipts, ledger, finance, expenses, reports, communication, AI import/capture, audit/activity, notifications, settings, backup/export, permissions, repository selection, RLS | Preserve architecture and behavior; add safety metadata where relevant. |
| RENAME | Customer navigation/product copy; `Chit Group`, `Chit Amount`, `Winner`, `Prize Amount`, `Auction Result` display labels | Use Group, Group Value, Member, Recipient, Distribution Amount, Distribution Record for new/default UI. Preserve legacy field names in adapters. |
| MODIFY | Receipts, onboarding, Settings/Legal, AI orchestrator, permissions, route/menu definitions, audit events | Add organizer issuer fields, declarations/disclaimer, refusal guardrails, granular permissions, safe routes and source metadata. |
| DISABLE | `/chits/auctions`, group-linked `/chits/lucky-draw`, automatic winner confirmation, bid preview recommendations, automatic recipient/payout outcome paths | Guard with `REGISTERED_OPERATIONS_ENABLED`; default false; redirect old released routes to safe workflows. |
| FEATURE-BANK | `AuctionEngine`, `LuckyDrawEngine`, `WinnerEligibilityEngine`, auction/lucky validators, winner/payout lifecycle services and repositories, legacy pages/config, phase-2/10 tests and documentation | Retain without deletion under the registered-operations flag. No default navigation or executable route. |
| SAFE_ACCOUNTING | Existing collections, receipts, finance, ledger, expenses, reports, historical dividends/payout readers, reconciliation and month closing | Keep. Legacy payout/dividend values remain readable; no new outcome is derived from a bid in default mode. |
| MANUAL_RECORD | New Manual Bid Record and Distribution Record services/pages | Organizer supplies recipient and final amount; VARDHAN validates presence and records only. |
| LEGACY | `winner*`, `auction*`, `prize_amount`, `payout*`, `dividend*` columns, adapters and migrations 001-009 | Preserve for old data and map to read-only compatibility fields. |

## C. Exact files planned

- Add: `src/config/groupManagerSafety.js`
- Add: `src/domain/groupManager/manualRecords.js`
- Add: local and Supabase repositories for manual bids, distributions, payment profiles, declarations and compliance cases
- Add: `src/services/manualRecordsService.js`
- Add: `src/pages/chits/ManualRecords.jsx` and styles
- Add: `src/pages/chits/RandomPicker.jsx` and styles
- Add: `src/pages/platform-admin/ComplianceCases.jsx`
- Add: `supabase/migrations/015_group_manager_safety_records.sql`
- Add: `src/tests/domain/groupManagerSafety.test.mjs`
- Modify: `src/routes/AppRouter.jsx`, `src/components/chit/ChitNavigation.menu.js`
- Modify: `src/services/auth/PermissionService.js`, `src/pages/auth/Onboarding.jsx`
- Modify: `src/services/ai/AIOrchestrator.js`
- Modify: `src/receipts/ReceiptEngine.js`, `src/receipts/ReceiptTemplate.js`
- Modify: `src/pages/chits/Settings.jsx`

Existing automated engines are intentionally not rewritten or deleted.

## D. Data migration impact

Migration is additive. Five new tenant-scoped tables use UUID keys, audit timestamps, `created_by`/`updated_by`, RLS and tenant membership policies. Existing auction/winner/payout tables are unchanged. Compatibility adapters expose old `winner_id`, `auction_date`, `bid_amount`, and `prize_amount` as recipient/date/recorded/distribution values for historical display only. New rows never write algorithm/ranking fields.

## E. Route impact

- `/chits/manual-records`: new default Manual Bid Record workflow.
- `/chits/distributions`: new default Distribution Record view/form.
- `/chits/random-picker`: isolated typed-name utility.
- `/chits/auctions` and `/chits/lucky-draw`: unavailable unless registered operations flag is explicitly enabled; default redirects are safe.
- `/admin/compliance-cases`: tenant-safe internal complaint/case workflow.

## F. Feature flag plan

`REGISTERED_OPERATIONS_ENABLED` is derived only from `VITE_REGISTERED_OPERATIONS_ENABLED === "true"`; missing, malformed and production-default values are false. Default menus do not expose registered features. Both routes and service entry points are guarded so a copied URL cannot execute them.

## G. Test plan

Contract and behavior tests cover manual recipient entry, no automatic bid/distribution calculation, payment destination restrictions, organizer receipt issuer, audit decision source, false-by-default flag, legacy route gating, tenant isolation, AI refusal, additive migration/RLS, and build/import integrity. Existing collection/receipt/report suites remain in the full test run.
