# Phase 7 — AI Chit Business Understanding and Reconstruction

## Preserved

Smart Capture, Chit Studio, capture validation, tenant-scoped repositories, Schedule Engine, Chit Calculation Engine, rule/template repositories and external OCR adapter.

## Created

- `src/domain/chit/services/ChitDocumentUnderstandingEngine.js`
- `src/services/chitDocumentUnderstandingService.js`
- `src/tests/domain/chitDocumentUnderstanding.test.mjs`

## Modified

- `src/pages/chits/Documents.jsx`
- `src/pages/chits/Documents.css`

## Completed flow

The existing `/chits/documents` route now supports validation, staged analysis, classification, normalized fields, schedule detection/editing, separate rules and terms, relationship verification, confidence/evidence, clarification questions, corrections, recalculation, draft saving, confirmation, tenant-scoped reconstruction, audit history and optional template creation.

Reconstruction creates a group, schedule rows, consolidated confirmed configuration, exact terms with non-enforcement by default, imported document reference, correction/audit history, activity entry and optional reusable template. Central calculation services calculate reconstructed prize defaults.

## Quality gate

- Tests: 46 passed, 0 failed.
- Build: passed, 2,122 modules transformed.
- Lint: passed without errors; pre-existing warnings remain.
- Diff check: passed.

## External dependencies

Image/scanned-PDF/handwriting extraction requires an approved OCR/vision provider. Native Excel parsing requires an approved spreadsheet parser. Manual transcription and deterministic CSV/JSON remain fully functional without simulating provider output.
