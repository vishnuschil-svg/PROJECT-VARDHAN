# Group Manager V1 controlled-launch checklist

## Release set

Before committing, review `git status --short --untracked-files=all`. Add only source, tests, migrations, lockfiles and release documentation. Do not add `.env*`, `.vercel/`, `.vercel_python_packages/`, browser profiles, logs, diagnostics or local database files.

## Production migrations

Migration order is fixed:

1. `015_group_manager_manual_distribution_records.sql` (depends on 014)
2. `016_saas_billing_receipts.sql` (depends on 015)

Safe operator sequence from a clean, reviewed release checkout:

```powershell
supabase link --project-ref <production-project-ref>
supabase migration list --linked
supabase db dump --linked --file .\backup-before-group-manager-v1.sql
supabase db push --linked --dry-run
supabase db push --linked
supabase migration list --linked
```

Stop if the dry-run lists anything other than the reviewed pending migrations. The single `db push` applies 015 and then 016 in filename/dependency order. Keep the backup outside the repository after verification.

Post-apply verification:

- Confirm `manual_bid_records`, `distribution_records`, and `saas_billing_receipts` exist.
- Confirm RLS is enabled and forced on manual/distribution tables.
- Confirm active tenant members can read only their tenant.
- Confirm only platform owner or workspace `owner`/`admin` can insert, update, or delete manual/distribution rows.
- Confirm authenticated users cannot cross tenant boundaries.
- Confirm SaaS receipt creation is idempotent and separate from group/member receipts.

## Authenticated staging smoke test

Run once at desktop width (1440×900) and once at mobile width (390×844). Keep browser DevTools Console open and fail the check on uncaught errors, failed application requests, blank pages, horizontal overflow, or controls hidden off-screen.

1. Login: valid login, invalid-password error, loading state.
2. Onboarding: resume state and required organizer declaration.
3. Dashboard: real tenant data and empty-state tenant; no auction/draw/payout action links.
4. Groups: open/create/edit; Record Bid opens Manual Records.
5. Members: add/search/validation/empty state.
6. Collections: full and partial collection, duplicate guard, pending update.
7. Receipts: view, print/PDF and share action; organizer issuer text.
8. Manual Records: owner/admin can save; staff is denied; decision source remains external organizer.
9. Distributions: owner/admin can save and ledger/report updates; staff is denied.
10. Reports: filters, empty state and export.
11. Settings: organizer declaration and organizer-owned payment details.
12. Subscription Upgrade: plan display, cancel/failure/pending/retry UI; no real payment required.
13. Billing History: empty state and a seeded verified SaaS receipt's View Receipt action.
14. Logout: session clears and protected direct URL returns to login.

Also directly open `/chits/auctions`, `/chits/lucky-draw`, and `/chits/payouts` as a normal user. Each must redirect to Manual Records and must never render or execute the legacy operation.

## Live configuration

Configure secrets only in Vercel server-side production variables. Required contract:

- `VARDHAN_ENV=production`
- `RAZORPAY_MODE=live`
- `RAZORPAY_KEY_ID=rzp_live_...`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `CRON_SECRET`

In Razorpay, register only `/api/payments/razorpay/webhook`. Confirm the Vercel reconciliation cron calls `/api/payments/razorpay/reconcile-pending` every fifteen minutes with cron authorization. Never expose a secret through a `VITE_` variable.
