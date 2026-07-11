# VARDHAN ERP Platform Architecture

## Production Flow

MITRA NIDHI CHITI PRO now follows a layered production architecture:

```text
Repository -> Domain Engine -> Service -> Context -> UI
```

Repositories isolate storage access and tenant scoping. Domain engines contain business rules and calculations. Services compose repository data into UI-ready models. React components render prepared data and do not perform business calculations.

## Core Domains

### Chit Domain

Location: `src/domain/chit/`

The chit domain contains entities, value objects, validators, and engines for groups, members, installments, auctions, collections, receipts, dividends, penalties, profit, and business health.

Dashboard business health is generated through `BusinessHealthEngine`, consumed by `businessHealthService`, and rendered by dashboard components.

### Finance Domain

Location: `src/domain/finance/`

The finance domain contains accounting entities, ledger models, cash book, bank book, profit, commission, and day closing engines.

Dashboard finance summary is generated through `financeService`, which composes repository data with domain engines.

### Security and Licensing

Locations:

- `src/security/`
- `src/licensing/`

Security and licensing are modeled as reusable engines for permission checks, role resolution, session state, audit logging, feature gates, plan validation, and subscription state.

## Tenant Isolation

Tenant isolation currently depends on repository scope keys:

```text
tenant_id + data_scope
```

Future Supabase RLS should enforce the same boundary at database level through tenant-aware policies.

## UI Contract

Dashboard widgets consume service-built view models:

- `getBusinessHealthDashboardModel`
- `getReportsDashboardModel`
- `getFinanceDashboardSummary`
- `getSecurityLicenseDashboardModel`

React components should not calculate domain totals, permission rules, license validity, or financial values.
