"""Deterministic ChitPlanDraft parser — no invented financial data."""

from __future__ import annotations

import re
from typing import Any

from ingestion.normalize import (
    normalize_text,
    parse_indian_date,
    parse_int,
    parse_money,
    parse_percent,
)
from ingestion.schemas import (
    MANDATORY_FIELDS,
    ChitPlanDraft,
    FieldConfidence,
    InstallmentRules,
    PlanCore,
)


FIELD_ALIASES: dict[str, tuple[str, ...]] = {
    "chitName": ("chit name", "group name", "scheme name", "చిట్ పేరు", "chit"),
    "chitValue": ("chit value", "total value", "chit amount", "మొత్తం", "చిట్ విలువ", "value"),
    "memberCount": ("member count", "members", "no of members", "number of members", "సభ్యుల"),
    "tenureMonths": ("duration", "tenure", "months", "period", "కాలం", "total months"),
    "monthlyInstallment": ("monthly installment", "installment", "monthly amount", "వాయిదా", "చందా"),
    "organizerName": ("organizer", "foreman", "company", "నిర్వాహకుడు"),
    "foremanCommissionPercent": ("commission", "foreman commission", "కమీషన్"),
    "startDate": ("start date", "commencement", "from date"),
    "gracePeriodDays": ("grace", "grace period"),
    "dueDateRule": ("due date", "collection date"),
    "penaltyRule": ("penalty", "late fee", "fine"),
}


def _set_field(draft: ChitPlanDraft, key: str, value: Any, *, confidence: float, source: str) -> None:
    if value is None or value == "":
        draft.fieldConfidence[key] = FieldConfidence(
            value=None, confidence=0, sourceText=source, status="NOT_FOUND"
        )
        return
    draft.fieldConfidence[key] = FieldConfidence(
        value=value, confidence=confidence, sourceText=source[:500], status="FOUND"
    )
    if key == "chitName":
        draft.plan.chitName = str(value)
    elif key == "chitValue":
        draft.plan.chitValue = float(value)
    elif key == "memberCount":
        draft.plan.memberCount = int(value)
    elif key == "tenureMonths":
        draft.plan.tenureMonths = int(value)
    elif key == "monthlyInstallment":
        draft.plan.monthlyInstallment = float(value)
    elif key == "organizerName":
        draft.plan.organizerName = str(value)
    elif key == "startDate":
        draft.plan.startDate = str(value)
    elif key == "foremanCommissionPercent":
        draft.commission.foremanCommissionPercent = float(value)
    elif key == "gracePeriodDays":
        draft.collection.gracePeriodDays = int(value)
    elif key == "dueDateRule":
        draft.collection.dueDateRule = str(value)
    elif key == "penaltyRule":
        draft.collection.penaltyRule = str(value)


def detect_installment_pattern(text: str) -> str:
    normalized = normalize_text(text).lower()
    if any(p in normalized for p in ("lifted", "non-lifted", "non lifted", "లిఫ్ట్")):
        return "LIFTED_NON_LIFTED"
    if any(p in normalized for p in ("variable", "month wise", "month-wise", "different each month")):
        return "VARIABLE_MONTHLY"
    if any(p in normalized for p in ("fixed monthly", "equal installment", "same every month", "స్థిర")):
        return "FIXED_MONTHLY"
    if any(p in normalized for p in ("custom rule", "special rule")):
        return "CUSTOM_RULE"
    return "UNKNOWN"


def detect_winner_mode(text: str) -> str:
    normalized = normalize_text(text).lower()
    if "lucky" in normalized or "draw" in normalized or "లాటరీ" in normalized:
        return "LUCKY_DRAW"
    if "organizer select" in normalized or "foreman select" in normalized:
        return "ORGANIZER_SELECTED"
    if "auction" in normalized or "bid" in normalized or "వేలం" in normalized or "పాట" in normalized:
        return "AUCTION"
    return "UNKNOWN"


def extract_schedule_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    schedule: list[dict[str, Any]] = []
    for index, row in enumerate(rows, start=1):
        if not isinstance(row, dict):
            continue
        month = parse_int(row.get("monthNumber") or row.get("month") or row.get("Month") or index)
        standard = parse_money(
            row.get("standardPayment")
            or row.get("installment")
            or row.get("amount")
            or row.get("Installment")
        )
        lifted = parse_money(row.get("liftedPayment") or row.get("lifted") or row.get("Lifted"))
        non_lifted = parse_money(
            row.get("nonLiftedPayment") or row.get("nonLifted") or row.get("Non Lifted")
        )
        if month is None and standard is None and lifted is None and non_lifted is None:
            continue
        entry: dict[str, Any] = {"monthNumber": month or index}
        if standard is not None:
            entry["standardPayment"] = standard
        if lifted is not None:
            entry["liftedPayment"] = lifted
        if non_lifted is not None:
            entry["nonLiftedPayment"] = non_lifted
        conf = row.get("confidence")
        if isinstance(conf, (int, float)):
            entry["confidence"] = float(conf) if conf <= 1 else float(conf) / 100.0
        schedule.append(entry)
    return schedule


def _extract_labeled_values(text: str) -> dict[str, str]:
    source = normalize_text(text)
    found: dict[str, str] = {}
    lower = source.lower()
    for key, aliases in FIELD_ALIASES.items():
        for alias in sorted(aliases, key=len, reverse=True):
            pattern = re.compile(
                rf"(?i)(?:^|\n|\||\s){re.escape(alias)}\s*[:\-–—=]\s*([^\n|;]+)"
            )
            match = pattern.search(source)
            if match:
                found[key] = match.group(1).strip()
                break
            # loose adjacency for OCR: "Chit Value 100000"
            idx = lower.find(alias.lower())
            if idx >= 0:
                tail = source[idx + len(alias) : idx + len(alias) + 48]
                loose = re.match(r"[\s:;=\-–—]*([^\n|;]{1,40})", tail)
                if loose and loose.group(1).strip():
                    found.setdefault(key, loose.group(1).strip())
    return found


def apply_labeled_extraction(draft: ChitPlanDraft, text: str, *, base_confidence: float) -> None:
    labeled = _extract_labeled_values(text)
    converters = {
        "chitName": lambda v: normalize_text(v) or None,
        "chitValue": parse_money,
        "memberCount": parse_int,
        "tenureMonths": parse_int,
        "monthlyInstallment": parse_money,
        "organizerName": lambda v: normalize_text(v) or None,
        "foremanCommissionPercent": parse_percent,
        "startDate": parse_indian_date,
        "gracePeriodDays": parse_int,
        "dueDateRule": lambda v: normalize_text(v) or None,
        "penaltyRule": lambda v: normalize_text(v) or None,
    }
    for key, raw in labeled.items():
        # Prefer already FOUND tabular values
        existing = draft.fieldConfidence.get(key)
        if existing and existing.status == "FOUND" and existing.value not in (None, ""):
            continue
        converter = converters.get(key)
        if not converter:
            continue
        value = converter(raw)
        _set_field(draft, key, value, confidence=base_confidence, source=raw)


def detect_conflicts(draft: ChitPlanDraft) -> list[str]:
    conflicts: list[str] = []
    plan = draft.plan
    # Do not silently correct: only flag when both sides present and disagree
    if (
        plan.chitValue is not None
        and plan.monthlyInstallment is not None
        and plan.memberCount is not None
        and plan.tenureMonths is not None
    ):
        # Common model A: value ≈ installment * members (single cycle pot)
        expected_a = plan.monthlyInstallment * plan.memberCount
        # Common model B: value ≈ installment * tenure
        expected_b = plan.monthlyInstallment * plan.tenureMonths
        tol = max(1.0, plan.chitValue * 0.02)
        near_a = abs(expected_a - plan.chitValue) <= tol
        near_b = abs(expected_b - plan.chitValue) <= tol
        if not near_a and not near_b:
            conflicts.append("plan.chitValue")
            draft.review.warnings.append(
                "Chit value does not match installment×members or installment×tenure; left unresolved."
            )
    if plan.memberCount is not None and plan.tenureMonths is not None:
        if plan.memberCount == plan.tenureMonths:
            draft.review.warnings.append(
                "Member count equals tenure. Not assumed valid; confirm manually."
            )
    return conflicts


def finalize_review(draft: ChitPlanDraft) -> ChitPlanDraft:
    missing: list[str] = []
    mapping = {
        "plan.chitName": draft.plan.chitName,
        "plan.chitValue": draft.plan.chitValue,
        "plan.memberCount": draft.plan.memberCount,
        "plan.tenureMonths": draft.plan.tenureMonths,
        "installment.pattern": None
        if draft.installment.pattern == "UNKNOWN"
        else draft.installment.pattern,
    }
    for field, value in mapping.items():
        if value is None or value == "":
            missing.append(field)
    draft.review.missingMandatoryFields = missing
    draft.review.conflictingFields = detect_conflicts(draft)
    draft.review.requiresHumanReview = True
    if draft.fieldConfidence:
        scores = [item.confidence for item in draft.fieldConfidence.values()]
        draft.overallConfidence = sum(scores) / len(scores)
    return draft


def apply_tabular_rows(draft: ChitPlanDraft, rows: list[dict[str, Any]], *, base_confidence: float) -> None:
    """Map spreadsheet/CSV dictionaries without inventing values."""
    if not rows:
        return
    # Pattern A: rows are field/value pairs
    field_keys = {"field", "key", "name", "label", "attribute"}
    value_keys = {"value", "amount", "data"}
    pair_mapped = False
    for row in rows[:200]:
        keys_lower = {str(k).strip().lower(): k for k in row.keys()}
        field_key = next((keys_lower[k] for k in field_keys if k in keys_lower), None)
        value_key = next((keys_lower[k] for k in value_keys if k in keys_lower), None)
        if field_key and value_key:
            label = normalize_text(row.get(field_key)).lower()
            raw = row.get(value_key)
            for canonical, aliases in FIELD_ALIASES.items():
                if label in aliases or any(alias == label for alias in aliases):
                    converters = {
                        "chitName": lambda v: normalize_text(v) or None,
                        "chitValue": parse_money,
                        "memberCount": parse_int,
                        "tenureMonths": parse_int,
                        "monthlyInstallment": parse_money,
                        "organizerName": lambda v: normalize_text(v) or None,
                        "foremanCommissionPercent": parse_percent,
                        "startDate": parse_indian_date,
                        "gracePeriodDays": parse_int,
                        "dueDateRule": lambda v: normalize_text(v) or None,
                        "penaltyRule": lambda v: normalize_text(v) or None,
                    }
                    converter = converters.get(canonical)
                    if converter:
                        _set_field(draft, canonical, converter(raw), confidence=base_confidence, source=str(raw))
                        pair_mapped = True
                    break
    if pair_mapped:
        return

    # Pattern B: wide header row with chit fields as columns (use first data row)
    first = rows[0]
    header_map = {normalize_text(k).lower(): k for k in first.keys()}
    for canonical, aliases in FIELD_ALIASES.items():
        for alias in aliases:
            key = header_map.get(alias)
            if not key:
                continue
            raw = first.get(key)
            converters = {
                "chitName": lambda v: normalize_text(v) or None,
                "chitValue": parse_money,
                "memberCount": parse_int,
                "tenureMonths": parse_int,
                "monthlyInstallment": parse_money,
                "organizerName": lambda v: normalize_text(v) or None,
                "foremanCommissionPercent": parse_percent,
                "startDate": parse_indian_date,
                "gracePeriodDays": parse_int,
                "dueDateRule": lambda v: normalize_text(v) or None,
                "penaltyRule": lambda v: normalize_text(v) or None,
            }
            converter = converters.get(canonical)
            if converter:
                _set_field(draft, canonical, converter(raw), confidence=base_confidence, source=str(raw))
            break


def parse_extracted_content(
    draft: ChitPlanDraft,
    *,
    text: str,
    rows: list[dict[str, Any]] | None = None,
    base_confidence: float = 0.8,
) -> ChitPlanDraft:
    draft.rawText = text or draft.rawText
    if rows:
        apply_tabular_rows(draft, rows, base_confidence=base_confidence)
    apply_labeled_extraction(draft, draft.rawText, base_confidence=base_confidence)

    pattern = detect_installment_pattern(draft.rawText)
    draft.installment.pattern = pattern  # type: ignore[assignment]
    draft.fieldConfidence["installment.pattern"] = FieldConfidence(
        value=pattern,
        confidence=0.7 if pattern != "UNKNOWN" else 0.0,
        sourceText=pattern,
        status="FOUND" if pattern != "UNKNOWN" else "NOT_FOUND",
    )
    if draft.plan.monthlyInstallment is not None and pattern == "FIXED_MONTHLY":
        draft.installment.fixedAmount = draft.plan.monthlyInstallment

    winner = detect_winner_mode(draft.rawText)
    draft.winner.mode = winner  # type: ignore[assignment]

    schedule = extract_schedule_rows(rows or [])
    if schedule:
        draft.installment.schedule = schedule
        amounts = [row.get("standardPayment") for row in schedule if row.get("standardPayment")]
        if amounts and draft.plan.monthlyInstallment is None and len(set(amounts)) == 1:
            draft.plan.monthlyInstallment = float(amounts[0])
        lifted_vals = [row.get("liftedPayment") for row in schedule if row.get("liftedPayment")]
        non_lifted_vals = [
            row.get("nonLiftedPayment") for row in schedule if row.get("nonLiftedPayment")
        ]
        if lifted_vals:
            draft.installment.liftedAmount = float(lifted_vals[0])
        if non_lifted_vals:
            draft.installment.nonLiftedAmount = float(non_lifted_vals[0])
        if pattern == "UNKNOWN" and (lifted_vals or non_lifted_vals):
            draft.installment.pattern = "LIFTED_NON_LIFTED"

    # Terms block heuristic
    lower = draft.rawText.lower()
    for marker in ("terms and conditions", "terms & conditions", "నిబంధనలు"):
        idx = lower.find(marker)
        if idx >= 0:
            draft.terms = draft.rawText[idx : idx + 2000]
            break

    # Dividend / auction notes — capture text only, do not invent formulas
    if "dividend" in lower or "డివిడెండ్" in draft.rawText:
        draft.dividend.notes = "Dividend language detected; formula not inferred."
    if "auction" in lower or "వేలం" in draft.rawText:
        draft.auction.enabled = True
        commission = parse_percent(
            next(
                (
                    _extract_labeled_values(draft.rawText).get("foremanCommissionPercent")
                    for _ in [0]
                ),
                None,
            )
        )
        # commission already applied via labeled extraction

    return finalize_review(draft)
