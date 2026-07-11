# MITRA NIDHI CHITI PRO Chit Lifecycle

## Objective

The chit lifecycle engine connects existing modules into one production workflow without adding new pages or changing routes.

```text
Repository -> Domain Engine -> Service -> Dashboard
```

## Lifecycle Flow

1. Create Chit Group
2. Add Members
3. Activate Group
4. Monthly Collection
5. Auction / Lucky Draw
6. Declare Winner
7. Generate Receipt
8. Update Member Ledger
9. Update Finance
10. Update Reports
11. Update Business Health
12. Close Month
13. Complete Chit
14. Archive Chit
15. Reuse Active Chit Slot

## Domain Engines

Location: `src/domain/chit/`

- `ChitLifecycleEngine.js` - lifecycle orchestration and stage status.
- `MonthClosingEngine.js` - month close validation and close-readiness.
- `ChitArchiveEngine.js` - completion and archive readiness.
- `MemberLedgerEngine.js` - member ledger state from collections, receipts, and auctions.
- `ActiveSlotEngine.js` - active slot usage and reusable slot state.

## Business Rules

The lifecycle engine validates:

- Cannot activate incomplete group.
- Cannot collect after month close.
- Cannot duplicate receipt.
- Cannot declare two winners in same month.
- Cannot close month if pending validation fails.
- Finance, reports, dashboard KPIs, AI insights, and business health are treated as synchronized downstream consumers.

## Dashboard Model

`getChitLifecycleDashboardModel()` returns:

- Current running month
- Current winner
- Next auction
- Collections progress
- Completion percentage
- Month close status
- Active slot reuse status
- Lifecycle stage progress

React components render this model directly and do not run lifecycle business logic.

## Future Supabase Notes

When Supabase repositories become active, lifecycle state should continue to flow through `ChitLifecycleRepository`. RLS should enforce tenant isolation for groups, members, collections, auctions, receipts, finance entries, and lifecycle audit records.
