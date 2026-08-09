# Group Manager V1 Freeze

Status: **READY TO FREEZE** — 2026-08-09

## Frozen architecture

- Manual Bid Records and Distribution Records are additive, tenant-scoped, organizer-entered records.
- VARDHAN stores declared outcomes and performs accounting only after final manual values are saved.
- Automated auction, winner, payout-decision, and lucky-draw capabilities remain feature-banked; legacy code and data remain preserved.
- Organizer responsibility is declared during onboarding and remains visible in settings.
- Member/group receipts identify the organizer as issuer. Bank and UPI coordinates come only from tenant-scoped organizer payment settings; VARDHAN is identified only as the technology and record-management software provider.

## Pending production migration

The only pending production migration introduced by the Group Manager safety migration is:

`supabase/migrations/015_group_manager_manual_distribution_records.sql`

It is additive and creates only `manual_bid_records` and `distribution_records`, their indexes, and tenant-membership RLS policies. It does not alter or delete legacy auction, winner, payout, or lucky-draw data.

Apply procedure (not executed during closure):

1. Back up production and verify the target project with `supabase migration list --linked`.
2. Continue only when `015_group_manager_manual_distribution_records.sql` is the expected pending migration.
3. Preview with `supabase db push --linked --dry-run`.
4. Apply with `supabase db push --linked`, then verify both tables and their RLS policies.

## Release verification

- Tests: 313 passed, 0 failed.
- Type validation: passed (`tsc --noEmit`).
- Production build: passed (`vite build`).

Group Manager V1 is frozen at this boundary. No additional business batch is included.
