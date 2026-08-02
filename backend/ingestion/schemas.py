"""Universal Chit File Ingestion — versioned drafts and job models."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


PARSER_VERSION = "1.0.0"
SCHEMA_VERSION = "chit-plan-draft.v1"

JobStatus = Literal[
    "UPLOADED",
    "ROUTED",
    "PARSING",
    "PROCESSING_LOCAL_OCR",
    "PROCESSING_AI",
    "NEEDS_REVIEW",
    "VALIDATED",
    "COMPLETED",
    "DOCUMENT_UNREADABLE",
    "RATE_LIMITED",
    "FAILED",
]

SourceKind = Literal[
    "XLSX",
    "CSV",
    "PDF_DIGITAL",
    "PDF_SCANNED",
    "PDF_MIXED",
    "DOCX",
    "DOC",
    "IMAGE",
    "UNKNOWN",
]


class TolerantModel(BaseModel):
    model_config = ConfigDict(extra="ignore")


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class FieldConfidence(TolerantModel):
    value: Any = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    sourceText: str | None = None
    status: Literal["FOUND", "AMBIGUOUS", "NOT_FOUND", "INVALID", "CONFLICT"] = "NOT_FOUND"
    warning: str | None = None


class SourceMetadata(TolerantModel):
    fileName: str
    mimeType: str
    sourceKind: SourceKind = "UNKNOWN"
    byteSize: int = 0
    sha256: str = ""
    pageCount: int | None = None
    sheetNames: list[str] = Field(default_factory=list)
    languageHint: str = "UNKNOWN"
    adapter: str = ""
    extractedTextPreview: str = ""


class PlanCore(TolerantModel):
    chitName: str | None = None
    chitCode: str | None = None
    organizerName: str | None = None
    chitValue: float | None = None
    memberCount: int | None = None
    tenureMonths: int | None = None
    monthlyInstallment: float | None = None
    startDate: str | None = None
    contactNumber: str | None = None


class InstallmentRules(TolerantModel):
    pattern: Literal[
        "FIXED_MONTHLY",
        "VARIABLE_MONTHLY",
        "LIFTED_NON_LIFTED",
        "CUSTOM_RULE",
        "UNKNOWN",
    ] = "UNKNOWN"
    fixedAmount: float | None = None
    schedule: list[dict[str, Any]] = Field(default_factory=list)
    liftedAmount: float | None = None
    nonLiftedAmount: float | None = None


class WinnerRules(TolerantModel):
    mode: Literal["AUCTION", "LUCKY_DRAW", "ORGANIZER_SELECTED", "UNKNOWN"] = "UNKNOWN"
    notes: str | None = None


class AuctionRules(TolerantModel):
    enabled: bool | None = None
    minimumDiscountPercent: float | None = None
    maximumDiscountPercent: float | None = None
    auctionPattern: str | None = None
    notes: str | None = None


class CommissionRules(TolerantModel):
    foremanCommissionPercent: float | None = None
    notes: str | None = None


class DividendRules(TolerantModel):
    formula: str | None = None
    notes: str | None = None


class CollectionRules(TolerantModel):
    dueDateRule: str | None = None
    gracePeriodDays: int | None = None
    penaltyRule: str | None = None


class PayoutRules(TolerantModel):
    conditions: str | None = None
    notes: str | None = None


class ReviewState(TolerantModel):
    missingMandatoryFields: list[str] = Field(default_factory=list)
    conflictingFields: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    requiresHumanReview: bool = True
    simulationSummary: str | None = None


class AuditEntry(StrictModel):
    field: str
    originalValue: Any = None
    editedValue: Any = None
    editor: str
    timestamp: str
    reason: str = ""
    parserVersion: str = PARSER_VERSION
    providerVersion: str = ""


class ChitPlanDraft(TolerantModel):
    schemaVersion: str = SCHEMA_VERSION
    parserVersion: str = PARSER_VERSION
    source: SourceMetadata
    plan: PlanCore = Field(default_factory=PlanCore)
    installment: InstallmentRules = Field(default_factory=InstallmentRules)
    winner: WinnerRules = Field(default_factory=WinnerRules)
    auction: AuctionRules = Field(default_factory=AuctionRules)
    commission: CommissionRules = Field(default_factory=CommissionRules)
    dividend: DividendRules = Field(default_factory=DividendRules)
    collection: CollectionRules = Field(default_factory=CollectionRules)
    payout: PayoutRules = Field(default_factory=PayoutRules)
    terms: str | None = None
    rawText: str = ""
    pageTexts: list[str] = Field(default_factory=list)
    fieldConfidence: dict[str, FieldConfidence] = Field(default_factory=dict)
    review: ReviewState = Field(default_factory=ReviewState)
    providerTrace: list[str] = Field(default_factory=list)
    geminiUsed: bool = False
    overallConfidence: float = Field(default=0.0, ge=0.0, le=1.0)

    @field_validator("overallConfidence", mode="before")
    @classmethod
    def clamp_confidence(cls, value: Any) -> float:
        try:
            numeric = float(value or 0)
        except (TypeError, ValueError):
            return 0.0
        if numeric > 1:
            numeric = numeric / 100.0
        return max(0.0, min(1.0, numeric))


MANDATORY_FIELDS = (
    "plan.chitName",
    "plan.chitValue",
    "plan.memberCount",
    "plan.tenureMonths",
    "installment.pattern",
)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def empty_draft(*, file_name: str, mime_type: str, sha256: str = "", byte_size: int = 0) -> ChitPlanDraft:
    return ChitPlanDraft(
        source=SourceMetadata(
            fileName=file_name,
            mimeType=mime_type,
            sha256=sha256,
            byteSize=byte_size,
        )
    )
