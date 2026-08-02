# VARDHAN Complete UI Redesign Audit

**Branch:** `design/vardhan-natural-ui`  
**Ground truth:** `docs/design-system.md`, `docs/reference/vardhan-landing.html`, `docs/reference/vardhan-dashboard.html`, `docs/reference/vardhan-login.html`  
**Started:** 2026-08-02  
**Constraint:** Visual/UX refactor only. No schema, secrets, env, push, or deploy.

---

## Batch plan

| Batch | Scope | Commit message |
|---|---|---|
| 1 | Tokens, typography, buttons, inputs, badges, tables, dialogs, icons, public nav/footer, shared authenticated shell, mobile shell | `design(ui): establish vardhan design foundation` |
| 2 | Login, register, forgot/reset password, OTP/auth states | `design(auth): unify authentication experience` |
| 3 | Platform dashboard, orgs, users/roles, subscriptions, billing, support, settings, audit | `design(platform): refactor platform core screens` |
| 4 | All `/chits/*` operational screens | `design(chits): unify chit management experience` |
| 5 | Partner OS branding surfaces + remaining product stubs | `design(partners): unify partner portal experience` |
| 6 | Remaining modules, shared errors, final polish | `design(modules): align remaining product modules` |

**Note:** No dedicated School/College/Hostel/Insurance app routes exist beyond public product pages and roadmap stubs. Partner portal is represented by `/vardhan-os` public + platform Partner OS copy; no separate partner app router today.

---

## Shared shells (current → target)

| Current shell | Used by | Target |
|---|---|---|
| `PublicSite` header/footer | All public routes | Keep; locked landing tokens (Batch 1 polish) |
| `AuthLayout` + `premium-auth-*` | `/login` | Replace with login-reference 44/56 maroon panel (Batch 2) |
| `AccessShell` | `/register`, forgot/reset | Same auth visual language (Batch 2) |
| `DashboardLayout` + Sidebar/Topbar | `/dashboard`, products, upgrade | Unify to dashboard-reference shell (Batch 1) |
| `AdminLayout` + AdminNavigation | `/admin/*` | Same shell chrome; menu differs (Batch 1+3) |
| `ChitLayout` + ChitNavigation | `/chits/*` | Same shell chrome; menu differs (Batch 1+4) |

---

## Route inventory

### PUBLIC

| Path | Component | Design status | Target | Shared shell | Problems | Risks | Status |
|---|---|---|---|---|---|---|---|
| `/` | `PublicSite` HomeLanding | Partially redesigned | landing.html | Public | Residual “VARDHAN OS” in secondary pages | Preserve product links | In progress |
| `/vardhan-os` | PublicSite OsPage | Mixed | landing tokens | Public | “Partner OS / VARDHAN OS” copy | Route must remain | Pending branding |
| `/features` | ContentPage | Mixed | landing | Public | Generic content card | — | Pending |
| `/how-it-works` | ContentPage | Mixed | landing | Public | Same | — | Pending |
| `/pricing` | ContentPage | Mixed | landing | Public | Honest no-price copy OK | — | Pending |
| `/demo` | ContentPage | Mixed | landing | Public | Same | — | Pending |
| `/trial` | ContentPage | Mixed | landing | Public | Same | — | Pending |
| `/videos` | ContentPage | Mixed | landing | Public | Same | — | Pending |
| `/tutorials` | ContentPage | Mixed | landing | Public | Same | — | Pending |
| `/documentation` | ContentPage | Mixed | landing | Public | Same | — | Pending |
| `/blogs` | ContentPage | Mixed | landing | Public | Same | — | Pending |
| `/customer-stories` | ContentPage | Mixed | landing | Public | Same | — | Pending |
| `/security` | ContentPage | Mixed | landing | Public | Same | — | Pending |
| `/contact` | ContentPage | Mixed | landing | Public | Same | — | Pending |
| `/products/mitra-nidhi-chiti-pro` | ProductPage | Mixed | landing | Public | Status chip OK | Preserve Available truth | Pending polish |
| `/products/school-erp` | ProductPage | Mixed | landing | Public | Roadmap only | No fake demos | Pending |
| `/products/college-erp` | ProductPage | Mixed | landing | Public | Roadmap only | — | Pending |
| `/products/private-hostels-erp` | ProductPage | Mixed | landing | Public | Roadmap only | — | Pending |
| `/products/insurance-crm` | ProductPage | Mixed | landing | Public | Roadmap only | — | Pending |

### AUTH

| Path | Component | Design status | Target | Shared shell | Problems | Risks | Status |
|---|---|---|---|---|---|---|---|
| `/login` | PremiumLogin + AuthLayout | Legacy purple/navy + theme/lang chrome | login.html | Auth shell | “VARDHAN OS”, language/theme toolbar, blue accents | Preserve OTP/password/passkey logic | Pending Batch 2 |
| `/register` | Register + AccessShell | Violet gradients | login.html language | AccessShell | Glass/violet CTAs | Preserve register flow | Pending Batch 2 |
| `/forgot-password` | ForgotPassword + AccessShell | Violet | login | AccessShell | Same | Preserve reset request | Pending Batch 2 |
| `/reset-password` | ResetPassword + AccessShell | Violet | login | AccessShell | Same | Preserve token reset | Pending Batch 2 |
| `/logout` | Logout | Minimal | system | — | Branding text | Session clear must stay | Pending Batch 2 |

### PARTNER OS / PLATFORM CORE (tenant dashboard)

| Path | Component | Design status | Target | Shared shell | Problems | Risks | Status |
|---|---|---|---|---|---|---|---|
| `/dashboard` | Dashboard + DashboardLayout | Blue/gold gradients, AI SaaS | dashboard.html | AppShell | KPI decoration, Inter/system fonts | Real workspace data | Pending Batch 3 |
| `/products/catalog` | ProductCatalog | Purple accents | dashboard shell | AppShell | Card gradients | Licensing state | Pending Batch 3 |
| `/products/:productId` | ProductWorkspace | Mixed | dashboard shell | AppShell | Inconsistent header | Module gate | Pending Batch 3 |
| `/upgrade-subscription` | UpgradeSubscription | Blue/purple | dashboard shell | AppShell | Hero gradients | Billing flow | Pending Batch 3 |
| `/upgrade-subscription/:productId` | UpgradeSubscription | Same | dashboard shell | AppShell | Same | Same | Pending Batch 3 |

### PLATFORM ADMIN

| Path | Component | Design status | Target | Shared shell | Problems | Risks | Status |
|---|---|---|---|---|---|---|---|
| `/admin` | AdminDashboard | Legacy admin CSS | dashboard shell | Admin→AppShell | Separate nav chrome | platformOnly guard | Pending Batch 3 |
| `/admin/companies` | Companies | Legacy | dashboard shell | Admin | Table chrome | — | Pending Batch 3 |
| `/admin/company-approval` | CompanyApproval | Legacy | dashboard shell | Admin | — | Approval workflow | Pending Batch 3 |
| `/admin/customers` | CustomerManagement | Legacy | dashboard shell | Admin | — | Tenant data | Pending Batch 3 |
| `/admin/branches` | BranchManagement | Legacy | dashboard shell | Admin | — | — | Pending Batch 3 |
| `/admin/departments` | DepartmentManagement | Legacy | dashboard shell | Admin | — | — | Pending Batch 3 |
| `/admin/designations` | DesignationManagement | Legacy | dashboard shell | Admin | — | — | Pending Batch 3 |
| `/admin/employees` | EmployeeManagement | Legacy | dashboard shell | Admin | — | — | Pending Batch 3 |
| `/admin/users` | UserManagement | Legacy | dashboard shell | Admin | — | Roles | Pending Batch 3 |
| `/admin/roles` | RolesPermissions | Legacy | dashboard shell | Admin | — | Permissions | Pending Batch 3 |
| `/admin/products` | ProductCatalog platformMode | Legacy | dashboard shell | Admin | — | — | Pending Batch 3 |
| `/admin/modules` | ModuleManagement | Legacy | dashboard shell | Admin | — | — | Pending Batch 3 |
| `/admin/subscription` | SubscriptionManagement | Legacy | dashboard shell | Admin | — | Billing | Pending Batch 3 |
| `/admin/licenses` | LicenseManagement | Legacy | dashboard shell | Admin | — | — | Pending Batch 3 |
| `/admin/support` | SupportTickets | Legacy | dashboard shell | Admin | — | Tickets | Pending Batch 3 |
| `/admin/notifications` | NotificationsPage | Legacy | dashboard shell | Admin | — | — | Pending Batch 3 |
| `/admin/audit-logs` | AuditLogs | Legacy | dashboard shell | Admin | — | Audit integrity | Pending Batch 3 |
| `/admin/backup` | BackupRestore | Legacy | dashboard shell | Admin | — | Destructive ops | Pending Batch 3 |
| `/admin/health` | ProductionHealth | Legacy | dashboard shell | Admin | — | — | Pending Batch 3 |
| `/admin/settings` | SystemSettings | Legacy | dashboard shell | Admin | — | Settings | Pending Batch 3 |

### CHIT MANAGEMENT

| Path | Component | Design status | Target | Shared shell | Problems | Risks | Status |
|---|---|---|---|---|---|---|---|
| `/chits` | ChitDashboard | Heavy purple “royal” CSS | dashboard shell | Chit→AppShell | Gradients, emoji-ish chrome, VARDHAN OS crumb | Real KPIs | Pending Batch 4 |
| `/chits/groups` | ChitGroups | Mixed purple | dashboard | Chit | — | Group CRUD | Pending Batch 4 |
| `/chits/batches` | Batches | Mixed | dashboard | Chit | — | — | Pending Batch 4 |
| `/chits/members` | Members | Purple accents | dashboard | Chit | — | Member money path | Pending Batch 4 |
| `/chits/member-ledger` | MemberLedger | Mixed | dashboard | Chit | Financial fonts wrong | Ledger integrity | Pending Batch 4 |
| `/chits/collections` | Collections | Purple | dashboard | Chit | — | Collections | Pending Batch 4 |
| `/chits/collections/pending` | PendingCollections | Mixed | dashboard | Chit | — | — | Pending Batch 4 |
| `/chits/auctions` | Auctions | Purple | dashboard | Chit | — | Auction logic | Pending Batch 4 |
| `/chits/finance` | FinanceAccounts | Purple | dashboard | Chit | — | Finance | Pending Batch 4 |
| `/chits/lucky-draw` | LuckyDraw | Purple | dashboard | Chit | Decorative | Winner selection | Pending Batch 4 |
| `/chits/payouts` | Payouts | Mixed | dashboard | Chit | — | Payouts | Pending Batch 4 |
| `/chits/dividends` | Dividends | Mixed | dashboard | Chit | — | — | Pending Batch 4 |
| `/chits/receipts` | Receipts | Mixed | dashboard | Chit | — | Receipts | Pending Batch 4 |
| `/chits/reports` | Reports | Mixed | dashboard | Chit | Chart libs OK if restyled | Reports | Pending Batch 4 |
| `/chits/documents` | Documents | Mixed | dashboard | Chit | — | Uploads | Pending Batch 4 |
| `/chits/notifications` | Notifications | Mixed | dashboard | Chit | — | — | Pending Batch 4 |
| `/chits/ai-chit/*` | AIChitFlow | Heavy purple wizard | dashboard | Chit | Nested wizard chrome | OCR/AI flows | Pending Batch 4 |
| `/chits/smart-capture` | SmartChitCapturePage | Mixed | dashboard | Chit | — | OCR | Pending Batch 4 |
| `/chits/academy` | Academy | Mixed | dashboard | Chit | — | Learning content | Pending Batch 4 |
| `/chits/ai` | AIWorkspace | Mixed | dashboard | Chit | Floating AI chrome | AI chat | Pending Batch 4 |
| `/chits/support` | Support | Mixed | dashboard | Chit | — | — | Pending Batch 4 |
| `/chits/settings` | Settings | Mixed | dashboard | Chit | — | — | Pending Batch 4 |

### EDUCATION / INSURANCE / SUBSCRIPTION / SUPPORT / SETTINGS

| Path | Category | Notes | Status |
|---|---|---|---|
| Public school/college/hostel product pages | EDUCATION | Public stubs only; no internal ERP routes yet | Covered under PUBLIC |
| Public insurance product page | INSURANCE | Public stub only | Covered under PUBLIC |
| `/upgrade-subscription*` , `/admin/subscription`, `/admin/licenses` | SUBSCRIPTION | Listed above | Batch 3 |
| `/admin/support`, `/chits/support`, `/contact` | SUPPORT | Listed above | Batch 3–4 |
| `/admin/settings`, `/chits/settings` | SETTINGS | Listed above | Batch 3–4 |

### ERROR / SYSTEM

| Path | Component | Design status | Target | Status |
|---|---|---|---|---|
| `*` | Navigate → `/dashboard` | System redirect | Keep behavior; optional branded fallback later | Preserve |
| Suspense fallback | AppRouter RouteFallback | Plain “Loading…” | Calm ink/bg loader | Batch 1 |
| ErrorBoundary | common/ErrorBoundary | Unknown | Calm error panel | Batch 6 |

---

## Counts

| Category | Routes |
|---|---|
| PUBLIC | 19 |
| AUTH | 5 |
| PARTNER OS / tenant core | 5 |
| PLATFORM ADMIN | 19 |
| CHIT MANAGEMENT | 22 |
| ERROR / SYSTEM | 1+ |
| **Total AppRouter paths** | **~71** |

---

## Legacy style hotspots (must neutralize)

- `src/styles/vds.css` — blue Inter SaaS tokens
- `src/styles/theme.css` — blue accents / glass
- `src/styles/access.css` — violet gradients
- `src/layouts/AuthLayout.jsx` + premium auth CSS
- `src/components/layout/DashboardLayout.css` — blue/gold glow
- `src/components/chit/ChitLayout.css`, `ChitNavigation.css`
- `src/pages/chits/ChitDashboard.css`, `AIChitFlow.css`, Collections/Members/Auctions CSS
- `src/components/dashboard/Dashboard.css`
- `src/components/common/Button.css` — blue gradient primaries
- Hardcoded “VARDHAN OS” in AuthLayout, AccessShell, ChitLayout, PremiumLogin, PublicSite secondary pages

---

## Redesign progress log

| Date | Batch | Notes |
|---|---|---|
| 2026-08-02 | Audit | Inventory created |
| 2026-08-02 | Pre | Public landing partially implemented in prior task |
| | 1–6 | Updated as batches complete |
