from __future__ import annotations

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


DocumentType = Literal["CHIT_REGISTER", "CHIT_POSTER", "CHIT_PLAN", "INSTALLMENT_SCHEDULE", "UNKNOWN"]
LanguageDetected = Literal["TELUGU", "ENGLISH", "BILINGUAL", "UNKNOWN"]
InstallmentPattern = Literal[
    "FIXED_MONTHLY", "VARIABLE_MONTHLY", "LIFTED_NON_LIFTED", "CUSTOM_RULE", "UNKNOWN"
]
FieldStatus = Literal["FOUND", "AMBIGUOUS", "NOT_FOUND", "INVALID"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ProviderModel(BaseModel):
    """Gemini extraction payloads may include extra keys; ignore them during ingest."""

    model_config = ConfigDict(extra="ignore")


class FieldResult(ProviderModel):
    value: str | float | int | bool | None = None
    confidence: float = Field(default=0, ge=0, le=1)
    sourceText: str = Field(default="", max_length=2000)
    status: FieldStatus = "NOT_FOUND"
    warning: str | None = Field(default=None, max_length=500)

    @field_validator("confidence", mode="before")
    @classmethod
    def normalize_confidence(cls, value: Any) -> Any:
        if isinstance(value, (int, float)) and value > 1:
            return float(value) / 100.0
        return value

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, value: Any) -> Any:
        text = str(value or "NOT_FOUND").strip().upper()
        allowed = {"FOUND", "AMBIGUOUS", "NOT_FOUND", "INVALID"}
        return text if text in allowed else "NOT_FOUND"


class MemberExtraction(ProviderModel):
    memberNumber: int | None = Field(default=None, ge=1)
    name: str | None = Field(default=None, max_length=200)
    contact: str | None = Field(default=None, max_length=80)
    address: str | None = Field(default=None, max_length=500)


class InstallmentScheduleEntry(ProviderModel):
    monthNumber: int = Field(ge=1, le=1200)
    monthLabel: str | None = Field(default=None, max_length=120)
    standardPayment: float | None = Field(default=None, ge=0)
    nonLiftedPayment: float | None = Field(default=None, ge=0)
    liftedPayment: float | None = Field(default=None, ge=0)
    prizeAmount: float | None = Field(default=None, ge=0)
    bidAmount: float | None = Field(default=None, ge=0)
    commissionValue: float | None = Field(default=None, ge=0)
    deposit: float | None = Field(default=None, ge=0)
    dividendPerMember: float | None = Field(default=None, ge=0)
    penalty: float | None = Field(default=None, ge=0)
    otherDeductions: float | None = Field(default=None, ge=0)
    netAmount: float | None = Field(default=None, ge=0)
    confidence: float = Field(default=0, ge=0, le=1)

    @field_validator("confidence", mode="before")
    @classmethod
    def normalize_confidence(cls, value: Any) -> Any:
        if isinstance(value, (int, float)) and value > 1:
            return float(value) / 100.0
        return value


class ChitExtraction(ProviderModel):
    chitName: str | None = Field(default=None, max_length=240)
    chitCode: str | None = Field(default=None, max_length=120)
    organizerName: str | None = Field(default=None, max_length=240)
    chitValue: float | None = Field(default=None, gt=0)
    durationMonths: int | None = Field(default=None, ge=1, le=1200)
    memberCount: int | None = Field(default=None, ge=1, le=100000)
    monthlyInstallment: float | None = Field(default=None, gt=0)
    installmentPattern: InstallmentPattern = "UNKNOWN"
    installmentMode: str | None = Field(default=None, max_length=80)
    startDate: str | None = Field(default=None, max_length=10)
    foremanCommissionPercent: float | None = Field(default=None, ge=0, le=100)
    minimumDiscountPercent: float | None = Field(default=None, ge=0, le=100)
    maximumDiscountPercent: float | None = Field(default=None, ge=0, le=100)
    prizeAmount: float | None = Field(default=None, ge=0)
    auctionPattern: str | None = Field(default=None, max_length=240)
    contactNumber: str | None = Field(default=None, max_length=80)
    fractionalTicketInformation: str | None = Field(default=None, max_length=500)
    specialRules: str | None = Field(default=None, max_length=4000)
    notes: str | None = Field(default=None, max_length=4000)
    fieldResults: dict[str, FieldResult] = Field(default_factory=dict)
    unrecognizedText: list[str] = Field(default_factory=list, max_length=500)
    members: list[MemberExtraction] = Field(default_factory=list, max_length=100000)
    installmentSchedule: list[InstallmentScheduleEntry] = Field(default_factory=list, max_length=1200)
    auctionHistory: list[dict[str, Any]] = Field(default_factory=list, max_length=1200)
    collections: list[dict[str, Any]] = Field(default_factory=list, max_length=100000)
    dividends: list[dict[str, Any]] = Field(default_factory=list, max_length=1200)

    @field_validator("installmentPattern", mode="before")
    @classmethod
    def normalize_installment_pattern(cls, value: Any) -> Any:
        text = str(value or "UNKNOWN").strip().upper()
        allowed = {
            "FIXED_MONTHLY",
            "VARIABLE_MONTHLY",
            "LIFTED_NON_LIFTED",
            "CUSTOM_RULE",
            "UNKNOWN",
        }
        return text if text in allowed else "UNKNOWN"

    @field_validator("startDate", mode="before")
    @classmethod
    def validate_start_date(cls, value: Any) -> str | None:
        if value is None or value == "":
            return None
        text = str(value).strip()
        try:
            date.fromisoformat(text)
        except ValueError:
            return None
        return text


class ExtractionConfidence(ProviderModel):
    overallScore: float = Field(default=0, ge=0, le=1)
    fieldScores: dict[str, float] = Field(default_factory=dict)
    mathValidated: bool = False
    requiresHumanReview: bool = True

    @field_validator("overallScore", mode="before")
    @classmethod
    def normalize_overall_score(cls, value: Any) -> Any:
        if isinstance(value, (int, float)) and value > 1:
            return float(value) / 100.0
        return value

    @field_validator("fieldScores")
    @classmethod
    def validate_field_scores(cls, value: dict[str, float]) -> dict[str, float]:
        if len(value) > 100:
            raise ValueError("At most 100 field confidence scores are allowed")
        normalized: dict[str, float] = {}
        for key, score in value.items():
            if not key or len(key) > 100:
                raise ValueError("Field confidence scores must use safe keys and values from 0 to 1")
            numeric = float(score)
            if numeric > 1:
                numeric = numeric / 100.0
            if not 0 <= numeric <= 1:
                raise ValueError("Field confidence scores must use safe keys and values from 0 to 1")
            normalized[key] = numeric
        return normalized


class ProviderExtractionResult(ProviderModel):
    rawText: str = Field(default="", max_length=2_000_000)
    documentType: DocumentType = "UNKNOWN"
    languageDetected: LanguageDetected = "UNKNOWN"
    extraction: ChitExtraction = Field(default_factory=ChitExtraction)
    confidence: ExtractionConfidence = Field(default_factory=ExtractionConfidence)
    missingFields: list[str] = Field(default_factory=list, max_length=100)
    warnings: list[str] = Field(default_factory=list, max_length=100)

    @field_validator("documentType", mode="before")
    @classmethod
    def normalize_document_type(cls, value: Any) -> Any:
        text = str(value or "UNKNOWN").strip().upper()
        allowed = {"CHIT_REGISTER", "CHIT_POSTER", "CHIT_PLAN", "INSTALLMENT_SCHEDULE", "UNKNOWN"}
        return text if text in allowed else "UNKNOWN"

    @field_validator("languageDetected", mode="before")
    @classmethod
    def normalize_language(cls, value: Any) -> Any:
        text = str(value or "UNKNOWN").strip().upper()
        allowed = {"TELUGU", "ENGLISH", "BILINGUAL", "UNKNOWN"}
        return text if text in allowed else "UNKNOWN"


class OCRExtractionResponse(ProviderExtractionResult):
    status: Literal["SUCCESS"] = "SUCCESS"
    documentId: str
    provider: str


class OCRDomainError(StrictModel):
    code: Literal[
        "OCR_NOT_CONFIGURED",
        "OCR_TIMEOUT",
        "OCR_RATE_LIMIT",
        "OCR_PROVIDER_UNAVAILABLE",
        "OCR_FAILED",
        "OCR_SCHEMA_INVALID",
        "DOCUMENT_UNREADABLE",
        "UNSUPPORTED_DOCUMENT",
        "FILE_TOO_LARGE",
        "PDF_PAGE_LIMIT_EXCEEDED",
        "AUTH_REQUIRED",
        "TENANT_CONTEXT_REQUIRED",
    ]
    message: str = Field(min_length=1, max_length=500)
    retryable: bool = False


MANDATORY_EXTRACTION_FIELDS = (
    "chitName", "chitValue", "durationMonths", "memberCount", "installmentPattern"
)


def normalize_provider_result(result: ProviderExtractionResult) -> ProviderExtractionResult:
    extraction = result.extraction.model_copy(deep=True)
    for field_name in (
        "chitName", "chitCode", "organizerName", "installmentMode", "startDate",
        "auctionPattern", "contactNumber", "fractionalTicketInformation",
        "specialRules", "notes",
    ):
        value = getattr(extraction, field_name)
        if isinstance(value, str):
            setattr(extraction, field_name, value.strip() or None)

    missing = set(result.missingFields)
    for field_name in MANDATORY_EXTRACTION_FIELDS:
        value = getattr(extraction, field_name)
        if value is None or value == "" or value == "UNKNOWN":
            missing.add(field_name)

    has_domain_data = any(
        (
            extraction.chitName,
            extraction.chitValue,
            extraction.durationMonths,
            extraction.memberCount,
            extraction.monthlyInstallment,
            extraction.installmentSchedule,
            extraction.members,
        )
    )
    if not has_domain_data:
        raise ValueError("DOCUMENT_UNREADABLE")

    math_validated = False
    if extraction.chitValue and extraction.monthlyInstallment and extraction.memberCount:
        expected = extraction.monthlyInstallment * extraction.memberCount
        math_validated = abs(expected - extraction.chitValue) <= max(1, extraction.chitValue * 0.001)

    confidence = result.confidence.model_copy(
        update={
            "mathValidated": math_validated,
            "requiresHumanReview": result.confidence.overallScore < 0.88 or bool(missing),
        }
    )
    field_results = dict(extraction.fieldResults)
    for field_name in ChitExtraction.model_fields:
        if field_name in {
            "members", "installmentSchedule", "auctionHistory", "collections",
            "dividends", "fieldResults", "unrecognizedText",
        }:
            continue
        value = getattr(extraction, field_name)
        if field_name not in field_results:
            score = result.confidence.fieldScores.get(field_name, 0)
            field_results[field_name] = FieldResult(
                value=value,
                confidence=score,
                status="FOUND" if value not in (None, "", "UNKNOWN") else "NOT_FOUND",
            )
    extraction.fieldResults = field_results
    return result.model_copy(
        update={
            "rawText": result.rawText.strip(),
            "extraction": extraction,
            "confidence": confidence,
            "missingFields": sorted(missing),
            "warnings": list(dict.fromkeys(item.strip() for item in result.warnings if item.strip())),
        }
    )
