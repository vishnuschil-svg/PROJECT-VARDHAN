# Phase 3 Blockers

## Production Blockers

- Supabase RLS policies must be finalized against real auth claims.
- Full browser workflow needs manual execution on real tenant data.
- External WhatsApp/SMS/email providers are not connected.
- OCR/LLM providers remain local/manual fallback only.
- India/USA compliance needs accountant/legal review.

## Technical Debt

- Existing dirty worktree should be reviewed before release packaging.
- Route-level browser testing is still required for all newly wired actions.
