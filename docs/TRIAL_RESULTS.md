# V1 Real Trial Results

## Steps Passed

Automated model coverage has been added for the 35-step trial checklist. Start Trial seeds representative local/demo records for full payment, partial payment, advance payment, late payment, duplicate-payment guard metadata, receipts, finance entries, reports, auction values, month closing metadata, archive status, and active slot release.

## Steps Failed

No automated reconciliation failures are expected for the seeded trial dataset. Browser execution still must confirm every linked page renders the seeded records correctly.

## Calculation Mismatches

The reconciliation service reports mismatches visibly as `FAIL`. Current automated reconciliation test data passes all checks.

## UI Issues

The dashboard panel now exposes Start Trial, Resume Trial, Reset Trial Data, Run Reconciliation, View Failures, and Export Trial Report. Browser verification is still required for responsive overflow, button focus, file download behavior, and existing page-level empty/loading/error states.

## Security Issues

Trial records are scoped by active tenant and reset deletes only records tagged `V1_REAL_TRIAL` or the exact trial chit name. Future Supabase RLS must enforce the same tenant boundaries server-side.

## Remaining Blockers

- Full browser trial has not yet been manually executed end to end.
- Existing page-level print, WhatsApp fallback, and report export flows require browser verification.
- Permissioned reopen is represented as auditable metadata in the trial dataset; real role enforcement must be verified with authenticated roles.
