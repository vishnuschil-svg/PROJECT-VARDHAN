# Phase 3 Supabase Migration

Migration draft: `supabase/migrations/AI_CHIT_OS_PHASE_3.sql`.

## Tables

Batches, payout plans/installments, expenses, investors/transactions, payment settings, message templates/jobs/logs, custom roles, locale settings, month closing snapshots, and chit completion snapshots.

## RLS

RLS is enabled in the draft, but project-specific policies must be applied after confirming auth JWT tenant claims.
