# VARDHAN OS Internal Trial Defect Register — 2026-07-13

## Audit basis

- Repository state: current dirty worktree as supplied; existing changes were treated as user-owned.
- Runtime: Vite production build served locally at `http://127.0.0.1:4173` in a clean headless Chrome profile.
- Trial identity: `admin@vardhan.com` / `admin123`, active Chit tenant `own-chit-business / own_business`.
- Browser evidence: `artifacts/internal-trial-audit/browser-audit-results.json`.
- Existing responsive smoke evidence: `artifacts/local-ui/route-smoke-results.json` (96 route/viewport combinations).
- Baseline gates: 100/100 tests passed; build passed; lint exited 0 with 25 warnings; `git diff --check` passed.
- Severity rule: Blocker prevents a core trial sequence or makes financial/tenant evidence unsafe; Major materially breaks or misrepresents a workflow but has a bounded workaround; Minor is a contained presentation, consistency, or maintainability defect.

## Defect summary before fixes

| Severity | Count | IDs |
|---|---:|---|
| Blocker | 6 | ITD-001–ITD-004, ITD-015–ITD-016 |
| Major | 7 | ITD-005–ITD-011 |
| Minor | 4 | ITD-012–ITD-014, ITD-017 |

## Blocker defects

### ITD-001 — Confirmed Chit Group cannot enter the collection workflow

- **Route:** `/chits/groups` → `/chits/ai-chit/*` → `/chits/collections`
- **Severity:** Blocker
- **Exact reproduction steps:** (1) Sign in with the internal-trial account. (2) Open Chit Groups and select Create Chit. (3) Upload `artifacts/internal-trial-audit/valid-chit-plan.json`. (4) Complete Analysis, Summary, Details, Schedule, Rules, Terms, and Review. (5) confirm owner review and create the group. (6) Add a member to that group. (7) Open Collections, select Record Collection, and select Validate & Continue.
- **Expected behavior:** The confirmed group is operational and the valid first installment proceeds to confirmation and receipt generation.
- **Actual behavior:** The UI reports `Collection validation failed — Inactive group cannot accept collection.` No collection or receipt is saved.
- **Console or repository error:** No browser exception. Repository record created by reconstruction has `status: "upcoming"`; collection validation accepts only an active group.
- **Root-cause hypothesis:** `reconstructChitFromAnalysis` writes a lifecycle status incompatible with `CollectionEngine` immediately after presenting creation as complete.
- **Files likely involved:** `src/services/chitDocumentUnderstandingService.js`, `src/domain/chit/services/CollectionEngine.js`, `src/config/chitPhaseOneData.js`.
- **Safe fix recommendation:** Persist an owner-confirmed reconstructed group with the existing canonical active status, without changing collection or finance formulas.
- **Regression test required:** Reconstruct a complete analysis, assign a member, build a first collection draft, and assert the draft is valid.

### ITD-002 — Member Ledger fabricates financial history when no collection exists

- **Route:** `/chits/member-ledger` (also contaminates `/chits/payouts`, member profile, dividends, and reports)
- **Severity:** Blocker
- **Exact reproduction steps:** (1) Create a group and add `Trial Member`. (2) Do not save any collection; verify Collections and Receipts both show zero. (3) Open Member Ledger.
- **Expected behavior:** Total paid, fine, discount, dividend, lift, and transaction history are zero/empty; only repository-backed obligations may be shown.
- **Actual behavior:** The ledger showed Total Installments Paid `Rs 10,000`, Fine `Rs 100`, Discount `Rs 250`, a generated receipt-like transaction, and an “Installment collected” timeline despite zero saved collections and zero receipts.
- **Console or repository error:** No exception. `buildMemberLedger` falls back to `buildTransactions` when `memberCollections.length === 0` and marks at least one month paid for every active member.
- **Root-cause hypothesis:** A legacy demo-data fallback is still active in a production-facing ledger builder.
- **Files likely involved:** `src/config/chitMemberLedger.js`, `src/pages/chits/MemberLedger.jsx`, `src/pages/chits/Payouts.jsx`, `src/config/chitReportsEngine.js`.
- **Safe fix recommendation:** Build transaction history only from collection repository rows. Keep existing calculation functions for real rows unchanged.
- **Regression test required:** An active member with an active group and an empty collection array must have zero paid and no transactions/timeline collection events.

### ITD-003 — Dashboard and Chit module use different active tenant contexts

- **Route:** `/dashboard` then `/chits`
- **Severity:** Blocker
- **Exact reproduction steps:** (1) Clear local browser storage. (2) Log in with the platform-owner trial account. (3) Observe the dashboard workspace header. (4) Open MITRA NIDHI and observe its active-tenant banner.
- **Expected behavior:** Both surfaces use the same selected tenant and data scope.
- **Actual behavior:** Dashboard defaults to `Demo School Tenant`, while Chit routes use `own-chit-business / own_business`. Dashboard metrics and Chit mutations therefore describe different tenants in one session.
- **Console or repository error:** No exception. `WorkspaceContext` independently selects the alphabetically first workspace, while `AuthContext` retains its own active workspace.
- **Root-cause hypothesis:** `WorkspaceProvider` reloads from `WorkspaceRepository` but does not prefer/synchronize `auth.activeWorkspace` when no user selection is persisted.
- **Files likely involved:** `src/contexts/WorkspaceContext.jsx`, `src/services/workspaceService.js`, `src/repositories/WorkspaceRepository.js`, `src/pages/dashboard/Dashboard.jsx`.
- **Safe fix recommendation:** Resolve the initial dashboard workspace from the authenticated active tenant, then persist explicit user switches.
- **Regression test required:** With multiple platform-owner workspaces and no persisted selection, dashboard tenant context must equal the authenticated active tenant context.

### ITD-004 — Local trial runs under contradictory production/Supabase and local-repository behavior

- **Route:** Login and all mutation routes
- **Severity:** Blocker
- **Exact reproduction steps:** (1) Inspect loaded environment: `.env` declares `VITE_APP_MODE=production` and `VITE_REPOSITORY_BACKEND=supabase`. (2) Start the local app. (3) Sign in using hard-coded demo credentials. (4) create a batch/group/member and inspect browser storage/repository imports.
- **Expected behavior:** A repository-local trial explicitly uses demo/local mode, or production mode uses Supabase authentication and Supabase repositories consistently.
- **Actual behavior:** The runtime identifies production/Supabase, accepts demo credentials, and core Chit services import local repositories directly; trial writes are browser-local and do not exercise the configured Supabase backend.
- **Console or repository error:** No runtime exception; this is a silent configuration/contract mismatch. `createRepositoryProvider` exists but `chitDataService` imports `repositories/chits/index.js` directly.
- **Root-cause hypothesis:** Trial and production environment files are conflated, and repository-provider migration is incomplete.
- **Files likely involved:** `.env`, `.env.example`, `src/services/auth/AuthService.js`, `src/services/chitDataService.js`, `src/repositories/repositoryProvider.js`, `src/config/repositoryBackend.js`.
- **Safe fix recommendation:** For this repository-local trial, explicitly select demo/local mode without changing production repository contracts. Track completion of provider wiring separately before claiming a Supabase production trial.
- **Regression test required:** Trial mode resolves local backend and production mode rejects local fallback; browser banner/capability text must match the selected mode.

### ITD-015 — A single collection is counted twice as income and profit

- **Route:** `/chits/collections` → `/chits/finance`
- **Severity:** Blocker
- **Exact reproduction steps:** (1) Complete ITD-001's repaired group/member setup. (2) Save one full cash collection of `Rs 10,000` and generate receipt `MNC-20260713-00001`. (3) Open Finance.
- **Expected behavior:** Cash in hand, today's income, and today's profit each reconcile to the single `Rs 10,000` posting before expenses.
- **Actual behavior:** Cash in hand is `Rs 10,000`, but today's income/profit and month profit are `Rs 20,000`.
- **Console or repository error:** No exception. `AccountingEngine.normalizeSource` adds the saved finance entry to income and independently converts the same collection row into a second Income object.
- **Root-cause hypothesis:** Collection-income fallback does not exclude collections that already have a matching posted finance entry.
- **Files likely involved:** `src/domain/finance/services/AccountingEngine.js`, `src/services/collectionService.js`, `src/services/financeService.js`.
- **Safe fix recommendation:** De-duplicate source evidence by finance-entry ID/receipt number before normalization; do not change any financial formula.
- **Regression test required:** A collection and its matching finance entry normalize to one income row and retain the original amount.

### ITD-016 — Dashboard overstates actual monthly collections and business-health cash flow

- **Route:** `/dashboard` and `/chits`
- **Severity:** Blocker
- **Exact reproduction steps:** (1) Save one `Rs 10,000` collection for a 12-member, `Rs 10,000` monthly group. (2) Verify Collections, Receipt, Ledger, and Finance all show `Rs 10,000`. (3) Open the top-level Dashboard.
- **Expected behavior:** Monthly collections reconcile to `Rs 10,000`; business-health cash flow counts the collection posting once.
- **Actual behavior:** Dashboard shows Monthly collections `Rs 1,20,000` (the group's monthly capacity). BusinessHealth also adds the collection row and matching collection finance entry together when calculating cash flow/profit trend.
- **Console or repository error:** No exception; this is a source-evidence/label mismatch in `BusinessHealthEngine` and `getBusinessHealthDashboardModel`.
- **Root-cause hypothesis:** `monthlyCollection` means group capacity but is presented as actual collected amount, and posted collection income is not excluded from the additional finance-income source.
- **Files likely involved:** `src/domain/chit/services/BusinessHealthEngine.js`, `src/services/businessHealthService.js`, `src/services/vardhanHomeService.js`.
- **Safe fix recommendation:** Present the existing actual `collectedAmount` metric and exclude collection-category finance entries already represented by collection rows; keep percentage/profit formulas unchanged.
- **Regression test required:** One collection plus its finance posting reports one collected/cash-flow amount, while monthly capacity remains available for rates.

## Major defects

### ITD-005 — Chit Group “Create” has no blank/manual creation path

- **Route:** `/chits/groups`
- **Severity:** Major
- **Exact reproduction steps:** Open Chit Groups and select Create Chit without an existing document.
- **Expected behavior:** Create a Chit Group from a validated blank/manual form, or clearly choose between manual creation and document import.
- **Actual behavior:** Create Chit routes directly to a document-upload-only journey; the dormant page modal is never opened in create mode. A valid JSON document succeeds, but a user without a document cannot perform the named Create Chit Group flow.
- **Console or repository error:** None. `modalMode` supports create rendering but no control sets it to `"create"`.
- **Root-cause hypothesis:** The AI import entry point replaced the original create action without retaining the manual workflow.
- **Files likely involved:** `src/pages/chits/ChitGroups.jsx`, `src/pages/chits/AIChitFlow.jsx`.
- **Safe fix recommendation:** Restore the existing validated manual create entry without redesigning the AI import path.
- **Regression test required:** Create button path/choice and successful manual save with required fields.

### ITD-006 — AI-created groups omit operational dates

- **Route:** `/chits/ai-chit/success` → `/chits/groups`
- **Severity:** Major
- **Exact reproduction steps:** Complete document creation with a valid JSON plan and open Chit Groups.
- **Expected behavior:** Required `start_date` and `end_date` exist or creation is blocked until the owner supplies them.
- **Actual behavior:** Reconstruction persists no start/end dates although the normal group validator requires both; downstream month, auction, and ledger timing becomes ambiguous.
- **Console or repository error:** None; missing fields are not part of AI analysis and are not checked during reconstruction.
- **Root-cause hypothesis:** AI field schema excludes dates while repository reconstruction bypasses the normal page validator.
- **Files likely involved:** `src/domain/chit/services/ChitDocumentUnderstandingEngine.js`, `src/pages/chits/AIChitFlow.jsx`, `src/services/chitDocumentUnderstandingService.js`.
- **Safe fix recommendation:** Require explicit date confirmation before reconstruction; do not infer dates.
- **Regression test required:** Reconstruction rejects absent dates and persists confirmed dates unchanged.

### ITD-007 — Payout route cannot execute or track the payout workflow

- **Route:** `/chits/payouts`
- **Severity:** Major
- **Exact reproduction steps:** Open Payouts after completing/choosing a winner.
- **Expected behavior:** View a repository-backed pending payout, confirm evidence, record payment, and see payment history/reversal controls already supported by the payout service/repository contract.
- **Actual behavior:** The page is read-only and derives “paid” records from member-ledger lift transactions; there is no payout action and it does not use the available PayoutRepository.
- **Console or repository error:** None.
- **Root-cause hypothesis:** UI remains a legacy derived view while payout repositories/services were implemented elsewhere.
- **Files likely involved:** `src/pages/chits/Payouts.jsx`, `src/repositories/PayoutRepository.js`, `src/repositories/supabase/PayoutRepository.js`, `src/services/payoutService.js`.
- **Safe fix recommendation:** In a later major-defect phase, bind the existing UI to the existing repository contract without changing payout formulas.
- **Regression test required:** Pending → paid posting, duplicate prevention, history, and reversal-reason coverage.

### ITD-008 — Member number uniqueness is not enforced in Add Member

- **Route:** `/chits/members`
- **Severity:** Major
- **Exact reproduction steps:** Add two members with the same `Member ID / Member Number` but different generated record IDs.
- **Expected behavior:** The second save is rejected within the active tenant scope.
- **Actual behavior:** Page validation checks only non-empty fields; local upsert keys by generated `id`, so duplicate business identifiers can be stored.
- **Console or repository error:** None.
- **Root-cause hypothesis:** `MemberValidator`/repository uniqueness rules are not called by the page save path.
- **Files likely involved:** `src/pages/chits/Members.jsx`, `src/domain/chit/validators/MemberValidator.js`, `src/repositories/chits/MembersRepository.js`.
- **Safe fix recommendation:** Add tenant-scoped duplicate validation before upsert.
- **Regression test required:** Same number in same tenant rejected; same number in another tenant allowed.

### ITD-009 — Login visual quality is not approved

- **Route:** `/login`
- **Severity:** Major
- **Exact reproduction steps:** Open Login at desktop and mobile widths.
- **Expected behavior:** Approved VARDHAN OS authentication composition, typography, spacing, and brand finish.
- **Actual behavior:** Current split-story/card treatment is the unapproved trial visual; mojibake also appears in company/footer and loading copy.
- **Console or repository error:** None.
- **Root-cause hypothesis:** AccessShell styling/content was shipped without final visual acceptance and contains incorrectly encoded source literals.
- **Files likely involved:** `src/components/auth/AccessShell.jsx`, `src/pages/auth/Login.jsx`, `src/App.css`, `src/layouts/AuthLayout.css`.
- **Safe fix recommendation:** Handle only in the later approved visual-polish phase; no unrelated page redesign.
- **Regression test required:** Approved screenshots at 360, 390, 768, 1366, and 1440 px plus keyboard/focus checks.

### ITD-010 — AI Assistant layout is not approved

- **Route:** `/chits/ai`
- **Severity:** Major
- **Exact reproduction steps:** Open AI Workspace on desktop and mobile.
- **Expected behavior:** Approved assistant hierarchy, conversation area, prompt controls, and responsive density.
- **Actual behavior:** Current compact command workspace is the unapproved layout even though it renders without overflow.
- **Console or repository error:** None.
- **Root-cause hypothesis:** Functional shell was completed before visual acceptance.
- **Files likely involved:** `src/pages/chits/AIWorkspace.jsx`, `src/pages/chits/AIWorkspace.css`, `src/components/ai/*`.
- **Safe fix recommendation:** Apply only an approved AI-specific layout specification in the later major-defect phase.
- **Regression test required:** Visual snapshots and keyboard/send/collapse interaction coverage.

### ITD-011 — Encoding corruption affects money and business copy

- **Route:** `/dashboard`, `/chits`, `/chits/finance`, `/login`, `/chits/payouts`, `/chits/support`, and other pages
- **Severity:** Major
- **Exact reproduction steps:** Open Dashboard or Finance and inspect currency labels and punctuation.
- **Expected behavior:** `₹`, `·`, apostrophes, and ellipses render correctly.
- **Actual behavior:** Browser text includes `â‚¹`, `Â·`, `â€™`, and `â€¦`; financial values such as monthly collections are displayed with a corrupted currency symbol.
- **Console or repository error:** None; corruption exists in source literals.
- **Root-cause hypothesis:** UTF-8 text was decoded and committed as Windows-1252/UTF-8 mojibake.
- **Files likely involved:** `src/pages/dashboard/Dashboard.jsx`, `src/pages/chits/FinanceAccounts.jsx`, `src/pages/auth/Login.jsx`, `src/components/auth/AccessShell.jsx`, and other literals found by repository search.
- **Safe fix recommendation:** Mechanical literal correction only; do not alter numeric calculations.
- **Regression test required:** Source scan for known mojibake sequences and visible money-format snapshot assertions.

## Minor defects

### ITD-012 — Modal and page styling is inconsistent

- **Route:** Chit Groups, Batches, Members, Collections, Support, Payouts, and Settings
- **Severity:** Minor
- **Exact reproduction steps:** Open create/detail modals across the listed pages and compare headers, footer alignment, widths, form controls, and action ordering.
- **Expected behavior:** Shared Modal/FormField/Button primitives present one consistent interaction pattern.
- **Actual behavior:** Some flows use shared form classes, some use `access-form`, some use inline layout, and Payouts uses an inline page shell; spacing and action hierarchy differ.
- **Console or repository error:** None.
- **Root-cause hypothesis:** Pages were migrated to shared primitives incrementally.
- **Files likely involved:** `src/components/common/Modal.jsx`, `src/components/common/Modal.css`, listed page CSS/JSX files.
- **Safe fix recommendation:** Later token/class consolidation limited to modal/page consistency.
- **Regression test required:** Cross-page modal visual matrix and focus-return test.

### ITD-013 — Dashboard “Open AI” control opens the Chit dashboard

- **Route:** `/dashboard`
- **Severity:** Minor
- **Exact reproduction steps:** Activate the header icon whose accessible name is `Open AI`.
- **Expected behavior:** Navigate to `/chits/ai`.
- **Actual behavior:** Navigates to `/chits`.
- **Console or repository error:** None.
- **Root-cause hypothesis:** Stale route target in Dashboard header.
- **Files likely involved:** `src/pages/dashboard/Dashboard.jsx`.
- **Safe fix recommendation:** Correct only the route target.
- **Regression test required:** Accessible-name navigation assertion.

### ITD-014 — Lint baseline contains 25 warnings

- **Route:** Repository-wide
- **Severity:** Minor
- **Exact reproduction steps:** Run `npm run lint` (or `npm.cmd run lint` on this Windows policy configuration).
- **Expected behavior:** Clean lint output.
- **Actual behavior:** Exit code 0 with 25 warnings, primarily unnecessary hook dependencies, Fast Refresh export warnings, unused values, and unnecessary escapes.
- **Console or repository error:** oxlint warning list captured in the audit run.
- **Root-cause hypothesis:** Incremental implementation left non-failing static-analysis debt.
- **Files likely involved:** Files named by oxlint, including `Batches.jsx`, `Collections.jsx`, `Academy.jsx`, contexts, services, and legacy documentation code.
- **Safe fix recommendation:** Address only in a later minor-defect cleanup; do not mix with blocker fixes.
- **Regression test required:** `npm run lint` with zero warnings once the cleanup is authorized.

### ITD-017 — Finance collection description contains `undefined`

- **Route:** `/chits/finance`
- **Severity:** Minor
- **Exact reproduction steps:** Save a collection and open the Finance transaction register.
- **Expected behavior:** Description identifies the member and Chit Group.
- **Actual behavior:** Description displays `Trial Member - undefined`; amount, receipt reference, and posting status are otherwise correct.
- **Console or repository error:** None.
- **Root-cause hypothesis:** `persistFinanceEntry` reads `receipt.chit_name`, while the receipt payload uses a different group-name property.
- **Files likely involved:** `src/services/collectionService.js`, `src/config/chitReceiptImage.js`.
- **Safe fix recommendation:** Map the existing receipt group-name field into the description; do not change posting values.
- **Regression test required:** Finance description contains member and group names and never contains `undefined`.

## Known-issue disposition

- **Batch Name loses focus after each character:** Not reproduced in the current worktree. Browser automation typed `Trial Batch`; the input retained focus after all 11 characters and saved successfully. Existing regression test `batch draft updates do not restart the modal focus lifecycle` passes. Treat as already fixed before this register, not as an open defect.
- **Chit Group creation fails:** Reproduced as the downstream Blocker ITD-001. The ten-screen JSON creation itself reaches success, but the created group cannot accept its first collection. The absent blank/manual path remains Major ITD-005.
- **Login visual not approved:** Open as ITD-009.
- **AI Assistant layout not approved:** Open as ITD-010.
- **Inconsistent modal and page styles:** Open as ITD-012.
- **Local-trial backend may conflict with production Supabase mode:** Confirmed as ITD-004.

## Audited flow disposition before blocker fixes

| Flow | Result before fixes |
|---|---|
| Login | Functional with demo credential; visual and mode defects open |
| Dashboard | Renders; tenant-context Blocker ITD-003 |
| Create Batch | Pass; focus retained and save verified |
| Create Chit Group | Document path reaches success; collection handoff blocked (ITD-001); no blank path (ITD-005) |
| Add Member | Save verified; uniqueness defect ITD-008 |
| Record Collection | Blocked by ITD-001 |
| Generate Receipt | Blocked because no collection can be saved |
| Member Ledger | Blocker ITD-002 (fabricated history) |
| Pending | Renders empty state; downstream validation awaits a valid collection |
| Auction | Renders; no eligible active operational group/member in blocked sequence |
| Lucky Draw | Renders; no eligible members in blocked sequence |
| Payout | Major ITD-007; also exposed to ITD-002 |
| Finance / Profit-Loss | Renders repository-empty state; blocked sequence produces no posting |
| Reports | Renders; reports marked ready but blocked sequence has no collection evidence |
| AI Workspace | Functional shell; layout not approved (ITD-010) |
| Academy | Renders and existing component/service tests pass |
| Support | Renders; ticket modal/repository path present |
| Settings | Renders; identity/template controls present |

## Pre-fix trial decision

**NO-GO.** Core collection/receipt progression is blocked, ledger evidence is fabricated in the absence of repository rows, dashboard tenant context diverges from the Chit tenant, and local-trial mode is inconsistent with the declared production/Supabase configuration.

## Post-fix final report

### Blockers fixed

- **ITD-001:** Reconstructed groups now use canonical active status; collection and receipt handoff verified in the browser.
- **ITD-002:** Empty collection evidence now yields zero paid transactions and no fabricated ledger/payout history.
- **ITD-003:** Dashboard initial tenant now matches the authenticated active Chit tenant; explicit persisted switches retain precedence.
- **ITD-004:** Repository-local trial now explicitly runs in `demo / local`; production Supabase guards remain unchanged and tested.
- **ITD-015:** A posted collection and matching finance row normalize to one income entry.
- **ITD-016:** Dashboard displays actual cycle collections and business health does not double-count collection finance postings.

### Blockers remaining

- **None found after the final clean-browser rerun.**

### Major defects remaining

- 7: ITD-005 through ITD-011.

### Minor defects remaining

- 4: ITD-012 through ITD-014 and ITD-017.

### Verification

- **Tests:** PASS — 106 tests, 5 suites, 0 failed.
- **Build:** PASS — Vite production build, 2,122 modules transformed.
- **Lint:** PASS with warnings — exit code 0; 25 pre-existing warnings remain under ITD-014.
- **`git diff --check`:** PASS — no whitespace errors; only line-ending conversion notices.
- **Browser trial:** PASS for the repaired core chain: login, tenant-aligned dashboard, batch focus/save, document Chit creation, member save, `Rs 10,000` collection, matching receipt, one-entry ledger, `Rs 10,000` Finance income/profit, `Rs 10,000` Dashboard monthly collections, Pending zero, Auction modal with one eligible member, Lucky Draw with one eligible member, and no captured browser errors.

### GO / NO-GO

**GO for continuing the repository-local internal trial, with the registered Major/Minor limitations. NO-GO for production release or Supabase-mode acceptance.** The internal happy path is no longer blocked and financial totals reconcile for the exercised collection, but manual blank Chit creation, payout UI integration, AI-created operational dates, member uniqueness, visual approvals, encoding cleanup, and style consistency still require separate authorized work.
