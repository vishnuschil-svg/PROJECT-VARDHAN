# VARDHAN staging deployment checklist

Use separate staging accounts/projects and vendor test modes. Do not reuse production databases, Redis instances, signing keys, provider tokens, phone numbers, sender identities, backup buckets, or alert channels. Values belong only in the provider/Vercel secret manager or a git-ignored local environment file.

## Environment classification

| System | Variable or credential | Classification | Source |
|---|---|---|---|
| Frontend | `VITE_DEV_AUTH_BYPASS=false` | Required now | Fixed staging setting |
| Frontend | `VITE_APP_MODE=staging` | Required now | Fixed staging setting |
| Frontend | `VITE_REPOSITORY_BACKEND=supabase` | Required now | Fixed staging setting |
| Supabase | `VITE_SUPABASE_URL` | Required now | Staging project API settings |
| Supabase | `VITE_SUPABASE_ANON_KEY` | Required now; public client key | Staging project API settings |
| API | `VITE_PLATFORM_API_URL=/api` | Required now | Same-origin Vercel API route |
| Supabase | `DATABASE_URL` | Required now; secret | Staging direct/pooler Postgres URI |
| Supabase | `SUPABASE_JWT_SECRET` | Required now; secret | Staging JWT signing configuration used by this backend |
| Supabase | `SUPABASE_JWT_AUDIENCE=authenticated` | Required now | Staging Auth configuration |
| API | `VARDHAN_ENV=staging` | Required now | Fixed staging setting |
| API | `CORS_ORIGINS` | Required now | Exact HTTPS staging URL(s) |
| Redis | `RATE_LIMIT_BACKEND=redis` | Required now | Fixed staging setting |
| Redis | `REDIS_URL` | Required now; secret | Staging TLS Redis URI (`rediss://`) |
| Security | `DRAW_ENCRYPTION_KEY` | Required now; secret | Staging secret manager generated value |
| Licensing | `LICENSE_SIGNING_SECRET` | Required now; secret | Staging-only signing value |
| Backup | `BACKUP_ENCRYPTION_KEY` | Required now; secret | Staging-only encryption value |
| OCR | `VITE_OCR_PROXY_URL`, `VITE_OCR_TIMEOUT_MS` | Optional for staging | Same-origin proxy; manual capture remains available |
| Redis | `RATE_LIMIT_REDIS_PREFIX`, `RATE_LIMIT_REQUESTS`, `RATE_LIMIT_WINDOW_SECONDS` | Optional for staging | Defaults in `.env.example` |
| Database | `DATABASE_POOL_MAX` | Optional for staging | Default `10`; reduce for provider connection limits |
| API | `ENABLE_API_DOCS` | Optional for staging | Keep `false` unless temporarily required |
| Logging | `LOG_LEVEL` | Optional for staging | Default `INFO` |
| WhatsApp | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Optional for staging; test assets only | Meta developer application |
| SMS | `SMS_GATEWAY_URL`, `SMS_GATEWAY_API_KEY`, `SMS_SENDER_ID` | Optional for staging; sandbox/test assets only | Approved SMS provider |
| Email | `EMAIL_API_URL`, `EMAIL_API_KEY`, `EMAIL_FROM` | Optional for staging; verified test sender | Transactional email provider |
| Razorpay | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Optional for staging; test mode only | Razorpay test dashboard |
| Monitoring | `MONITORING_ALERT_WEBHOOK`, `MONITORING_ALERT_TOKEN` | Optional for staging | Staging-only alert receiver |
| Gateway | `RATE_LIMIT_GATEWAY_TOKEN` | Production-only alternative | Only if an approved gateway replaces Redis |
| Vercel CLI/CI | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Required now for non-interactive deployment | Vercel account/project settings; GitHub environment secrets |
| Production vendors | Live Supabase/Redis/provider keys, live Razorpay keys, live sender identities, production domains | Production only | Never use for staging |

Do not collect or expose a Supabase service-role key: the current application deployment does not require one. Do not place any backend secret in a `VITE_*` variable.

## Required accounts

1. A staging Supabase organization/project owner account.
2. A Vercel team/project account with staging deployment permission.
3. A managed Redis account supporting TLS.
4. Optional integration-test accounts: Razorpay test mode, Meta developer/WhatsApp test number, SMS sandbox/DLT test setup, transactional-email test sender, immutable backup storage, and a staging monitoring receiver.

## Migration order

Apply exactly in filename/dependency order:

1. `000_legacy_reference_keys.sql` — dependency: none; additive bridge for referenced legacy tables.
2. `001_production_schema.sql` — depends on `000`; adds every missing canonical column before indexes.
3. `002_production_rls.sql` — depends on `001`.
4. `004_production_rls_aligned.sql` — compatibility checkpoint; depends on `002`.
5. `005_enterprise_production_infrastructure.sql` — depends on `004`; adds every missing enterprise column before policies and indexes.

There is intentionally no executable `003` migration. `ROLLBACK.md` is documentation and must not be executed.

## Exact deployment order and commands

Run commands from the repository root in PowerShell. Commands reference environment variables and interactive secret entry; they do not contain credential values.

### 1. Local verification

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run verify:migrations
npm.cmd run verify:production
npm.cmd run build
python -m compileall -q backend api
python -m unittest discover -s backend -p "test_*.py"
```

### 2. Create and migrate staging Supabase

Create a new Supabase staging project and record its project reference, HTTPS API URL, anon key, database URI, JWT secret, and audience. Configure the staging application URL and allowed redirect URLs in Supabase Auth. Then run:

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref $env:SUPABASE_PROJECT_REF
npm.cmd run verify:migrations
npx.cmd supabase db push --dry-run
npx.cmd supabase db push
```

In Supabase SQL Editor, verify RLS is enabled and forced on the application tables, create an owner user and two distinct staging tenants/workspaces, then run the tenant-isolation verification before adding provider integrations.

### 3. Create staging Redis

Create a dedicated staging database with TLS and obtain its `rediss://` URI. From a workstation with `redis-cli`:

```powershell
redis-cli -u $env:REDIS_URL PING
```

The command must return `PONG`. Do not continue if it falls back to plaintext or shares a production database.

### 4. Configure and validate Vercel staging

Create/link a staging Vercel project. Add every “Required now” variable to the Preview environment using interactive secret entry. Add optional provider variables only after their staging accounts exist.

```powershell
npx.cmd vercel login
npx.cmd vercel link
npx.cmd vercel env add VITE_DEV_AUTH_BYPASS preview
npx.cmd vercel env add VITE_APP_MODE preview
npx.cmd vercel env add VITE_REPOSITORY_BACKEND preview
npx.cmd vercel env add VITE_SUPABASE_URL preview
npx.cmd vercel env add VITE_SUPABASE_ANON_KEY preview
npx.cmd vercel env add VITE_PLATFORM_API_URL preview
npx.cmd vercel env add DATABASE_URL preview
npx.cmd vercel env add SUPABASE_JWT_SECRET preview
npx.cmd vercel env add SUPABASE_JWT_AUDIENCE preview
npx.cmd vercel env add VARDHAN_ENV preview
npx.cmd vercel env add CORS_ORIGINS preview
npx.cmd vercel env add RATE_LIMIT_BACKEND preview
npx.cmd vercel env add REDIS_URL preview
npx.cmd vercel env add DRAW_ENCRYPTION_KEY preview
npx.cmd vercel env add LICENSE_SIGNING_SECRET preview
npx.cmd vercel env add BACKUP_ENCRYPTION_KEY preview
npx.cmd vercel pull --yes --environment=preview
npx.cmd vercel env pull .env.staging.local --environment=preview
npm.cmd run verify:staging-env -- --env-file=.env.staging.local
npx.cmd vercel build
npx.cmd vercel deploy --prebuilt
```

Capture the resulting Preview URL, update `CORS_ORIGINS` and Supabase Auth redirect URLs if necessary, redeploy, then verify without recording tokens or response bodies containing personal data:

```powershell
curl.exe --fail-with-body https://STAGING_HOST/api/health
curl.exe --head https://STAGING_HOST/
curl.exe --head https://STAGING_HOST/chits
```

Replace `STAGING_HOST` with the owner-approved hostname; it is a hostname placeholder, not a credential. Verify the six security headers, authenticated login, direct-route refresh, tenant isolation, Redis rate-limit headers, backup dry run/confirmed restore in disposable staging data, browser routes/viewports, and zero browser-console errors.

## Owner gates

- Create the staging Supabase, Redis, and Vercel projects and grant deployment access.
- Supply the exact approved staging hostname before final CORS/Auth configuration.
- Generate and enter all staging secrets through secure provider consoles; do not send them in chat or commit them.
- Decide which optional provider integrations must be exercised in staging and create only their official sandbox/test assets.
- Approve the disposable tenant and owner identity used for restore and cross-tenant tests.
- Review the live URL, service health, RLS evidence, security headers, backup/restore audit ID, and provider delivery/payment IDs before declaring staging deployed.
