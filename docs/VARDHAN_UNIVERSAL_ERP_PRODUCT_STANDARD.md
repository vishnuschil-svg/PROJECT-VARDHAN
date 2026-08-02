# VARDHAN Universal ERP Product Standard

**Status:** LOCKED — applies to all current and future Vardhan ERP modules  
**Audience:** Developers and AI coding agents  
**Companion rule:** `.cursor/rules/vardhan-product-standard.mdc` (Always Apply)

This document is the detailed product, design, and architecture standard for building every ERP on the Vardhan platform. It complements — and does not replace — the visual ground truth in:

| File | Role |
|---|---|
| `docs/design-system.md` | Locked tokens, typography, signature moves, page anatomy |
| `docs/reference/vardhan-landing.html` | Public marketing UI |
| `docs/reference/vardhan-dashboard.html` | Authenticated shell + internal patterns |
| `docs/reference/vardhan-login.html` | Authentication UI language |

---

## 1. Purpose

Vardhan is a modular multi-industry Business OS. Every existing and future ERP (Chit Management, School, College, Hostel, Insurance, Partner OS, and any later product) must feel like **one product family**: same identity, same shell, same interaction patterns, same Core services.

The finished experience must feel natural, mature, calm, functional, spacious, trustworthy, and easy for Indian business users.

---

## 2. Brand identity (locked)

| Element | Value |
|---|---|
| Brand name | **Vardhan** |
| Subtitle | **ERP PLATFORM** |
| Logo mark | Maroon rounded square with **V** |

### Do not use

- “VARDHAN OS” or other alternate global brand names in the shell
- Generic AI branding or random product renames in global chrome
- Third-party product names presented as Vardhan’s brand

Product/module names (e.g. MITRA NIDHI CHITI PRO) may appear as **application titles** inside the shared shell, never as a replacement for the global Vardhan wordmark.

---

## 3. Design philosophy

### Allowed inspiration

- Odoo-level product clarity
- Modular app launcher thinking
- Consistent workflow vocabulary (list → form → action → report)
- Calm enterprise spacing and restraint

### Forbidden copying

Never copy Odoo (or any competitor):

- logos or marks
- illustrations or proprietary assets
- marketing wording
- exact page layouts or proprietary UI chrome

Reskin philosophy only. Keep an original Vardhan identity.

---

## 4. Locked design tokens

Source of truth: `docs/design-system.md`.

### Colors

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#1A1A1A` | Primary text, headings |
| `--ink-soft` | `#5B5560` | Secondary/body text |
| `--bg` | `#FFFFFF` | Page background |
| `--bg-soft` | `#F7F4EF` | Alternating / canvas background |
| `--maroon` | `#7A1F3D` | Primary actions, links, active states |
| `--maroon-dark` | `#5A1730` | Primary hover |
| `--amber` | `#F0B94A` | Accent highlight, stamps, live emphasis |
| `--amber-soft` | `#FBEED9` | Soft accent surfaces, avatars |
| `--line` | `rgba(26,26,26,0.09)` | Borders and dividers |

Supporting operational tokens (internal):

| Token | Hex | Use |
|---|---|---|
| Green | `#2F7A52` on `#E4F3EA` | Positive deltas / healthy states |
| Red | `#C24545` | True declines / destructive only |

### Typography

| Role | Font | Weights |
|---|---|---|
| Headings, titles, metrics, financial values | **Sora** | 600 / 700 / 800 |
| Body, forms, labels, tables, controls | **IBM Plex Sans** | 400 / 500 / 600 / 700 |
| Handwritten callout | **Caveat** | 600 / 700 — **maximum one** on public/login pages |

Do not introduce other font families.

### Radius & shadow

- Buttons / inputs: `8px` (forms may use up to `12px` per design-system form notes)
- Cards: `14px`
- Large CTA / hero bands: `20–24px`
- Shadows: minimal; hover only `0 12px 24px -14px rgba(26,26,26,0.2)`

### Icons

- Simple **2px-stroke** line icons (lucide-react where suitable)
- No emoji in production UI
- Flat rounded-square tints may rotate only through:

`#F6E3E9` · `#E1F2E7` · `#FBEED9` · `#EBE3F0` · `#F8E1E6` · `#DEEAF5`

---

## 5. Screen families

### Public

Follow `vardhan-landing.html`: sticky nav, left-aligned hierarchy, maroon primary buttons, sparse amber highlight, icon strips, clean rows, dot feature lists, CTA band, consistent footer. No fake business data.

### Authentication

Follow `vardhan-login.html`: ~44% maroon brand panel / ~56% white form, tabs, inputs, validation, mobile stack. Preserve real auth methods and logic. No login-only decorative theme/language chrome unless product requirements explicitly keep locale for accessibility.

### Authenticated application

Follow `vardhan-dashboard.html` shell language: white `252px` sidebar, grouped uppercase section labels, active item `#F6E3E9` + maroon text, sticky top bar, soft canvas background.

---

## 6. One shared application shell (mandatory)

Every authenticated ERP **must** reuse one shared shell containing:

1. App launcher / module switcher  
2. Primary navigation  
3. Workspace switcher  
4. Breadcrumbs  
5. Global search  
6. Notifications  
7. Profile menu  
8. Responsive mobile navigation (drawer / bottom bar as appropriate)

### Rules

- Do **not** create a different visual shell for a new ERP
- Only **menu content** and **permissions** change by role or module
- Platform Owner, Super Admin, Admin, Staff, Demo Customer, and Partner/Agent portals share the same chrome

Implementation should extend existing shell components (`DashboardLayout`, shared sidebar/topbar patterns, brand CSS) rather than inventing parallel layout systems.

---

## 7. Standardized views and components

Every ERP must reuse (or contribute to) shared patterns for:

| Pattern | Expectation |
|---|---|
| List views | Title, context, primary action, search, filters, grouping, table/list, pagination, empty/loading/error |
| Form / detail views | Breadcrumbs, record title + status, primary actions, clear sections, tabs only when needed, activity/audit |
| Kanban views | Same status vocabulary and card density as the design system |
| Calendar / timeline | Calm ink/maroon accents; no neon charts |
| Search / filter / group | Shared control language |
| Tables | Compact readable rows; financial numbers in Sora; controlled horizontal scroll; mobile fallback for critical flows |
| Dialogs / drawers | Shared header/body/footer; clear destructive confirmation |
| Status labels | Consistent badge tokens (maroon/green/amber/soft) |
| Activity timelines | Hairline rows, not heavy cards |
| Reports & dashboards | Real data; actionable metrics |

Prefer extending existing primitives under `src/components/common/` and shell layouts before adding new ones.

---

## 8. Dashboard honesty

Dashboards must show **only real, actionable data**:

- today’s work
- pending actions
- exceptions
- approvals
- reconciliation issues

### Never

- fake KPIs or customer counts
- fake revenue or MRR
- fake testimonials
- decorative “AI insights” without evidence
- mock data replacing live repositories in production UI

---

## 9. VARDHAN Core reuse

New ERP modules **must not** reimplement platform foundations. Reuse Core for:

- Authentication  
- Organizations / workspaces  
- Users and roles  
- Subscriptions  
- Payments  
- Partner OS  
- Notifications  
- Documents  
- Reports  
- Audit logs  
- AI support  
- Support tickets  

Domain logic for a new industry ERP lives in that module; tenancy, access, billing, and cross-cutting services stay in Core.

---

## 10. New ERP development process

Before implementing a new ERP, complete research and planning:

1. **Business workflow research** — how the industry actually operates day to day  
2. **Competitor and Odoo pattern study** — workflow clarity only; no asset copying  
3. **Route map**  
4. **Roles and permissions**  
5. **Entity / data model**  
6. **Page / view map**  
7. **Acceptance tests**

### Required product specification pack

Create:

```text
docs/products/<product-name>/
  PRODUCT_VISION.md
  WORKFLOW_MAP.md
  ROLES_PERMISSIONS.md
  DATA_MODEL.md
  ROUTE_SCREEN_MAP.md
  ACCEPTANCE_TESTS.md
```

Do not start feature UI until this pack exists for the product.

---

## 11. Functional safety (non-negotiable)

This platform already runs real business workflows. Agents and developers must:

- Preserve existing routes unless a deliberate, documented migration is requested  
- Preserve Supabase authentication and database operations  
- Preserve repositories and tenant/workspace isolation  
- Preserve RLS assumptions, roles, permissions  
- Preserve forms, validations, calculations, collections, receipts, ledgers, auctions, winners, payouts, reports  
- Preserve subscriptions, agent mappings, commissions  
- Preserve API, OCR/Gemini, payment, upload, and notification integrations  

Treat visual work as a **UX/visual refactor** unless the task explicitly authorizes business-logic changes. Document any essential schema change before applying it.

---

## 12. Forbidden visual patterns

Do not ship:

- Purple / violet legacy UI or gradients  
- Blue/cyan glow backgrounds as brand chrome  
- Glassmorphism  
- Random gradients on cards  
- Oversized shadows  
- Emoji icons in production  
- Excessive floating KPI card grids  
- Generic AI SaaS dashboard templates  
- Cream (`#F4F1EA`) + terracotta AI-default palettes  
- Near-black neon accent themes  
- Alternate global branding such as “VARDHAN OS”

---

## 13. Responsive and accessibility checks

Every screen (new or redesigned) must be verified at:

| Width | Intent |
|---|---|
| 1440px | Desktop |
| 1280px | Laptop |
| 768px | Tablet |
| 390px | Mobile |

Below ~760px: collapse sidebar into a mobile drawer / equivalent; keep critical actions reachable; avoid horizontal page overflow; keep forms usable; provide controlled table scroll or mobile list fallbacks; keep touch targets accessible.

Always support `prefers-reduced-motion: reduce` (disable non-essential transitions and count-up animations).

---

## 14. Operations safety

Unless the user **explicitly** requests it:

- Do **not** push to GitHub  
- Do **not** deploy to production/staging  
- Do **not** change secrets or environment variables  

Prefer feature branches and local commits when asked.

---

## 15. Agent checklist (quick)

Before writing UI code for any ERP screen:

1. Read `docs/design-system.md` and the relevant reference HTML  
2. Confirm branding is **Vardhan / ERP PLATFORM**  
3. Reuse the shared authenticated shell (or public/auth patterns)  
4. Reuse standardized views/components  
5. Use only locked tokens and fonts  
6. Keep data real — no fake metrics  
7. For new ERPs, ensure `docs/products/<name>/` specs exist  
8. Preserve Core services and business logic  
9. Verify 1440 / 1280 / 768 / 390  
10. Do not push, deploy, or touch env/secrets without explicit request  

---

## 16. Related documents

- `docs/design-system.md`  
- `docs/reference/vardhan-landing.html`  
- `docs/reference/vardhan-dashboard.html`  
- `docs/reference/vardhan-login.html`  
- `docs/VARDHAN_COMPLETE_UI_REDESIGN_AUDIT.md` (route redesign inventory)  
- `.cursor/rules/vardhan-product-standard.mdc` (always-applied Cursor rule)
