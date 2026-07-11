# Month Closing Final

Month closing is handled by `monthClosingService`.

## Rules

- Preview closing before confirmation.
- Organizer confirmation is mandatory.
- Reconciliation failure blocks close.
- Reopen requires permission and reason.

## Snapshot

Closed month snapshots are tenant scoped and preserve summary/reconciliation data for audit.
