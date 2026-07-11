# Phase 3 Business Rules

MITRA NIDHI CHITI PRO now separates final business rules into repositories, services, and domain engines. React components should only render repository/service output.

## Rules Covered

- Batches are organizer-defined groupings, not branch hierarchy.
- Payouts support full, partial, installments, and custom plans.
- Expenses reduce profit through the finance flow.
- Investor transactions maintain signed balances.
- Month closing and chit completion require organizer confirmation.
- Payment modes are configurable per workspace.
- Communication jobs prevent duplicate sends by tenant and dedupe key.
- Manual share fallback is explicit when no external messaging provider is connected.
- Localization uses `Intl` for currency/date formatting.

## Source Flow

Repository -> Domain Engine -> Service -> UI.

## Known Limits

Supabase RLS policies and browser click-through verification are still required before production rollout.
