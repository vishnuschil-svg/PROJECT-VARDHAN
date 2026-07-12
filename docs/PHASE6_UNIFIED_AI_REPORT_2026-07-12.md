# Phase 6 — Unified AI Conversation Layer

- Added one tenant-aware `AIOrchestrator` with deterministic routing, permission checks and confirmation gates.
- Added explicit external LLM, OCR, translation and speech adapters. Unconfigured providers never report success.
- Added `/chits/ai` as the single full conversational workspace.
- Replaced the floating mini-chat with a launcher into the unified workspace.
- Added file/image/PDF/CSV/Excel/JSON attachment validation with a 15 MB limit.
- Added structured response cards, confidence, evidence, warnings, support actions, editable chit forms, receipt previews, report table previews and confirmation cards.
- Added progress and truthful voice-provider states.
- Existing domain services and financial calculations remain unchanged.

External dependencies: provider credentials and backend proxy services for LLM, OCR, speech and translation.
