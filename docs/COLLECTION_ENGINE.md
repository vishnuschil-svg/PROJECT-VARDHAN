# MITRA NIDHI CHITI PRO Collections Engine

## Workflow

The production collection workflow runs through the existing Collections route. No new page is required.

```text
Select Chit Group
-> Search / Select Member
-> Select Installment Month
-> Show Monthly Payable, Already Paid, Pending, Advance, Penalty
-> Accept Payment
-> Validate Payment
-> Generate Receipt
-> Update Member Ledger Data
-> Update Cash / Bank Book
-> Update Pending Collections
-> Update Reports
-> Update Dashboard KPIs
-> Update AI Insights
-> Add Activity Log
-> Add Notification
-> Show Success Message
```

## Payment Types

`src/domain/chit/services/CollectionEngine.js` classifies payments as:

- Full Payment
- Partial Payment
- Advance Payment
- Pending Payment
- Late Payment
- Adjustment Entry

The Collections UI only renders the service-generated draft and does not calculate payment totals.

## Validation Rules

Validation lives in `src/domain/chit/validators/CollectionValidator.js`.

Rules covered:

- Duplicate Payment
- Duplicate Receipt
- Wrong Installment Month
- Future Installment
- Closed Month
- Inactive Member
- Inactive Group
- Negative Amount
- Zero Amount
- Over Payment, tracked as advance with a warning
- Invalid Payment Mode
- Missing Member
- Missing Group

Validation errors block save and open an error dialog. Warnings are shown in the confirmation dialog. Duplicate payment protection blocks already-settled member/installment combinations, while follow-up payment is allowed when the prior installment still has pending balance.

## Repository Flow

The service writes through the root collection repository facade:

```text
src/repositories/CollectionsRepository.js
-> src/repositories/chits/CollectionsRepository.js
-> src/repositories/chits/ReceiptsRepository.js
-> src/repositories/chits/FinanceRepository.js
-> src/repositories/chits/ReportsRepository.js
```

Activity and notification fan-out is handled by:

```text
src/repositories/ActivityRepository.js
src/repositories/NotificationRepository.js
```

The repository facade emits the existing collection refresh event so dashboard and module views can refresh from repository data.

## Service Flow

Location: `src/services/collectionService.js`

Key functions:

- `getCollectionPageModel()`
- `buildCollectionDraft()`
- `recordCollectionPayment()`

`recordCollectionPayment()` performs:

1. Build draft from member, group, collection, and receipt repository data.
2. Validate through the domain collection engine.
3. Save collection.
4. Save receipt register row.
5. Save finance income row.
6. Save collection report row.
7. Save activity timeline entry.
8. Save notification center entry.
9. Return receipt preview model.

## Business Rules

React components do not calculate payable amount, pending amount, advance amount, penalty, receipt number, payment type, or downstream update payloads.

The Collections page renders:

- Fast member search.
- Payment summary card.
- Confirmation dialog.
- Receipt preview after successful collection.
- Success toast.
- Error dialog.
- Loading, empty, and responsive states.

## Downstream Updates

- Member Ledger: reads collection and receipt data.
- Collection Summary: reads collection repository data.
- Cash Book / Bank Book: finance row is created from payment mode.
- Dashboard KPI: dashboard services read updated collection and finance data.
- Business Health: domain health engine reads updated repository snapshot.
- Reports: collection report row is created.
- Activity Timeline: activity service reads saved activity plus latest collection/finance data.
- Notifications and AI Insights: services read saved notification plus updated collection, pending, finance, and health state.

## Known Limitations

- Storage is still local repository backed; Supabase can attach at repository boundaries without UI changes.
- Payment settlement is recorded as collection rows. A production ledger posting table can be added behind the service without changing the Collections page.
- Month-close enforcement depends on collection/group records exposing closed month status.
- Receipt image/PDF output is browser-generated and ready for sharing fallback, not server-rendered archival PDF yet.
