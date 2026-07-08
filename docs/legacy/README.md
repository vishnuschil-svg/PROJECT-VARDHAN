# Legacy Code Quarantine

This folder contains code preserved for reference during production cleanup.

- `chitService.supabase-legacy.ts` was the older direct Supabase service layer for MITRA NIDHI CHITI PRO.
- Active chit data access should use the repository pattern through `src/services/chitDataService.js`.
