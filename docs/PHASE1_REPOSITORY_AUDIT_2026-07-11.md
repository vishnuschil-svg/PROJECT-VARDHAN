# PROJECT VARDHAN — Phase 1 Repository Audit

Date: 2026-07-11

## Baseline

- Active entry point: `src/main.jsx` → `src/routes/AppRouter.jsx`.
- Stack: React 19, Vite 8, React Router 7, local repositories with Supabase-ready adapters.
- Scope inspected: 567 non-generated project files; 482 files under `src`.
- Current priority application: MITRA NIDHI CHITI PRO within the VARDHAN OS shell.
- Production branch: `main`.

## Architecture map

| Area | Existing implementation | Classification | Decision |
| --- | --- | --- | --- |
| Active routing | `src/routes/AppRouter.jsx`, `ProtectedRoute.jsx` | Preserve / Improve | Keep route protection and lazy loading; group route declarations by product as the shell evolves. |
| Legacy routing | `src/App.jsx` | Remove when proven unused | Not imported by `main.jsx`; retain during this phase as audit evidence, remove only in a dedicated cleanup change. |
| Tenant/workspace | `AuthContext`, `WorkspaceContext`, scoped repositories | Preserve | Core isolation boundary; no restructuring that bypasses scope keys. |
| Chit repositories | `src/repositories/chits/*` | Preserve | Current source for core groups, members, collections, receipts, finance, auctions and reports. |
| Supabase repositories | `src/repositories/supabase/*` | Preserve / Improve | Valid adapter direction; production requires completed RLS verification and migrations. |
| Domain engines | `src/domain/chit/*`, `src/domain/finance/*` | Preserve / Merge | Verified calculations and validators remain outside JSX. Duplicate root/service finance engines need import-by-import consolidation, not deletion by filename. |
| Collections/reconciliation | collection, receipt, ledger, finance and report engines/tests | Preserve | Automated reconciliation and duplicate-payment protections are critical production logic. |
| Chit Studio | `components/chitStudio`, schedule/rule/template services | Preserve / Improve | Keep deterministic engines; upgrade import review and evidence UX in the later import phase. |
| AI providers | local rule, manual capture, external AI/OCR adapter interfaces | Preserve / Improve | Correct adapter direction. Consolidate orchestration behind one public AI facade in Phase 6. |
| AI presentation | floating assistant, assistant panels, smart capture | Replace / Merge | Existing experience is fragmented and text-heavy; retain actions/services while replacing the presentation layer. |
| Design foundations | `theme.css`, `vds.css`, `index.css`, common components | Improve / Merge | Establish one token vocabulary and reusable interaction states; remove conflicting legacy rules incrementally. |
| Platform dashboard | repository-backed dashboard components | Improve | Preserve real data sources; simplify visual hierarchy and remove decorative/non-actionable content. |
| Authentication | demo session plus Supabase-ready auth service | Replace presentation / Preserve contracts | Replace weak demo-facing screens with premium, role-aware, provider-honest flows. Never claim OTP/biometric success without a provider/capability. |
| Licensing/security | licensing engines, permission services, security repositories | Preserve / Improve | Maintain gates and audit data; add session UI and explicit provider readiness. |
| Localization | locale context, locale config, translations | Preserve / Improve | Expand centralized access copy; untranslated locales remain marked for professional review. |

## Route map

- Public access: login, registration, forgot/reset password, logout.
- VARDHAN OS: owner dashboard, product catalog, product workspace, subscription upgrade.
- Platform administration: companies, approval, customers, branches, departments, designations, employees, users, roles, products, modules, subscriptions, licenses, support, notifications, audit, backup and settings.
- MITRA NIDHI CHITI PRO: home, groups, batches, members, member ledger, collections, pending, auctions, finance, lucky draw, payouts, dividends, receipts, reports, documents, reminders and settings.

The approved primary navigation will merge secondary operations into the connected workflow without deleting their routes. For example, lucky draw remains available inside Auctions and Lift; payouts/dividends remain available inside Finance and Profit; batches remain available within Chit Groups.

## Duplicate and legacy findings

1. `src/App.jsx` duplicates a small subset of active routes and is inactive.
2. Root finance engines and `domain/finance/services` contain same-named implementations. Imports must be traced and covered by parity tests before consolidation.
3. Root repositories and `repositories/chits` intentionally serve different generations/scopes in several places. Consolidation requires migration tests.
4. Multiple AI entry points and services compete for orchestration responsibility.
5. Global search is visibly disabled and notification count is hardcoded in the legacy top bar.
6. Development/demo wording remains in `DevBanner`, login handling and a few documentation paths.
7. Several admin actions are no-op callbacks and must not be represented as completed production actions.

## Preservation rules for subsequent phases

- No financial formula changes without explicit business-rule approval.
- No repository replacement without tenant-isolation and reconciliation tests.
- No deletion based only on duplicate filenames.
- No authentication provider claims beyond configured Supabase/provider capability.
- No School ERP workflow changes while MITRA NIDHI CHITI PRO remains the priority.
- Existing business data and install configuration must remain preserved during visual/access upgrades.

## Migration plan

1. Normalize design tokens and shared primitives without changing domain behavior.
2. Upgrade access presentation and introduce explicit password/OTP/provider readiness states.
3. Improve VARDHAN OS home using existing repositories.
4. Merge the Chit navigation into the approved connected workflow while retaining deep routes.
5. Consolidate AI orchestration behind adapters and domain commands.
6. Implement evidence-based document understanding review and reconstruction.
7. Complete core workflow parity and reconciliation.
8. Add support, business communication and Academy features through real provider adapters.
9. Remove proven-unused legacy files only after import analysis and full regression tests.

## Baseline risks

- Demo credentials remain a deliberate temporary access path and are unsuitable as final production authentication.
- Supabase readiness does not equal production readiness until RLS and provider configuration are verified.
- Browser-only localStorage remains device-local and requires an explicit migration/sync policy.
- Several UI labels and messages are not yet centralized for localization.
- Responsive behavior is uneven across older admin and Chit pages.

## Verified baseline results

- Automated tests: 34 passed, 0 failed.
- Production build: passed with Vite 8.1.3 (2,707 modules at baseline).
- Lint: passed with warnings and no errors; warnings are recorded technical debt, primarily unused legacy imports and hook dependency guidance.
- Financial reconciliation coverage verified: collections, receipts, ledger, finance, pending, auctions, dashboard and reports.
- Tenant isolation coverage verified for batch and finance repository data.

## Phase decision

The baseline is safe for non-destructive presentation and access upgrades. Phase 2 and Phase 3 may proceed without changing financial formulas, repository contracts, tenant scope, or reconciliation behavior.
