# VARDHAN Group Manager safe-side architecture

## Default product mode

VARDHAN Group Manager is neutral record-management SaaS. The organizer independently operates each group, handles member money directly, conducts any bidding outside the software, and declares the final recipient and amount.

The causal boundary is permanent for default mode:

`ORGANIZER DECIDES OUTSIDE VARDHAN -> ORGANIZER ENTERS FINAL VALUES -> VARDHAN STORES -> VARDHAN ACCOUNTS AND REPORTS`

Manual Bid Records and Distribution Records are the source of truth for new default-mode outcomes. VARDHAN must not rank bids, recommend or select recipients, generate financial winners, allocate turns, or calculate an auction outcome.

## Registered operations feature bank

Legacy auction, lucky-draw, winner-selection, winner-derived payout, and bid-derived discount/dividend automation is logically classified as `FEATURE_BANK_REGISTERED_OPERATIONS`. Physical files remain in their established locations to avoid import, migration and historical-report regressions.

`REGISTERED_OPERATIONS_ENABLED` defaults to `false` and overrides every child flag:

- `AUTOMATED_AUCTION_ENABLED`
- `AUTOMATED_LUCKY_DRAW_ENABLED`
- `AUTOMATED_WINNER_SELECTION_ENABLED`

A child flag cannot enable an operation while the parent is false. Flags come from platform deployment configuration, not tenant settings. Permissions cannot override a false flag.

Future activation requires all of the following:

1. Explicit platform approval.
2. Eligible workspace status.
3. Completed compliance verification.
4. Parent and relevant child feature flags enabled.
5. Platform-owner or reserved feature permission authorization.

Compliance verification workflow is intentionally not implemented in Batch 3.

## Historical data

Existing auction, winner, prize, dividend and payout schemas and records are preserved unchanged. Read-only repository and reporting paths may continue to load history. Historical reads must never invoke a preview, selection, recalculation, confirmation or persistence workflow.

## Money and pricing boundary

Member money moves directly between members and the organizer. VARDHAN never receives, holds, settles, refunds or disburses group funds. Organizer transaction details remain separate from VARDHAN billing.

VARDHAN revenue is fixed/tiered SaaS subscription pricing only. It is not a percentage of group value, collections, bids, distributions or payouts.

## Maintenance rule

**DO NOT REMOVE LEGACY FEATURE-BANK CODE WITHOUT EXPLICIT PROJECT OWNER APPROVAL.**

Containment changes must preserve legacy schemas and historical data. New default workflows must remain record-only.
