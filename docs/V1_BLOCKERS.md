# MITRA NIDHI CHITI PRO V1 Blockers

## Critical

- Browser end-to-end trial must still be executed with the dashboard Trial Run panel.
- Closed-month payment blocking must be verified from the live Collections screen, not only from seeded guard metadata.
- Permissioned month reopen must be verified with real roles and audit trail expectations.

## High

- Print/reprint, WhatsApp fallback, CSV export, and report export buttons need browser verification after seeded trial data is created.
- Existing reports should be checked against the reconciliation output for the seeded trial workspace.
- Mobile overflow must be checked on Dashboard, Collections, Receipts, Finance, Reports, and Pending Collections.

## Medium

- Supabase RLS policies should mirror local tenant isolation before external beta.
- Reconciliation should eventually persist historical snapshots for audit.
- Trial result export is CSV; PDF-ready trial reporting can be added through the existing report export engine.

## Current Readiness Judgment

Status: INTERNAL TRIAL READY after test and build pass, subject to browser verification.
