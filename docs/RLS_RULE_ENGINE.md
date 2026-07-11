# RLS Rule Engine

RLS requirements:

- Tenant can read/write only its own templates, rules, schedules and preferences.
- Capture results remain private to workspace.
- Manual overrides and audit logs are append-safe.
- Historical financial rows are not deleted through client operations.
- Service-role migrations run only outside the frontend.
