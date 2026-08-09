# Razorpay TEST staging readiness

Audit snapshot: 2026-08-09. The local `.env` and `.env.local` both reference Supabase project `hapiqnpdyxmjgtuydqpc`, identify the app as `trial`, and do not contain the database/JWT/Razorpay/cron configuration needed to prove a separate staging environment. The Supabase CLI is not installed and there is no `supabase/.temp` link identity. Treat the existing project as unknown/non-staging and do not migrate it.

## Owner-supplied staging identity and secrets

Create or explicitly identify a separate disposable Supabase staging project. Record its project reference and API hostname for review. Enter these values only through a git-ignored environment file or the deployment secret manager:

- Public client: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Server only: `DATABASE_URL`, `SUPABASE_JWT_SECRET`, `SUPABASE_JWT_AUDIENCE=authenticated`
- Fixed staging settings: `VITE_APP_MODE=staging`, `VITE_REPOSITORY_BACKEND=supabase`, `VARDHAN_ENV=staging`
- Razorpay server only: `RAZORPAY_MODE=test`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `CRON_SECRET`

The application does not require a Supabase service-role key. Never put database, JWT, Razorpay, cron, or service-role secrets in a `VITE_*` variable.

## Safe migration procedure

Only after an owner confirms the new project reference is staging:

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref $env:SUPABASE_PROJECT_REF
npx.cmd supabase projects list
npm.cmd run verify:migrations
npx.cmd supabase db push --dry-run
npx.cmd supabase db push
```

Before both `db push` commands, compare the linked reference with the owner-approved staging reference. Never use `db reset`. Then run `supabase/verification/staging_razorpay_readiness.sql` in the staging SQL editor and confirm migration-history rows 011–014 are returned. The dependency chain is `010 → 011 → 012 → 013 → 014`: onboarding/provisioning, annual plans/referrals/activation, Razorpay attempt mapping, then reconciliation/audit.

## HTTPS endpoints and Razorpay dashboard

With an approved staging hostname, configure this TEST webhook URL:

`https://<STAGING_DOMAIN>/api/payments/razorpay/webhook`

Subscribe in Razorpay TEST mode to:

- `payment.captured`, `payment.failed`, `order.paid`
- `refund.processed`, `refund.failed`
- `payment.dispute.created`, `payment.dispute.action_required`

`refund.failed` is stored as verified immutable provider evidence but does not reverse an entitlement because the refund did not complete. Enable automatic capture in the Razorpay TEST dashboard. Authorized-but-not-captured payments deliberately remain pending and cannot activate a subscription.

The implemented callback route is `POST /api/payments/razorpay/verify-checkout`. Other routes are `create-order`, `webhook`, `attempts/{attempt_id}`, `reconcile-pending`, and `admin/recheck/{attempt_id}` under `/api/payments/razorpay`. FastAPI reads the webhook request body as bytes before parsing JSON, and Vercel rewrites `/api/*` to the ASGI entry point without parsing the body first.

The reconciliation endpoint requires `Authorization: Bearer <CRON_SECRET>`. No scheduler is currently active. Configure a 5–15 minute cadence only after staging deployment; webhook, customer status checks, and admin recheck remain recovery paths without cron.

## Deterministic referral scenario

1. Register, verify, and onboard User A; record A's referral code and workspace.
2. Register User B with A's referral code, verify, and onboard B.
3. Confirm the referral is `PENDING` and B has no active paid subscription.
4. B purchases Starter in Razorpay TEST mode for ₹1,499/year.
5. After verified capture, expect B's subscription `ACTIVE`, active-chit limit `1`, and referral `QUALIFIED` or `REWARDED`.

If A does not already have an active paid subscription, the current model cannot extend A's expiry. The referral remains `QUALIFIED`; after A later obtains an active annual subscription, a subsequent qualifying payment path can grant the idempotent two-calendar-month reward. Do not manufacture an expiry or mark it rewarded manually.

## Manual payment matrix

| Case | Action | Expected result |
|---|---|---|
| Normal capture | Complete TEST checkout with auto-capture | `ORDER_CREATED → PAYMENT_REPORTED/VERIFYING → CAPTURED → SUBSCRIPTION_ACTIVATED` |
| Refresh after checkout | Refresh during verification | Persisted attempt reloads; pending status is shown; no second checkout |
| Close browser | Close after provider payment | Webhook or reconciliation activates without browser state |
| Delayed callback | Delay/drop browser callback | Webhook/reconciliation remains authoritative; no false failure |
| Delayed webhook | Delay delivery | Status check/reconciliation remains `PENDING_CONFIRMATION` or recovers capture |
| Duplicate callback | Submit the same callback again | Same attempt/payment remains idempotent; no duplicate activation/reward |
| Duplicate webhook | Replay identical provider event ID | HTTP success with replay audit; no duplicate activation/reward |
| Missed webhook | Disable delivery, then invoke authenticated reconciliation | Captured provider evidence recovers one activation |
| Failed payment | Use Razorpay TEST failure path | Only provider-confirmed failure becomes `FAILED`; fresh retry is released |
| Expired order | Leave order unpaid past internal expiry, then check | `EXPIRED`; a new legitimate attempt is allowed |
| Refund | Send verified `refund.processed` | `REFUNDED`, entitlement reversal audit, historical payment retained |
| Dispute/reversal | Send verified dispute event | `REVERSED`, audited reversal, historical rows retained |
| Cross-workspace lookup | Request B's attempt using A/another workspace | `404`/authorization denial; no attempt details exposed |

Do not perform the first TEST checkout until migration history, the readiness SQL, environment validation, HTTPS health, webhook secret, automatic capture, and tenant-isolation checks all pass.
