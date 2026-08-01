from __future__ import annotations

import asyncio
import base64
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any, Mapping, Protocol

from pydantic import ValidationError

from ocr_schemas import ProviderExtractionResult, normalize_provider_result


class VisionExtractionProvider(Protocol):
    name: str

    def isConfigured(self) -> bool: ...

    async def extractDocument(
        self,
        *,
        content: bytes,
        mime_type: str,
        document_type: str,
        language_hint: str,
    ) -> ProviderExtractionResult: ...

    async def healthCheck(self) -> dict[str, Any]: ...


class JsonTransport(Protocol):
    async def request(
        self,
        method: str,
        url: str,
        *,
        headers: Mapping[str, str],
        payload: dict[str, Any] | None,
        timeout_seconds: float,
    ) -> dict[str, Any]: ...


class VisionProviderError(RuntimeError):
    def __init__(self, code: str, message: str, *, retryable: bool = False):
        super().__init__(message)
        self.code = code
        self.message = message
        self.retryable = retryable


class UrllibJsonTransport:
    async def request(
        self,
        method: str,
        url: str,
        *,
        headers: Mapping[str, str],
        payload: dict[str, Any] | None,
        timeout_seconds: float,
    ) -> dict[str, Any]:
        return await asyncio.to_thread(
            self._request_sync, method, url, dict(headers), payload, timeout_seconds
        )

    @staticmethod
    def _request_sync(
        method: str,
        url: str,
        headers: dict[str, str],
        payload: dict[str, Any] | None,
        timeout_seconds: float,
    ) -> dict[str, Any]:
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        request = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
                raw = response.read(5_000_001)
        except urllib.error.HTTPError as exc:
            code = (
                "OCR_RATE_LIMIT"
                if exc.code == 429
                else "OCR_PROVIDER_UNAVAILABLE"
                if exc.code in {502, 503}
                else "OCR_FAILED"
            )
            raise VisionProviderError(
                code,
                f"Vision provider returned HTTP {exc.code}.",
                retryable=exc.code in {429, 502, 503},
            ) from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            reason = getattr(exc, "reason", exc)
            if isinstance(reason, TimeoutError):
                raise VisionProviderError(
                    "OCR_TIMEOUT", "Vision provider request timed out.", retryable=True
                ) from exc
            raise VisionProviderError(
                "OCR_FAILED", "Vision provider request failed.", retryable=True
            ) from exc
        if len(raw) > 5_000_000:
            raise VisionProviderError(
                "OCR_SCHEMA_INVALID", "Vision provider response was too large."
            )
        try:
            result = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise VisionProviderError(
                "OCR_SCHEMA_INVALID", "Vision provider returned invalid JSON."
            ) from exc
        if not isinstance(result, dict):
            raise VisionProviderError(
                "OCR_SCHEMA_INVALID", "Vision provider response must be a JSON object."
            )
        return result


@dataclass(frozen=True)
class GeminiVisionProvider:
    api_key: str
    model: str = "gemini-2.5-flash"
    timeout_seconds: float = 30
    max_retries: int = 2
    transport: JsonTransport = UrllibJsonTransport()
    name: str = "gemini-vision"

    def isConfigured(self) -> bool:
        return bool(self.api_key.strip() and self.model.strip())

    async def healthCheck(self) -> dict[str, Any]:
        if not self.isConfigured():
            return {"status": "not_configured", "provider": self.name}
        model_name = urllib.parse.quote(self.model, safe="-._")
        await self.transport.request(
            "GET",
            f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}",
            headers={"x-goog-api-key": self.api_key},
            payload=None,
            timeout_seconds=min(self.timeout_seconds, 10),
        )
        return {"status": "ok", "provider": self.name, "model": self.model}

    async def extractDocument(
        self,
        *,
        content: bytes,
        mime_type: str,
        document_type: str,
        language_hint: str,
    ) -> ProviderExtractionResult:
        if not self.isConfigured():
            raise VisionProviderError(
                "OCR_NOT_CONFIGURED", "Vision extraction is not configured."
            )
        model_name = urllib.parse.quote(self.model, safe="-._")
        payload = {
            "contents": [{
                "role": "user",
                "parts": [
                    {"text": build_extraction_prompt(document_type, language_hint)},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": base64.b64encode(content).decode("ascii"),
                        }
                    },
                ],
            }],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": PROVIDER_RESPONSE_SCHEMA,
            },
        }
        try:
            response = await self._request_with_retry(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent",
                payload,
            )
        except asyncio.TimeoutError as exc:
            raise VisionProviderError(
                "OCR_TIMEOUT", "Vision provider request timed out.", retryable=True
            ) from exc

        try:
            text = response["candidates"][0]["content"]["parts"][0]["text"]
            validated = ProviderExtractionResult.model_validate(json.loads(text))
            return normalize_provider_result(validated)
        except (KeyError, IndexError, TypeError, json.JSONDecodeError, ValidationError) as exc:
            raise VisionProviderError(
                "OCR_SCHEMA_INVALID",
                "Vision provider output did not match the extraction schema.",
            ) from exc
        except ValueError as exc:
            if str(exc) == "DOCUMENT_UNREADABLE":
                raise VisionProviderError(
                    "DOCUMENT_UNREADABLE",
                    "The document did not contain readable chit details.",
                ) from exc
            raise VisionProviderError(
                "OCR_SCHEMA_INVALID",
                "Vision provider output did not match the extraction schema.",
            ) from exc

    async def _request_with_retry(
        self, url: str, payload: dict[str, Any]
    ) -> dict[str, Any]:
        attempts = max(1, self.max_retries + 1)
        for attempt in range(attempts):
            try:
                return await asyncio.wait_for(
                    self.transport.request(
                        "POST",
                        url,
                        headers={
                            "Content-Type": "application/json",
                            "x-goog-api-key": self.api_key,
                        },
                        payload=payload,
                        timeout_seconds=self.timeout_seconds,
                    ),
                    timeout=self.timeout_seconds,
                )
            except asyncio.TimeoutError as exc:
                error = VisionProviderError(
                    "OCR_TIMEOUT", "Vision provider request timed out.", retryable=True
                )
                error.__cause__ = exc
            except VisionProviderError as exc:
                error = exc
            if not error.retryable or attempt == attempts - 1:
                raise error
            await asyncio.sleep(0.25 * (2 ** attempt))
        raise VisionProviderError("OCR_FAILED", "Vision provider request failed.")


def create_vision_provider() -> VisionExtractionProvider:
    return GeminiVisionProvider(
        api_key=os.getenv("GEMINI_API_KEY", ""),
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        timeout_seconds=max(1, float(os.getenv("OCR_TIMEOUT_SECONDS", "30"))),
        max_retries=max(0, int(os.getenv("OCR_MAX_RETRIES", "2"))),
    )


def build_extraction_prompt(document_type: str, language_hint: str) -> str:
    return (
        "Extract only facts visibly present in this chit-fund document. "
        "Do not infer missing financial values. Preserve readable content in rawText. "
        "Recognize English, Telugu, bilingual text, and Telugu digits. "
        "Normalize currency to numeric rupees, percentages to numbers, dates to YYYY-MM-DD, "
        "and counts/durations to integers. Preserve unreadable or unclassified lines in "
        "extraction.unrecognizedText. For fieldResults, include value, confidence, exact "
        "sourceText, FOUND/AMBIGUOUS/NOT_FOUND/INVALID status, and a warning when needed. "
        "Use null or UNKNOWN for missing values and [] for absent tables. "
        "installmentPattern must be FIXED_MONTHLY, VARIABLE_MONTHLY, "
        "LIFTED_NON_LIFTED, CUSTOM_RULE, or UNKNOWN. "
        f"Document type: {document_type}. Language hint: {language_hint}."
    )


NULLABLE_STRING = {"type": ["string", "null"]}
NULLABLE_NUMBER = {"type": ["number", "null"]}
NULLABLE_INTEGER = {"type": ["integer", "null"]}
GENERIC_RECORD_ARRAY = {"type": "array", "items": {"type": "object"}}
SCHEDULE_PROPERTIES = {
    "monthNumber": {"type": "integer"},
    "monthLabel": NULLABLE_STRING,
    "standardPayment": NULLABLE_NUMBER,
    "nonLiftedPayment": NULLABLE_NUMBER,
    "liftedPayment": NULLABLE_NUMBER,
    "prizeAmount": NULLABLE_NUMBER,
    "bidAmount": NULLABLE_NUMBER,
    "commissionValue": NULLABLE_NUMBER,
    "deposit": NULLABLE_NUMBER,
    "dividendPerMember": NULLABLE_NUMBER,
    "penalty": NULLABLE_NUMBER,
    "otherDeductions": NULLABLE_NUMBER,
    "netAmount": NULLABLE_NUMBER,
    "confidence": {"type": "number"},
}

PROVIDER_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "rawText", "documentType", "languageDetected", "extraction",
        "confidence", "missingFields", "warnings",
    ],
    "properties": {
        "rawText": {"type": "string"},
        "documentType": {
            "type": "string",
            "enum": [
                "CHIT_REGISTER", "CHIT_POSTER", "CHIT_PLAN",
                "INSTALLMENT_SCHEDULE", "UNKNOWN",
            ],
        },
        "languageDetected": {
            "type": "string",
            "enum": ["TELUGU", "ENGLISH", "BILINGUAL", "UNKNOWN"],
        },
        "extraction": {
            "type": "object",
            "additionalProperties": False,
            "required": [
                "chitName", "chitCode", "organizerName", "chitValue",
                "durationMonths", "memberCount", "monthlyInstallment",
                "installmentPattern", "members", "installmentSchedule",
                "auctionHistory", "collections", "dividends",
            ],
            "properties": {
                "chitName": NULLABLE_STRING,
                "chitCode": NULLABLE_STRING,
                "organizerName": NULLABLE_STRING,
                "chitValue": NULLABLE_NUMBER,
                "durationMonths": NULLABLE_INTEGER,
                "memberCount": NULLABLE_INTEGER,
                "monthlyInstallment": NULLABLE_NUMBER,
                "installmentPattern": {
                    "type": "string",
                    "enum": [
                        "FIXED_MONTHLY", "VARIABLE_MONTHLY",
                        "LIFTED_NON_LIFTED", "CUSTOM_RULE", "UNKNOWN",
                    ],
                },
                "installmentMode": NULLABLE_STRING,
                "startDate": NULLABLE_STRING,
                "foremanCommissionPercent": NULLABLE_NUMBER,
                "minimumDiscountPercent": NULLABLE_NUMBER,
                "maximumDiscountPercent": NULLABLE_NUMBER,
                "prizeAmount": NULLABLE_NUMBER,
                "auctionPattern": NULLABLE_STRING,
                "contactNumber": NULLABLE_STRING,
                "fractionalTicketInformation": NULLABLE_STRING,
                "specialRules": NULLABLE_STRING,
                "notes": NULLABLE_STRING,
                "fieldResults": {"type": "object"},
                "unrecognizedText": {"type": "array", "items": {"type": "string"}},
                "members": {"type": "array", "items": {"type": "object"}},
                "installmentSchedule": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["monthNumber"],
                        "properties": SCHEDULE_PROPERTIES,
                    },
                },
                "auctionHistory": GENERIC_RECORD_ARRAY,
                "collections": GENERIC_RECORD_ARRAY,
                "dividends": GENERIC_RECORD_ARRAY,
            },
        },
        "confidence": {
            "type": "object",
            "additionalProperties": False,
            "required": [
                "overallScore", "fieldScores", "mathValidated", "requiresHumanReview"
            ],
            "properties": {
                "overallScore": {"type": "number"},
                "fieldScores": {"type": "object"},
                "mathValidated": {"type": "boolean"},
                "requiresHumanReview": {"type": "boolean"},
            },
        },
        "missingFields": {"type": "array", "items": {"type": "string"}},
        "warnings": {"type": "array", "items": {"type": "string"}},
    },
}
