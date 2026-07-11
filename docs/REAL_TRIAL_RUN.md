# MITRA NIDHI CHITI PRO Real Trial Run

## Trial Dataset

- Chit Name: MITRA NIDHI REAL TRIAL
- Chit Value: Rs. 1,00,000
- Members: 10
- Monthly Installment: Rs. 10,000
- Duration: 10 Months
- Start Month: Current month

The trial records are tagged with `V1_REAL_TRIAL` and written only to the active tenant workspace. Reset Trial Data deletes only records with that trial tag or the exact trial chit name.

## Dashboard Flow

Open Dashboard, click Start Trial Run, then use the Trial Run panel.

Actions:

- Start Trial: seeds tenant-isolated trial data using the current local/demo provider.
- Resume Trial: reloads the current trial model from repositories.
- Reset Trial Data: removes only tagged trial records for the active tenant.
- Run Reconciliation: validates totals across collections, receipts, ledger/finance, reports, pending balances, dashboard totals, and auction math.
- View Failures: jumps to visible failed checks.
- Export Trial Report: downloads a CSV trial report.

## Lifecycle Checks

The panel tracks all 35 requested checks: group creation, member setup, activation, full/partial/advance/late payments, duplicate protection, receipts, print/reprint metadata, WhatsApp fallback metadata, pending collections, auction/lucky draw, winner declaration, prize/discount/dividend/commission calculations, ledger, passbook, cash/bank, finance summary, reports, dashboard KPIs, AI insights, month closing, closed-month protection, permissioned reopen, completion, archive, and active slot release.

## Reconciliation Rules

- Collection total equals receipt total.
- Collection total equals ledger/finance credit total.
- Cash payments equal cash book entries.
- Bank/UPI payments equal bank book entries.
- Pending total equals member pending balances.
- Auction values follow prize, commission, and dividend rules.
- Dashboard totals match repository totals.
- Report totals match repository totals.

Each check returns `PASS`, `WARNING`, or `FAIL`. Mismatches are shown in the dashboard panel and are not silently ignored.

## Verification Commands

Run:

```bash
npm.cmd test
npm.cmd run build
```
