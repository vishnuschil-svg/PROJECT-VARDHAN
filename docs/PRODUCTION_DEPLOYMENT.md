# Production deployment closure

## Required environment

- Set `VARDHAN_ENV=production`.
- Select `RATE_LIMIT_BACKEND=redis` with `REDIS_URL`, or `RATE_LIMIT_BACKEND=gateway` with a strong `RATE_LIMIT_GATEWAY_TOKEN`. The gateway must strip client-supplied rate-limit headers and inject `X-Vardhan-Gateway-Token` only after enforcing its policy.
- Configure `DATABASE_URL`, Supabase JWT settings, CORS origins, and encryption keys through the deployment secret manager.
- Configure `VITE_OCR_PROXY_URL` only to the same-origin authenticated OCR proxy described in `OCR_VISION_INTEGRATION.md`. Vendor keys must remain server-side.

## Static hosting

`vercel.json` applies CSP, HSTS, MIME-sniff protection, referrer policy, permissions policy, and frame denial to every SPA route while retaining the existing history fallback. Supabase HTTPS/WebSocket origins are explicitly allowed by CSP. If another CDN is used, reproduce these headers at the edge and verify them against the deployed URL.

## Backup and restore

Production code must supply tenant-scoped repository adapters and an append-only audit repository to `BackupRestoreService`. Restore execution requires an authenticated owner confirmation, a successful dry run and checksum, and a tenant/data-scope match. Encryption secrets belong in the secret manager and are never stored in browser persistence.
