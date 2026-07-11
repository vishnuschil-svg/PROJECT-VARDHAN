# Supabase Integration - Wave 1

## Scope

Wave 1 adds a production-ready Supabase data layer without changing routes, React components, or existing local repository consumers.

The new layer lives beside the existing local storage repositories and can be adopted service-by-service.

## Files Added

### Supabase Core

- `src/lib/supabase/SupabaseClient.js`
- `src/lib/supabase/SupabaseRepository.js`
- `src/lib/supabase/SupabaseErrorHandler.js`
- `src/lib/supabase/SupabaseRealtime.js`

### Chit Supabase Repositories

- `src/repositories/supabase/MembersRepository.js`
- `src/repositories/supabase/GroupsRepository.js`
- `src/repositories/supabase/CollectionsRepository.js`
- `src/repositories/supabase/ReceiptsRepository.js`
- `src/repositories/supabase/FinanceRepository.js`

### Data Services

- `src/services/data/DataSyncService.js`
- `src/services/data/OfflineQueueService.js`

## Repository Contract

Each Supabase repository supports:

```text
getById()
getAll()
search()
create()
update()
delete()
subscribe()
```

Responses use the standardized shape:

```js
{
  success,
  data,
  error,
  message
}
```

List responses also include pagination metadata.

## Tenant Isolation

Every repository operation requires:

```text
tenant_id
data_scope
```

The generic repository applies these filters to reads, writes, updates, deletes, and realtime subscriptions.

Supabase RLS should enforce the same contract at the database level.

## Environment Variables

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

If either value is missing, repositories return a standardized configuration error instead of throwing inside UI code.

## Future Adoption Plan

1. Create Supabase tables and RLS policies from the existing schema plan.
2. Verify tenant JWT claims or profile lookup strategy.
3. Swap one service at a time from local repositories to `src/repositories/supabase`.
4. Add cache adapters behind `DataSyncService`.
5. Enable realtime subscriptions for dashboard counters and notification streams.
6. Enable offline queue flush for create/update/delete actions.

## Safety Notes

- No Supabase logic is used inside React components.
- Existing UI behavior and routes are unchanged.
- Existing local storage repositories remain intact for current functionality.
