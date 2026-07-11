# Production Checklist

## Completed

- Route pages are lazy-loaded.
- Route-level error boundary added.
- Dashboard business health uses domain engine calculations.
- Finance summary uses repository and finance domain engines.
- Repository tenant isolation test added for finance records.
- Broken `href="#"` support link replaced with a safe contact action.
- Production test script added with Node's built-in test runner.
- Dashboard widgets consume service-built models.

## Required Before Production Launch

- Replace local storage repositories with Supabase-backed repositories.
- Enforce Supabase RLS policies for `tenant_id` and `data_scope`.
- Add route-level permission gates for all high-risk actions.
- Add real audit persistence for security actions.
- Add real license enforcement before mutation actions.
- Add end-to-end tests for critical workflows.
- Add visual regression checks for mobile dashboard layouts.
- Add production logging and monitoring.

## Verification Commands

```bash
npm.cmd test
npm.cmd run build
```
