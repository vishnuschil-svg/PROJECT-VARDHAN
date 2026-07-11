# Phase 3 RLS Checklist

- Confirm tenant claim source in Supabase auth JWT.
- Add select/insert/update/delete policies per table.
- Verify service role bypass is limited to admin jobs.
- Test tenant A cannot read tenant B rows.
- Test custom roles cannot override RLS.
- Test message dedupe uniqueness per tenant.
- Test month closing snapshots cannot be edited across tenant.
