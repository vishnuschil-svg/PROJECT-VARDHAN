# VARDHAN enterprise production runbook

This runbook covers infrastructure deployment only. It does not replace the financial engine, repositories, authentication model, tenant model, or business calculations.

## Required managed services

Provision separate staging and production projects. Production requires Supabase Postgres/Auth, a TLS Redis service, Vercel (or an equivalent static host), Meta WhatsApp Cloud API, an approved Indian SMS/DLT gateway, an email transactional provider, Razorpay subscriptions, durable object storage for encrypted backup artifacts, and an alert receiver. Keep all provider and service-role credentials server-side. The browser receives only the Supabase anon key and the server proxy URL.

Apply migrations `000`, `001`, `002`, `004`, then `005` in a staging Supabase project. Migration `000` additively prepares reference keys on legacy tables; migrations `001` and `005` add every missing production column before dependent indexes or policies. Run `npm run verify:migrations` before applying them. Confirm every production table has forced RLS and exercise owner, admin, operator, viewer, auditor, subscriber, disabled, and cross-tenant identities before promotion.

## Environment and secrets

Use `.env.example` as the name contract. Production must set `RATE_LIMIT_BACKEND=redis`, a TLS `REDIS_URL`, exact `CORS_ORIGINS`, provider credentials, an independent 32-byte backup encryption secret, the Razorpay webhook secret, and a high-entropy license signing secret. Rotate secrets through the hosting secret manager; never commit them or expose them through `VITE_*`.

The Vercel deployment serves the FastAPI entry point through `/api` before the SPA fallback. Verify `/api/health` after deploy; a response containing the HTML application shell means routing is misconfigured and promotion must stop.

Meta webhook subscriptions and approved templates, SMS DLT entity/template IDs, email sender-domain DNS, and Razorpay plans/webhooks are external control-plane tasks. Configure Razorpay to deliver only to the backend webhook route over HTTPS. Payment and license activation are distinct: activation rejects a subscription until a verified webhook records it as active or authenticated.

## Backup, restore, and disaster recovery

Schedule encrypted tenant exports at least daily and store encrypted artifacts outside the primary Supabase project with immutable retention. Every export is restricted by tenant ID and data scope, uses AES-GCM authenticated encryption, and has a SHA-256 record checksum. Perform a monthly restore rehearsal into an isolated staging tenant.

Restore order is: select the exact tenant/scope, authenticate an owner, run dry-run validation, verify manifest authentication/checksum/counts, record explicit owner confirmation, take rollback snapshots, restore through scoped adapters, then append the hash-chained immutable audit event. A failure invokes reverse-order rollback. Never restore through the browser service-role credentials and never overwrite production without the confirmation object.

Recovery objectives must be agreed with operations; the recommended starting targets are RPO 24 hours and RTO 4 hours. During an incident, freeze writes, preserve logs, select the newest verified backup before the fault, restore into isolation, reconcile row counts and financial totals, run tenant-isolation and ledger-tamper checks, then switch traffic. Keep the old deployment and database recovery point until reconciliation is signed off.

## Monitoring, logging, and alerts

The backend emits one-line JSON request records with request ID, path, status, duration, and redacted sensitive keys. Forward stdout to the hosting log sink with restricted retention. Route provider failures and critical health degradation to `MONITORING_ALERT_WEBHOOK`. The platform-only `/admin/health` page calls `/v1/health/enterprise` and shows database and configuration readiness; it intentionally reports degraded until every required integration is configured.

Alert on 5xx rate, p95 latency, database pool exhaustion, Redis failures, webhook signature failures, backup age, restore failures, notification rejection, expiring certificates/secrets, and payment/license disagreement. Never log authorization headers, message bodies containing personal data, or provider secrets.

## CI/CD, security, rollback

Pull requests run JavaScript tests, migration verification, production configuration verification, the production build, backend syntax/unit tests, and high-severity dependency audit. Main-branch deployment is gated on that job and uses a protected GitHub `production` environment with `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`. Require reviewer approval and branch protection in GitHub settings.

Before release, verify CSP, HSTS, nosniff, referrer policy, permissions policy, and frame denial using the deployed URL—not only `vercel.json`. Test SPA deep links and required API routing. Run authenticated browser smoke checks at supported viewports and confirm zero console errors.

Application rollback uses the previous immutable Vercel deployment. Database migrations are additive; do not disable RLS or down-migrate populated tables. If `005` must be withdrawn, first disable its new API routes, preserve/export its records, then drop only the new policies/triggers/tables after confirming no production consumers. Prefer forward repair. Provider rollout is independently reversible by disabling its server route and retaining queued delivery/audit data.

## Production verification record

Record commit SHA, workflow URL, deployment URL, migration versions, Supabase project reference, Redis TLS test, header capture, browser matrix, test/build output, backup artifact/checksum, restore rehearsal ID, Razorpay test and live webhook IDs, provider delivery IDs, alert receipt ID, approver, and timestamp. A local build cannot establish external production readiness; production approval requires this completed evidence record.
