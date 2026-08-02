"""Optional Gemini escalation — secondary only."""

from __future__ import annotations

import os
from typing import Any

from ingestion.schemas import ChitPlanDraft, FieldConfidence


def confidence_threshold() -> float:
    return float(os.getenv("INGESTION_OCR_CONFIDENCE_THRESHOLD", "0.72"))


def should_escalate(
    draft: ChitPlanDraft,
    *,
    complex_layout: bool,
    ocr_confidence: float | None,
    force: bool = False,
) -> tuple[bool, str]:
    if force:
        return True, "user_ai_reprocess"
    if draft.review.missingMandatoryFields:
        return True, "missing_required_fields"
    if ocr_confidence is not None and ocr_confidence < confidence_threshold():
        return True, "low_ocr_confidence"
    if complex_layout and draft.review.missingMandatoryFields:
        return True, "complex_layout"
    if draft.review.conflictingFields:
        return True, "contradictory_values"
    return False, ""


def merge_gemini_into_draft(draft: ChitPlanDraft, provider_result: Any) -> ChitPlanDraft:
    """Merge Gemini extraction without inventing zeros for absent values."""
    extraction = getattr(provider_result, "extraction", None)
    if extraction is None and isinstance(provider_result, dict):
        extraction = provider_result.get("extraction")
    if extraction is None:
        draft.providerTrace.append("gemini:empty")
        return draft

    def _get(obj: Any, key: str) -> Any:
        if isinstance(obj, dict):
            return obj.get(key)
        return getattr(obj, key, None)

    mapping = {
        "chitName": ("plan", "chitName"),
        "chitValue": ("plan", "chitValue"),
        "memberCount": ("plan", "memberCount"),
        "durationMonths": ("plan", "tenureMonths"),
        "monthlyInstallment": ("plan", "monthlyInstallment"),
        "organizerName": ("plan", "organizerName"),
        "startDate": ("plan", "startDate"),
        "contactNumber": ("plan", "contactNumber"),
        "foremanCommissionPercent": ("commission", "foremanCommissionPercent"),
        "minimumDiscountPercent": ("auction", "minimumDiscountPercent"),
        "maximumDiscountPercent": ("auction", "maximumDiscountPercent"),
        "auctionPattern": ("auction", "auctionPattern"),
        "specialRules": ("terms", None),
        "notes": ("terms", None),
    }

    for src_key, (section, dest_key) in mapping.items():
        value = _get(extraction, src_key)
        if value is None or value == "" or value == "UNKNOWN":
            continue
        if section == "terms":
            existing = draft.terms or ""
            addition = str(value).strip()
            if addition and addition not in existing:
                draft.terms = (existing + "\n" + addition).strip() if existing else addition
            continue
        target = getattr(draft, section)
        current = getattr(target, dest_key)
        if current is None or current == "" or current == "UNKNOWN":
            setattr(target, dest_key, value)
            draft.fieldConfidence[f"{section}.{dest_key}"] = FieldConfidence(
                value=value,
                confidence=0.75,
                sourceText="gemini",
                status="FOUND",
            )

    pattern = _get(extraction, "installmentPattern")
    if pattern and pattern != "UNKNOWN" and draft.installment.pattern == "UNKNOWN":
        draft.installment.pattern = pattern

    schedule = _get(extraction, "installmentSchedule") or []
    if schedule and not draft.installment.schedule:
        draft.installment.schedule = list(schedule)

    raw = getattr(provider_result, "rawText", None)
    if not raw and isinstance(provider_result, dict):
        raw = provider_result.get("rawText")
    if raw and len(str(raw)) > len(draft.rawText):
        draft.rawText = str(raw)

    draft.geminiUsed = True
    draft.providerTrace.append("gemini:merged")
    return draft


async def run_gemini_escalation(
    content: bytes,
    *,
    mime_type: str,
    document_type: str = "CHIT_PLAN",
    language_hint: str = "UNKNOWN",
) -> Any:
    from vision_providers import VisionProviderError, create_vision_provider

    provider = create_vision_provider()
    if not provider.isConfigured():
        raise VisionProviderError(
            "OCR_NOT_CONFIGURED",
            "Document extraction is not configured.",
            retryable=False,
        )
    return await provider.extractDocument(
        content=content,
        mime_type=mime_type,
        document_type=document_type,
        language_hint=language_hint,
    )
