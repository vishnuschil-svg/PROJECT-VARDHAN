# Vardhan ERP — Design System Spec (LOCKED)

Use this exact spec to build every screen of the Vardhan ERP application. It is modeled on Odoo's real homepage anatomy, reskinned with Vardhan's own brand colors and content. Paste this whole document into ChatGPT (or hand to any developer) with the instruction: **"Build this screen using the design system below, exactly."**

---

## 1. Brand tokens (do not change)

### Colors
| Token | Hex | Use |
|---|---|---|
| `--ink` | `#1A1A1A` | Primary text, headings |
| `--ink-soft` | `#5B5560` | Secondary/body text |
| `--bg` | `#FFFFFF` | Page background |
| `--bg-soft` | `#F7F4EF` | Alternating section background |
| `--maroon` | `#7A1F3D` | Primary brand color — buttons, links, active states |
| `--maroon-dark` | `#5A1730` | Hover state for maroon elements |
| `--amber` | `#F0B94A` | Accent — highlight marker, stamps, live-count numbers |
| `--amber-soft` | `#FBEED9` | Amber tint backgrounds (quote cards, avatars) |
| `--line` | `rgba(26,26,26,0.09)` | All borders and dividers |

### Typography
- **Headings:** `Sora` (Google Font), weights 600/700/800. Used for all `h1`/`h2`/`h3`, big numbers, and card titles. Letter-spacing `-0.01em`.
- **Body:** `IBM Plex Sans`, weights 400/500/600/700. Used for all paragraph text, buttons, labels.
- **Handwritten accents ONLY:** `Caveat`, weight 600/700. Used sparingly — one callout per page max — for a human, non-corporate touch (e.g. an arrow-pointed note near the hero).

### Radius & shadow
- Buttons/inputs: `8px` radius.
- Cards: `14px` radius.
- Large CTA bands / hero cards: `20–24px` radius.
- Shadows are minimal — never a heavy drop shadow. Use `box-shadow: 0 12px 24px -14px rgba(26,26,26,0.2)` only on hover states.

---

## 2. Signature design moves (what makes this "Vardhan," not generic)

1. **The amber marker highlight** — one key phrase per headline gets a hand-drawn-looking highlighter block behind it (amber, slightly rotated `-1.2deg`, `z-index:-1`). Use on exactly ONE phrase per hero. Never more.
2. **One handwritten callout per page, max** — a short `Caveat`-font note with a hand-drawn SVG arrow, pointing at a stat or price. Never decorative, always points at something real (a number, a price, a proof point).
3. **Flat icon squares, not illustrations or emoji in production** — every module/product gets a `52–74px` rounded-square icon in a pastel tint background (`#F6E3E9`, `#E1F2E7`, `#FBEED9`, `#EBE3F0`, `#F8E1E6`, `#DEEAF5` — rotate through these six tints). In production, replace placeholder emoji with simple 2px-stroke line icons in `--maroon`.
4. **Dot-prefixed feature lists, not icon cards** — for "what's included" style sections, use a small amber dot + bold `Sora` title + one line of `ink-soft` body text. Do NOT wrap these in bordered cards — Odoo's real "Enterprise done right" section is card-free, just clean columns.
5. **One amber quote-card per page, max** — a full-width `amber-soft` background card with a large `Sora` semi-bold quote. Used once, right after the hero/icon-strip, never repeated.

---

## 3. Page anatomy (in this exact order — this is the locked structure)

1. **Sticky nav** — logo mark (maroon rounded square with "V") + wordmark, center nav links, right-aligned "Sign in" + primary "Start free" button.
2. **Hero** — left-aligned (not centered) big `Sora 800` headline with one amber-marked phrase, one-line price/value statement in italic `ink-soft`, two buttons (solid maroon + gray-outline), then the ONE handwritten callout with arrow.
3. **Icon strip** — small flat-icon row of all modules/apps, directly under the hero, no borders, just icon + label, centered, wraps on mobile.
4. **Amber quote card** — one big quote, centered or left-weighted.
5. **Module detail rows** — NOT cards. Horizontal rows: icon (56px) — title + description — "Explore →" link. Divided by hairline borders only.
6. **Feature checklist** — 3-column grid (2-col tablet, 1-col mobile) of dot + title + description. No card borders.
7. **Proof section** — one big `Sora 800` stat number + one-line label, then a single testimonial quote with avatar-initial circle + name + designation.
8. **CTA band** — solid maroon rounded card (`24px` radius), centered, one heading, one line of body text, one button, one small trust line below it ("No credit card required · Instant access").
9. **Footer** — 5-column: brand blurb + 4 link columns (Product / Company / Resources / Legal). Bottom bar: copyright only, left-aligned.

---

## 4. Rules for extending this to new screens (dashboard, login, etc.)

- Sidebar (internal app): white background, `252px` fixed width, grouped nav sections with uppercase `10.5px` labels, active item gets `#F6E3E9` background + maroon text.
- Every internal metric number uses `Sora 700/800` — never the body font for numbers.
- Positive deltas always in a green token (`#2F7A52` text on `#E4F3EA` chip if boxed); never color-code negative deltas red unless it's truly a decline — most ERP deltas here are growth-positive.
- Charts: simple SVG line/area only, maroon stroke + amber fill at 15% opacity. No chart libraries, no 3D, no heavy gridlines.
- Forms: `12px` radius inputs, `1px` `--line` border, maroon border + outline on focus. Label above field, `13px` `Sora`-adjacent weight 600.
- Always support `prefers-reduced-motion: reduce` — disable count-up animations and transitions for users who request it.

---

## 5. What to explicitly avoid

- ❌ Cream (`#F4F1EA`) + terracotta (`#D97757`) combo — this is a generic "AI-generated" default, not Vardhan's palette.
- ❌ Near-black background with neon accent — not this brand.
- ❌ Numbered `01 / 02 / 03` markers unless the content is a genuine sequence.
- ❌ More than one handwritten note or one amber quote-card per page — restraint is the point.
- ❌ Heavy drop shadows, gradients on every card, glassmorphism — keep it flat and calm.
- ❌ Emoji icons in the shipped product — they're placeholders only; replace with proper SVG line icons before production.

---

## 6. Reference files already built (attach these alongside this spec)

- `vardhan-landing.html` — marketing homepage, full anatomy above
- `vardhan-dashboard.html` — internal app dashboard (sidebar + topbar + metrics)
- `vardhan-login.html` — sign-in screen (mobile OTP + email tabs, animated ledger panel)

Tell ChatGPT: *"Match the color tokens, typography, spacing, and component patterns in these three files exactly when building [new screen name]."*
