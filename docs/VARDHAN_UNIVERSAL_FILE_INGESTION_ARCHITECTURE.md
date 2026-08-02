# VARDHAN Universal File Ingestion Architecture

**Status:** Implemented (phased)  
**Parser version:** `1.0.0`  
**Schema version:** `chit-plan-draft.v1`  
**Date:** 2026-08-02

## Safety invariants

- `GEMINI_API_KEY` remains server-side only (never `VITE_*`).
- No API-key rotation and no multi-project quota bypass.
- Existing Gemini model configuration is preserved.
- Local OCR / parsers never invent missing financial amounts or activate a chit.
- Gemini is secondary escalation only; quota exhaustion continues with local evidence + review.
- Organizer confirmation is required before Plan Version / Chit Group creation.

## Audit summary (pre-implementation)

| Area | Before | Gap |
|---|---|---|
| Backend OCR | `POST /api/v1/ocr/extract` → Gemini only | No local OCR, no XLSX/CSV/DOCX/DOC |
| MIME guards | JPEG/PNG/WebP/PDF signature checks | No spreadsheet/Office routing |
| Frontend extract | `documentExtractionCore.js` CSV/JSON local; images/PDF → Gemini | XLSX blocked as “provider unavailable” |
| Natural text | `ChitNaturalTextParser.js` | Incomplete vs full ChitPlanDraft |
| Queue | None durable for OCR | Browser-only UX blocked on Gemini latency/quota |
| Review | AI Chit / Smart Capture | Not a shared side-by-side source↔draft review |

## Target pipeline

```text
Upload → SHA-256 dedupe → File Router (MIME+signature)
  → Source Adapter (xlsx|csv|pdf|docx|doc|image)
  → Local OCR (Tesseract) when needed
  → Deterministic ChitPlanDraft parser
  → Optional Gemini escalation (missing/low-confidence/complex/contradiction/user AI Reprocess)
  → NEEDS_REVIEW → Organizer confirm → Plan Version / Group
```

## File router

Route by **validated MIME + magic signature**, not extension alone.

| Kind | Adapter | Notes |
|---|---|---|
| XLSX | `openpyxl` read-only | Sheet/header/formula/row validation |
| CSV | chardet + csv | Delimiter/encoding; formula-injection safe exports |
| Digital PDF | PyMuPDF | Embedded text + table positions |
| Scanned PDF | PyMuPDF render → Tesseract | Page order preserved |
| DOCX | python-docx | Paragraphs + tables |
| Legacy DOC | LibreOffice headless → DOCX/PDF | Timeout, size limit, temp cleanup |
| Images | preprocess → Tesseract | Telugu + English packs |

Reject: encrypted/password PDFs without workflow, malformed archives, executables/disguised types, oversize/over-page files.

## Local OCR first

Tesseract produces **raw text + positional confidence only**.  
No chit rule calculation inside OCR.

Preprocess (as appropriate): EXIF orient, deskew, resize, grayscale, contrast, adaptive threshold, denoise, border cleanup, PSM selection.

## Deterministic parser

Maps extracted text/tables → versioned `ChitPlanDraft`.  
Normalizes ₹/Indian dates/OCR punctuation.  
Never replaces missing amounts with zero, never assumes memberCount==tenure, never silently “fixes” conflicting totals.

## Gemini escalation (secondary)

Triggers only when:

1. Required fields missing after local parse  
2. Local OCR confidence below threshold  
3. Complex table/layout detected  
4. Contradictory values found  
5. User selects **AI Reprocess**

Preserves structured schema, distinct error codes, RPM/TPM/RPD awareness.  
No automatic retry for daily/billing quota exhaustion.  
No fabricated fallback result.

## Canonical output

Every adapter returns the same `ChitPlanDraft` (`schemaVersion` + `parserVersion`):

- source metadata  
- plan core / installment / winner / auction / commission / dividend / collection / payout / terms  
- per-field confidence, review fields, conflicts, missing mandatory fields  

Tolerant ingest models (`extra=ignore`) vs strict business confirmation schema.

## Job statuses

`UPLOADED` → `ROUTED` → `PARSING` → `PROCESSING_LOCAL_OCR` → `PROCESSING_AI` → `NEEDS_REVIEW` → `VALIDATED` → `COMPLETED`  
Terminal soft failures: `DOCUMENT_UNREADABLE`, `RATE_LIMITED`, `FAILED`

Durable backend SQLite queue (not browser-only). Users may leave the page; UI polls.

## Dedupe

Skip reprocessing when tenant + SHA-256 + parserVersion + schemaVersion all match a prior completed/reviewable job.

## Routes / UI

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/ingestion/jobs` | Upload + enqueue |
| GET | `/api/v1/ingestion/jobs/{id}` | Status + draft |
| POST | `/api/v1/ingestion/jobs/{id}/ai-reprocess` | Explicit Gemini escalation |
| PATCH | `/api/v1/ingestion/jobs/{id}/draft` | Save review edits + audit |
| POST | `/api/v1/ingestion/jobs/{id}/confirm` | Organizer confirmation only |
| GET | `/api/v1/ingestion/batches/{id}` | Batch progress |

Frontend:

- `/chits/ingest` — upload + batch progress  
- `/chits/ingest/:jobId/review` — side-by-side review  

Existing `/chits/ai-chit/*` and `/api/v1/ocr/extract` remain for backward compatibility.

## Module map

```text
backend/ingestion/
  api.py                 FastAPI router
  service.py             Orchestration
  file_router.py         MIME + signature routing
  signatures.py          Magic-byte validators
  schemas.py             ChitPlanDraft + job models
  normalize.py           Safe number/date/currency helpers
  parser/chit_parser.py  Deterministic parser
  ocr/preprocess.py      Image preprocess
  ocr/tesseract_engine.py
  adapters/*             Format adapters
  escalation/gemini.py   Optional Gemini bridge (existing provider)
  queue/store.py         Durable SQLite jobs
  queue/worker.py        In-process async worker

src/services/ingestionService.js
src/pages/chits/FileIngestionPage.jsx
src/pages/chits/IngestionReviewPage.jsx
```

## Config (env names only)

- `INGESTION_MAX_FILE_MB` (default 15)  
- `INGESTION_MAX_PDF_PAGES` (default 30)  
- `INGESTION_OCR_LANGS` (default `eng+tel`)  
- `INGESTION_OCR_CONFIDENCE_THRESHOLD` (default 0.72)  
- `INGESTION_QUEUE_PATH`  
- `INGESTION_LIBREOFFICE_BIN`  
- `INGESTION_LIBREOFFICE_TIMEOUT_SECONDS`  
- Existing `GEMINI_API_KEY` / `GEMINI_MODEL` unchanged  

## Implementation notes (2026-08-02)

- Durable queue path defaults to `backend/data/ingestion_queue.db` (gitignored).
- Uploaded binaries persist under `backend/data/ingestion_files/` for AI reprocess.
- Gemini escalation is skipped for non-image/non-PDF MIME types (XLSX/CSV/DOCX stay local + review).
- `OCR_RATE_LIMIT` sets job status `RATE_LIMITED` while preserving the local draft for review.
- Scanned-PDF / Telugu-image OCR requires system Tesseract + `eng`/`tel` language packs.
- Legacy DOC requires LibreOffice (`soffice`) on PATH or `INGESTION_LIBREOFFICE_BIN`.
- Existing `/api/v1/ocr/extract` Gemini path remains for backward compatibility.

