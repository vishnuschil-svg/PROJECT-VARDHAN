"""Ingestion orchestration service."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from ingestion.escalation import merge_gemini_into_draft, run_gemini_escalation, should_escalate
from ingestion.file_router import route_and_extract
from ingestion.parser.chit_parser import finalize_review, parse_extracted_content
from ingestion.queue.factory import create_ingestion_queue_store
from ingestion.queue.store import dumps_draft
from ingestion.schemas import (
    AuditEntry,
    ChitPlanDraft,
    empty_draft,
    utc_now_iso,
)
from ingestion.signatures import IngestionReject


def _content_path(job_id: str, store: Any) -> Path:
    if hasattr(store, "path"):
        root = Path(store.path).parent
    else:
        root = Path(__file__).resolve().parent / "data"
    files = root / "ingestion_files"
    files.mkdir(parents=True, exist_ok=True)
    return files / f"{job_id}.bin"


class IngestionService:
    def __init__(self, store: Any | None = None):
        self.store = store or create_ingestion_queue_store()

    def enqueue(
        self,
        *,
        content: bytes,
        filename: str,
        declared_mime: str,
        tenant_id: str,
        workspace_id: str | None,
        user_id: str | None,
        batch_id: str | None = None,
        language_hint: str = "UNKNOWN",
    ) -> dict[str, Any]:
        sha256 = hashlib.sha256(content).hexdigest()
        duplicate = self.store.find_duplicate(tenant_id=tenant_id, sha256=sha256)
        if duplicate:
            return {
                **duplicate,
                "deduplicated": True,
                "message": "Existing job reused for matching tenant/hash/parser/schema.",
            }

        job = self.store.create_job(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            user_id=user_id,
            file_name=filename,
            mime_type=declared_mime or "application/octet-stream",
            sha256=sha256,
            byte_size=len(content),
            batch_id=batch_id,
            language_hint=language_hint,
            status="UPLOADED",
        )
        _content_path(job["id"], self.store).write_bytes(content)
        return self.process_job(job["id"], content=content)

    def _load_content(self, job_id: str, content: bytes | None = None) -> bytes | None:
        if content is not None:
            return content
        path = _content_path(job_id, self.store)
        if path.is_file():
            return path.read_bytes()
        return None

    def process_job(
        self,
        job_id: str,
        *,
        content: bytes | None = None,
        force_ai: bool = False,
    ) -> dict[str, Any]:
        job = self.store.get_job(job_id)
        if not job:
            raise IngestionReject("OCR_FAILED", "Ingestion job not found.")

        payload = self._load_content(job_id, content)
        if payload is None:
            self.store.update_job(
                job_id,
                status="FAILED",
                error_code="OCR_FAILED",
                error_message="Source bytes are no longer available for this job. Re-upload the file.",
            )
            return self.store.get_job(job_id)  # type: ignore[return-value]

        self.store.update_job(job_id, status="ROUTED")
        try:
            routed = route_and_extract(
                payload,
                filename=job["file_name"],
                declared_mime=job["mime_type"],
                language_hint=job.get("language_hint") or "UNKNOWN",
            )
        except IngestionReject as exc:
            status = {
                "DOCUMENT_UNREADABLE": "DOCUMENT_UNREADABLE",
                "FILE_TOO_LARGE": "FAILED",
                "PDF_PAGE_LIMIT_EXCEEDED": "FAILED",
                "UNSUPPORTED_DOCUMENT": "FAILED",
                "OCR_NOT_CONFIGURED": "FAILED",
                "OCR_TIMEOUT": "FAILED",
            }.get(exc.code, "FAILED")
            self.store.update_job(
                job_id,
                status=status,
                error_code=exc.code,
                error_message=exc.message,
            )
            return self.store.get_job(job_id)  # type: ignore[return-value]

        self.store.update_job(
            job_id,
            status="PROCESSING_LOCAL_OCR" if routed.result.needs_local_ocr else "PARSING",
            mime_type=routed.detected.mime_type,
        )

        draft = empty_draft(
            file_name=job["file_name"],
            mime_type=routed.detected.mime_type,
            sha256=job["sha256"],
            byte_size=job["byte_size"],
        )
        draft.source.sourceKind = routed.result.source_kind  # type: ignore[assignment]
        draft.source.pageCount = routed.result.page_count
        draft.source.sheetNames = routed.result.sheet_names
        draft.source.adapter = routed.result.adapter
        draft.source.languageHint = job.get("language_hint") or "UNKNOWN"
        draft.pageTexts = routed.result.page_texts
        draft.source.extractedTextPreview = (routed.result.text or "")[:2000]
        draft.providerTrace.append(f"adapter:{routed.result.adapter}")
        for warning in routed.result.warnings:
            draft.review.warnings.append(warning)

        base_confidence = routed.result.ocr_confidence
        if base_confidence is None:
            base_confidence = 0.85 if routed.result.source_kind in {"XLSX", "CSV", "DOCX", "PDF_DIGITAL"} else 0.6

        draft = parse_extracted_content(
            draft,
            text=routed.result.text,
            rows=routed.result.rows,
            base_confidence=float(base_confidence),
        )

        escalate, reason = should_escalate(
            draft,
            complex_layout=routed.result.complex_layout,
            ocr_confidence=routed.result.ocr_confidence,
            force=force_ai,
        )
        gemini_compatible = routed.detected.mime_type.startswith("image/") or routed.detected.mime_type == "application/pdf"
        if escalate and not gemini_compatible:
            draft.providerTrace.append(f"escalate_skipped:{reason}:unsupported_mime_for_gemini")
            draft.review.warnings.append(
                "AI escalation skipped for this file type; complete missing fields in review."
            )
            escalate = False

        if escalate:
            self.store.update_job(job_id, status="PROCESSING_AI")
            draft.providerTrace.append(f"escalate:{reason}")
            provider_result = _run_async(
                run_gemini_escalation(
                    payload,
                    mime_type=routed.detected.mime_type,
                    language_hint=job.get("language_hint") or "UNKNOWN",
                )
            )
            from vision_providers import VisionProviderError

            if isinstance(provider_result, VisionProviderError):
                draft.review.warnings.append(
                    f"{provider_result.code}: {provider_result.message}"
                )
                draft.providerTrace.append(f"gemini:{provider_result.code}")
                # Quota / unavailable must not invent results; continue with local draft.
                terminal_rate = provider_result.code == "OCR_RATE_LIMIT"
                self.store.update_job(
                    job_id,
                    status="RATE_LIMITED" if terminal_rate else "NEEDS_REVIEW",
                    error_code=provider_result.code if terminal_rate else None,
                    error_message=provider_result.message if terminal_rate else None,
                    draft_json=dumps_draft(finalize_review(draft)),
                    source_preview=draft.source.extractedTextPreview,
                )
                return self.store.get_job(job_id)  # type: ignore[return-value]
            if isinstance(provider_result, Exception):
                draft.review.warnings.append(f"Gemini escalation failed: {provider_result}")
                draft.providerTrace.append("gemini:failed")
            else:
                draft = merge_gemini_into_draft(draft, provider_result)
                draft = finalize_review(draft)

        if not draft.rawText.strip() and not any(
            [
                draft.plan.chitName,
                draft.plan.chitValue,
                draft.plan.memberCount,
                draft.installment.schedule,
            ]
        ):
            self.store.update_job(
                job_id,
                status="DOCUMENT_UNREADABLE",
                error_code="DOCUMENT_UNREADABLE",
                error_message="No usable chit content could be extracted.",
                draft_json=dumps_draft(draft),
                source_preview=draft.source.extractedTextPreview,
            )
            return self.store.get_job(job_id)  # type: ignore[return-value]

        self.store.update_job(
            job_id,
            status="NEEDS_REVIEW",
            draft_json=dumps_draft(finalize_review(draft)),
            source_preview=draft.source.extractedTextPreview,
            error_code=None,
            error_message=None,
        )
        return self.store.get_job(job_id)  # type: ignore[return-value]

    def save_edits(
        self,
        job_id: str,
        *,
        edits: dict[str, Any],
        editor: str,
        reason: str = "",
    ) -> dict[str, Any]:
        job = self.store.get_job(job_id)
        if not job or not job.get("draft"):
            raise IngestionReject("OCR_FAILED", "Job draft not found.")
        draft = ChitPlanDraft.model_validate(job["draft"])
        audit = list(job.get("audit") or [])
        for path, new_value in edits.items():
            original = _get_path(draft, path)
            if original == new_value:
                continue
            _set_path(draft, path, new_value)
            audit.append(
                AuditEntry(
                    field=path,
                    originalValue=original,
                    editedValue=new_value,
                    editor=editor,
                    timestamp=utc_now_iso(),
                    reason=reason,
                    providerVersion="gemini" if draft.geminiUsed else draft.source.adapter,
                ).model_dump()
            )
        draft = finalize_review(draft)
        status = "VALIDATED" if not draft.review.missingMandatoryFields else "NEEDS_REVIEW"
        self.store.update_job(
            job_id,
            status=status,
            draft_json=dumps_draft(draft),
            audit_json=json.dumps(audit, ensure_ascii=False),
        )
        return self.store.get_job(job_id)  # type: ignore[return-value]

    def confirm(self, job_id: str, *, editor: str) -> dict[str, Any]:
        job = self.store.get_job(job_id)
        if not job or not job.get("draft"):
            raise IngestionReject("OCR_FAILED", "Job draft not found.")
        draft = ChitPlanDraft.model_validate(job["draft"])
        draft = finalize_review(draft)
        if draft.review.missingMandatoryFields:
            raise IngestionReject(
                "OCR_SCHEMA_INVALID",
                "Mandatory fields missing; cannot confirm.",
            )
        # Confirmation records intent only — does not invent/activate ledger rows here.
        self.store.update_job(
            job_id,
            status="COMPLETED",
            draft_json=dumps_draft(draft),
        )
        completed = self.store.get_job(job_id)
        assert completed is not None
        return {
            **completed,
            "confirmation": {
                "confirmedBy": editor,
                "confirmedAt": utc_now_iso(),
                "creates": ["PlanVersion", "ChitGroup", "OperationalSchedule"],
                "activated": False,
                "message": "Organizer confirmation recorded. Downstream creation must use confirmed draft only.",
            },
        }


def _run_async(coro: Any) -> Any:
    import asyncio

    async def _await_or_raise():
        try:
            return await coro
        except Exception as exc:
            return exc

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures

            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                return pool.submit(asyncio.run, _await_or_raise()).result()
        return loop.run_until_complete(_await_or_raise())
    except RuntimeError:
        return asyncio.run(_await_or_raise())
    except Exception as exc:
        return exc


def _get_path(draft: ChitPlanDraft, path: str) -> Any:
    parts = path.split(".")
    current: Any = draft
    for part in parts:
        if isinstance(current, dict):
            current = current.get(part)
        else:
            current = getattr(current, part, None)
    return current


def _set_path(draft: ChitPlanDraft, path: str, value: Any) -> None:
    parts = path.split(".")
    current: Any = draft
    for part in parts[:-1]:
        current = getattr(current, part)
    setattr(current, parts[-1], value)
