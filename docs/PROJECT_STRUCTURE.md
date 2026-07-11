# Project Structure

## Main Application

- `src/routes/` - route definitions and protected route wiring.
- `src/pages/` - route-level screens.
- `src/components/` - reusable and dashboard UI components.
- `src/contexts/` - React context providers.
- `src/config/` - product, role, seed, and module configuration.

## Data and Business Layers

- `src/repositories/` - repository interfaces and local storage implementations, prepared for Supabase replacement.
- `src/services/` - orchestration layer that returns UI-ready models.
- `src/domain/chit/` - MITRA NIDHI CHITI PRO business domain.
- `src/domain/finance/` - financial accounting domain.
- `src/security/` - shared security engines.
- `src/licensing/` - shared license engines.
- `src/reports/` - enterprise reporting engine.
- `src/receipts/` - production receipt generation engine.
- `src/import/` - smart data import engine.
- `src/ai/` - mock-provider AI foundation.

## Tests

- `src/tests/domain/` - domain engine tests.
- `src/tests/repositories/` - repository isolation tests.
- `src/tests/services/` - service contract tests.

Tests use Node's built-in test runner and do not add external dependencies.
