# VARDHAN Complete UI Redesign Audit

**Branch:** `design/vardhan-natural-ui`  
**Ground truth:** `docs/design-system.md`, `docs/reference/vardhan-landing.html`, `docs/reference/vardhan-dashboard.html`, `docs/reference/vardhan-login.html`  
**Started:** 2026-08-02  
**Updated:** 2026-08-02 (AI Chit upload + OCR diagnosis continuation)  
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
| 7 | AI Chit Capture shell + OCR contract honesty | `design(chits): align smart chit capture with shell` *(local work; not committed unless requested)* |

**Note:** No dedicated School/College/Hostel/Insurance app routes exist beyond public product pages and roadmap stubs. Partner portal is represented by `/vardhan-os` public + platform Partner OS copy; no separate partner app router today.

---

## Shared shells (current → target)

| Current shell | Used by | Target |
|---|---|---|
| `PublicSite` header/footer | All public routes | Keep; locked landing tokens |
| `AuthLayout` + `premium-auth-*` | `/login` | Login-reference 44/56 maroon panel |
| `AccessShell` | `/register`, forgot/reset | Same auth visual language |
| `DashboardLayout` + Sidebar/Topbar | `/dashboard`, products, upgrade | Dashboard-reference shell |
| `AdminLayout` + AdminNavigation | `/admin/*` | Same shell chrome; menu differs |
| `ChitLayout` + ChitNavigation | `/chits/*` including `/chits/ai-chit/*` | Same shell chrome; menu differs |

---

## Route inventory

### PUBLIC

| Path | Component | Design status | Target | Shared shell | Problems | Risks | Status |
|---|---|---|---|---|---|---|---|
| `/` | `PublicSite` HomeLanding | Redesigned | landing.html | Public | — | Preserve product links | Done |
| `/vardhan-os` | PublicSite OsPage | Aligned | landing tokens | Public | Partner OS copy kept intentional | Route must remain | Done |
| `/features` | ContentPage | Aligned | landing | Public | — | — | Done |
| `/how-it-works` | ContentPage | Aligned | landing | Public | — | — | Done |
| `/pricing` | ContentPage | Aligned | landing | Public | Honest no-price copy OK | — | Done |
| `/demo` | ContentPage | Aligned | landing | Public | — | — | Done |
| `/trial` | ContentPage | Aligned | landing | Public | — | — | Done |
| `/videos` | ContentPage | Aligned | landing | Public | — | — | Done |
| `/tutorials` | ContentPage | Aligned | landing | Public | — | — | Done |
| `/documentation` | ContentPage | Aligned | landing | Public | — | — | Done |
| `/blogs` | ContentPage | Aligned | landing | Public | — | — | Done |
| `/customer-stories` | ContentPage | Aligned | landing | Public | — | — | Done |
| `/security` | ContentPage | Aligned | landing | Public | — | — | Done |
| `/contact` | ContentPage | Aligned | landing | Public | — | — | Done |
| `/products/mitra-nidhi-chiti-pro` | ProductPage | Aligned | landing | Public | Status chip OK | Preserve Available truth | Done |
| `/products/school-erp` | ProductPage | Aligned | landing | Public | Roadmap only | No fake demos | Done |
| `/products/college-erp` | ProductPage | Aligned | landing | Public | Roadmap only | — | Done |
| `/products/private-hostels-erp` | ProductPage | Aligned | landing | Public | Roadmap only | — | Done |
| `/products/insurance-crm` | ProductPage | Aligned | landing | Public | Roadmap only | — | Done |

### AUTH

| Path | Component | Design status | Target | Shared shell | Problems | Risks | Status |
|---|---|---|---|---|---|---|---|
| `/login` | PremiumLogin + AuthLayout | Redesigned | login.html | Auth shell | — | Preserve OTP/password/passkey | Done |
| `/register` | Register + AccessShell | Redesigned | login language | AccessShell | — | Preserve register flow | Done |
| `/forgot-password` | ForgotPassword + AccessShell | Redesigned | login | AccessShell | — | Preserve reset request | Done |
| `/reset-password` | ResetPassword + AccessShell | Redesigned | login | AccessShell | — | Preserve token reset | Done |
| `/logout` | Logout | Minimal | system | — | — | Session clear must stay | Done |

### PARTNER OS / PLATFORM CORE (tenant dashboard)

| Path | Component | Design status | Target | Shared shell | Problems | Risks | Status |
|---|---|---|---|---|---|---|---|
| `/dashboard` | Dashboard + DashboardLayout | Mostly aligned | dashboard.html | AppShell | Residual decorative density in home widgets | Real workspace data | Polish remaining |
| `/products/catalog` | ProductCatalog | Aligned | dashboard shell | AppShell | — | Licensing state | Done |
| `/products/:productId` | ProductWorkspace | Aligned | dashboard shell | AppShell | — | Module gate | Done |
| `/upgrade-subscription` | UpgradeSubscription | Aligned | dashboard shell | AppShell | — | Billing flow | Done |
| `/upgrade-subscription/:productId` | UpgradeSubscription | Aligned | dashboard shell | AppShell | — | Same | Done |

### PLATFORM ADMIN

| Path | Component | Design status | Target | Shared shell | Problems | Risks | Status |
|---|---|---|---|---|---|---|---|
| `/admin` … `/admin/settings` (19 routes) | Admin pages | Shell-aligned | dashboard shell | Admin→AppShell | Dense tables at 390px still need spot-check | platformOnly guard | Done (shell); responsive polish open |

### CHIT MANAGEMENT

| Path | Component | Design status | Target | Shared shell | Problems | Risks | Status |
|---|---|---|---|---|---|---|---|
| `/chits` | ChitDashboard | Shell-aligned | dashboard shell | Chit→AppShell | High widget density | Real KPIs | Polish remaining |
| `/chits/groups` | ChitGroups | Aligned | dashboard | Chit | — | Group CRUD | Done |
| `/chits/batches` | Batches | Aligned | dashboard | Chit | — | — | Done |
| `/chits/members` | Members | Aligned | dashboard | Chit | — | Member money path | Done |
| `/chits/member-ledger` | MemberLedger | Aligned | dashboard | Chit | — | Ledger integrity | Done |
| `/chits/collections` | Collections | Aligned | dashboard | Chit | — | Collections | Done |
| `/chits/collections/pending` | PendingCollections | Aligned | dashboard | Chit | — | — | Done |
| `/chits/auctions` | Auctions | Aligned | dashboard | Chit | — | Auction logic | Done |
| `/chits/finance` | FinanceAccounts | Aligned | dashboard | Chit | — | Finance | Done |
| `/chits/lucky-draw` | LuckyDraw | Aligned | dashboard | Chit | — | Winner selection | Done |
| `/chits/payouts` | Payouts | Aligned | dashboard | Chit | — | Payouts | Done |
| `/chits/dividends` | Dividends | Aligned | dashboard | Chit | — | — | Done |
| `/chits/receipts` | Receipts | Aligned | dashboard | Chit | — | Receipts | Done |
| `/chits/reports` | Reports | Aligned | dashboard | Chit | Chart libs OK | Reports | Done |
| `/chits/documents` | Documents | Aligned (purple dropzone neutralized) | dashboard | Chit | — | Uploads | Done |
| `/chits/notifications` | Notifications | Aligned | dashboard | Chit | — | — | Done |
| `/chits/ai-chit/*` | AIChitFlow | **Redesigned into ChitLayout** | dashboard | Chit | Was dark navy/violet phone-frame wizard | OCR/AI flows preserved | **Done (Batch 7)** |
| `/chits/smart-capture` | SmartChitCapturePage | **Now uses ChitLayout** | dashboard | Chit | — | OCR | **Done** |
| `/chits/academy` | Academy | Aligned | dashboard | Chit | — | Learning content | Done |
| `/chits/ai` | AIWorkspace | **Purple chrome removed** | dashboard | Chit | — | AI chat | **Done** |
| `/chits/support` | Support | Aligned | dashboard | Chit | — | — | Done |
| `/chits/settings` | Settings | Aligned | dashboard | Chit | — | — | Done |

### ERROR / SYSTEM

| Path | Component | Design status | Target | Status |
|---|---|---|---|---|
| `*` | Navigate → `/dashboard` | System redirect | Keep behavior | Preserve |
| Suspense fallback | AppRouter RouteFallback | Calm loader | Calm ink/bg | Done |
| ErrorBoundary | common/ErrorBoundary | Calm panel | Calm error panel | Done |

---

## OCR diagnosis (2026-08-02)

**Frontend request URL:** `POST /api/v1/ocr/extract` (via `VITE_PLATFORM_API_URL` default `/api`)

**Proxy:** Vite `/api` → `http://127.0.0.1:8000` (no rewrite)

**Backend route:** FastAPI `/api` + `/v1/ocr/extract`

**Health:** `GET /api/health` returns booleans only: `database`, `jwt`, `ocrProvider`. Local probe: all `true`. `ocrProvider` means `GEMINI_API_KEY` is non-empty — it does **not** live-call Gemini.

| Env key | Root `.env` | Root `.env.local` | `backend/.env` | Notes |
|---|---|---|---|---|
| `GEMINI_API_KEY` | missing | missing | **SET** | Server-side only (correct) |
| `GEMINI_MODEL` | missing | missing | **SET** (`gemini-3.6-flash`) | Model listing returns HTTP 200 |
| `VITE_PLATFORM_API_URL` | missing | **SET** (`/api`) | n/a | Correct same-origin proxy |
| `DATABASE_URL` | missing | missing | **SET** | Required for OCR workspace auth |
| `SUPABASE_JWT_SECRET` | missing | missing | **SET** | JWT path ready |
| `SUPABASE_URL` | missing | missing | missing | JWKS path unused; legacy JWT secret used |
| OCR size/timeout/retry knobs | missing | missing | missing | Defaults apply |

**Root cause of misleading `OCR_PROVIDER_UNAVAILABLE`:**  
Frontend `normalizeErrorCode` previously mapped **all** HTTP 502/503 to `OCR_PROVIDER_UNAVAILABLE`, overriding backend domain codes such as `OCR_NOT_CONFIGURED` and `OCR_SCHEMA_INVALID`. Messages also preferred the status generic over the backend safe detail.

**Fix applied:** Prefer known backend OCR codes; prefer backend safe message; structured `[OCR]` console logging (no secrets); Upload screen shows OCR status panel, Retry (max 3), manual entry, re-upload; no fake OCR results.

**Unauthenticated probe:** `POST /api/v1/ocr/extract` → **401** (expected). Authenticated failures now surface the real domain code.

---

## Redesign progress log

| Date | Batch | Notes |
|---|---|---|
| 2026-08-02 | Audit | Inventory created |
| 2026-08-02 | 1–6 | Foundation through modules (prior commits on branch) |
| 2026-08-02 | 7 | `/chits/ai-chit/*` + `/chits/smart-capture` + `/chits/ai` + OCR adapter honesty |

---

## Acceptance checklist (updated)

- [x] Every AppRouter route audited in this document
- [x] Locked tokens loaded globally via `vardhan-brand.css`
- [x] `/chits/ai-chit/upload` uses ChitLayout + locked tokens (no dark navy/violet phone frame)
- [x] OCR error codes no longer collapsed incorrectly
- [x] Tests **191** pass / production **build succeeds**
- [x] Lint: no new UTF-8/build blockers; pre-existing unused-param warnings remain
- [x] No secrets/env changes; no push/deploy

### Remaining legacy / polish routes

These are **not** dark-purple AI demos anymore, but still deserve visual density/responsive spot-checks:

1. `/dashboard` — residual decorative home widgets (`VardhanHome.css` partially cleaned)
2. `/chits` — command dashboard widget density
3. `/admin/*` list tables at 390px width
4. Auth OTP + passkey messaging edge states
5. Chart-heavy `/chits/reports` at narrow widths

### Remaining limitations

- No dedicated School/College/Hostel/Insurance authenticated apps yet (public stubs only)
- No separate Partner portal router (Partner OS = `/vardhan-os` + platform copy)
- Catch-all `*` still redirects to `/dashboard` (behavior preserved)
- Live OCR still requires authenticated workspace + Gemini quota/network; failures stay explicit
