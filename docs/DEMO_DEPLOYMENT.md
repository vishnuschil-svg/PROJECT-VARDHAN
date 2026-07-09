# PROJECT VARDHAN Demo Deployment

This document prepares PROJECT VARDHAN / MITRA NIDHI CHITI PRO for a static demo deployment on Vercel or Netlify.

## Current Deployment Status

- Frontend framework: React + Vite.
- Build command: `npm.cmd run build` on Windows, or `npm run build` in Vercel/Netlify.
- Output directory: `dist`.
- Supabase is not connected yet.
- Current demo data is stored in browser `localStorage` through the repository layer.
- Demo data is browser/device specific and will reset if site storage is cleared.

## Environment Variables

Use `.env.example` as the public template.

Required for the current localStorage demo:

```ini
VITE_DEV_AUTH_BYPASS=false
VITE_APP_MODE=demo
```

Hosted demo login:

```txt
Email: admin@vardhan.com
Password: admin123
```

This demo login runs without Supabase and opens a Platform Owner session for demo review.

If `VITE_APP_MODE=demo` is set, or if Supabase env vars are blank, the app automatically uses demo authentication.

Reserved for future Supabase integration:

```ini
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Do not add real Supabase values until the Supabase integration batch is approved.

## Vercel Deployment Steps

1. Push the repository to GitHub, GitLab, or Bitbucket.
2. In Vercel, choose **Add New Project** and import the repository.
3. Keep framework preset as **Vite**.
4. Set build command:

```bash
npm run build
```

5. Set output directory:

```bash
dist
```

6. Add environment variables from `.env.example` if needed.
7. Deploy.
8. After deployment, open `/chits` and verify the MITRA NIDHI CHITI PRO routes.

## Netlify Deployment Steps

1. Push the repository to GitHub, GitLab, or Bitbucket.
2. In Netlify, choose **Add new site** and import the repository.
3. Set build command:

```bash
npm run build
```

4. Set publish directory:

```bash
dist
```

5. Add environment variables from `.env.example` if needed.
6. Deploy.
7. After deployment, open `/chits` and verify the MITRA NIDHI CHITI PRO routes.

## Single Page App Routing

The app uses React Router browser routes. Vercel normally serves Vite SPAs correctly after build. If direct route refreshes fail on a host, add a fallback rewrite to serve `index.html` for all app routes.

Netlify fallback example:

```txt
/*    /index.html   200
```

Vercel fallback example:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

Only add host-specific rewrite files if direct route refreshes fail during deployment validation.

## Demo Data Notes

- MITRA NIDHI CHITI PRO demo records are localStorage-backed.
- Data is isolated by tenant and data scope through the repository/service layer.
- Data created in one browser will not appear in another browser.
- Clearing browser storage removes demo records.
- This is expected until Supabase is connected.

## Pre-Deployment Checklist

Run locally before publishing:

```bash
npm run build
```

Then verify:

- `/chits`
- `/chits/groups`
- `/chits/members`
- `/chits/member-ledger`
- `/chits/collections`
- `/chits/receipts`
- `/chits/finance`
- `/chits/auctions`
- `/chits/lucky-draw`
- `/chits/reports`
- `/chits/settings`

## Supabase Note

Supabase schema and RLS planning exists separately as a draft. Do not connect Supabase or add production credentials for this demo deployment batch.
