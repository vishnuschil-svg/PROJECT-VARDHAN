# Expense Engine

Expenses are recorded through `ExpenseRepository` and `expenseService`.

## Categories

Office, staff, commission, marketing, transport, legal, tax, bank charges, utilities, and miscellaneous are supported.

## Finance Impact

`expenseService.addExpense` creates corresponding cash/bank out entries. Profit summaries must include these values from repository data.

## Known Limits

Receipt attachments and vendor master records are future work.
