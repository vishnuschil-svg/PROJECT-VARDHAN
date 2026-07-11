# Supabase Rule Engine Migration

Do not execute destructive migrations automatically.

Migration plan:

1. Create tenant-scoped schedule/rule/template tables.
2. Backfill legacy fixed groups through generated schedule rows.
3. Add RLS policies by tenant/workspace.
4. Store capture results and manual overrides separately from confirmed financial rows.
5. Preserve template and rule versions for active groups.

No Supabase service key belongs in frontend code.
