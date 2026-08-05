from __future__ import annotations

import asyncio
import base64
import json
import os
import re
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
            # Read the error response body to get provider details (sanitized)
            error_body = ""
            try:
                error_body = exc.read(5_000).decode("utf-8", errors="replace").strip()
                # Sanitize: extract only safe diagnostic fields
                error_data = _sanitize_provider_error(error_body)
            except Exception:
                error_data = {}

            code = (
                "OCR_RATE_LIMIT"
                if exc.code == 429
                else "OCR_PROVIDER_UNAVAILABLE"
                if exc.code in {502, 503}
                else "OCR_FAILED"
            )

            # Build a safe diagnostic message
            safe_msg = f"Vision provider returned HTTP {exc.code}."
            if error_data.get("error_message"):
                # Include only the sanitized error message, never the full body
                safe_msg = f"Vision provider returned HTTP {exc.code}: {error_data['error_message']}"

            raise VisionProviderError(
                code,
                safe_msg,
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


def _sanitize_provider_error(raw_body: str) -> dict[str, Any]:
    """Extract safe diagnostic fields from a provider error response.

    Never returns: API keys, full URLs, auth tokens, image data, or document contents.
    """
    result: dict[str, Any] = {}
    try:
        err = json.loads(raw_body)
        # Gemini error format: {"error": {"code": 400, "message": "...", "status": "..."}}
        if isinstance(err, dict) and "error" in err:
            error_obj = err["error"]
            if isinstance(error_obj, dict):
                msg = error_obj.get("message", "")
                # Sanitize: only keep the first sentence or first 200 chars, strip any secrets
                if msg:
                    # Keep only the first sentence for safety
                    first_sentence = msg.split(". ")[0].split(".\n")[0][:200]
                    # Remove any API-key-like patterns
                    sanitized = re.sub(
                        r'API_KEY[^"\']*|api_key[^"\']*|key[=:]\s*\S{10,}',
                        "[REDACTED]",
                        first_sentence,
                        flags=re.IGNORECASE,
                    )
                    result["error_message"] = sanitized
                result["error_status"] = error_obj.get("status", "")
                # Only include code if it's an integer HTTP status
                code_val = error_obj.get("code")
                if isinstance(code_val, int):
                    result["error_code"] = code_val
    except (json.JSONDecodeError, UnicodeDecodeError, AttributeError):
        # If we can't parse the error, don't include it
        pass
    return result


@dataclass(frozen=True)
class GeminiVisionProvider:
    api_key: str
    model: str = "gemini-3.6-flash"
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

        # Strategy 1: Try with structured output (responseSchema)
        # Strategy 2: Fallback to plain JSON request without schema
        # Strategy 3: Fallback to plain text request

        strategies = [
            ("structured", self._build_structured_payload),
            ("json_plain", self._build_json_plain_payload),
            ("text", self._build_text_payload),
        ]

        last_error: VisionProviderError | None = None
        for strategy_name, build_fn in strategies:
            try:
                payload = build_fn(content, mime_type, document_type, language_hint)
                response = await self._request_with_retry(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent",
                    payload,
                    retry_timeouts=strategy_name != "structured",
                )
                return self._parse_response(response, strategy_name)
            except asyncio.TimeoutError as exc:
                raise VisionProviderError(
                    "OCR_TIMEOUT", "Vision provider request timed out.", retryable=True
                ) from exc
            except VisionProviderError as exc:
                # Fall through to the next compatible strategy when structured JSON
                # is unsupported, times out, or the provider emits malformed JSON.
                # The final text strategy preserves visible evidence for deterministic
                # parsing in the browser instead of failing the entire upload.
                can_fallback = strategy_name != "text" and (
                    exc.code in {"OCR_TIMEOUT", "OCR_SCHEMA_INVALID"}
                    or "HTTP 400" in exc.message
                )
                if can_fallback:
                    last_error = exc
                    continue
                raise

        # If all strategies failed
        raise last_error or VisionProviderError(
            "OCR_FAILED", "All vision provider extraction strategies failed."
        )

    def _build_structured_payload(
        self,
        content: bytes,
        mime_type: str,
        document_type: str,
        language_hint: str,
    ) -> dict[str, Any]:
        return {
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

    def _build_json_plain_payload(
        self,
        content: bytes,
        mime_type: str,
        document_type: str,
        language_hint: str,
    ) -> dict[str, Any]:
        prompt = (
            build_extraction_prompt(document_type, language_hint)
            + "\n\nReturn ONLY valid JSON matching this exact structure:\n"
            + json.dumps(JSON_OUTPUT_EXAMPLE, indent=2)
        )
        return {
            "contents": [{
                "role": "user",
                "parts": [
                    {"text": prompt},
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
            },
        }

    def _build_text_payload(
        self,
        content: bytes,
        mime_type: str,
        document_type: str,
        language_hint: str,
    ) -> dict[str, Any]:
        return {
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
        }

    def _parse_response(
        self, response: dict[str, Any], strategy: str
    ) -> ProviderExtractionResult:
        try:
            text = response["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError) as exc:
            raise VisionProviderError(
                "OCR_SCHEMA_INVALID",
                "Vision provider response is missing expected content structure.",
            ) from exc

        if strategy == "text":
            # Wrap plain text into the expected structure
            return ProviderExtractionResult(
                rawText=text.strip(),
                documentType="UNKNOWN",
                languageDetected="UNKNOWN",
                extraction={
                    "chitName": None,
                    "chitCode": None,
                    "organizerName": None,
                    "chitValue": None,
                    "durationMonths": None,
                    "memberCount": None,
                    "monthlyInstallment": None,
                    "installmentPattern": "UNKNOWN",
                    "members": [],
                    "installmentSchedule": [],
                    "auctionHistory": [],
                    "collections": [],
                    "dividends": [],
                },
                confidence={
                    "overallScore": 0.0,
                    "fieldScores": {},
                    "mathValidated": False,
                    "requiresHumanReview": True,
                },
                missingFields=[],
                warnings=["Plain text fallback was used; JSON parsing was not available."],
            )

        # For structured and json_plain strategies, parse JSON
        try:
            # Strip markdown code fences if present
            cleaned = text.strip()
            if cleaned.startswith("```"):
                # Extract JSON from markdown code block
                match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
                if match:
                    cleaned = match.group(1).strip()
            parsed = json.loads(cleaned)
            parsed = canonicalize_provider_payload(parsed)
            validated = ProviderExtractionResult.model_validate(parsed)
            try:
                return normalize_provider_result(validated)
            except ValueError as normalize_exc:
                message = str(normalize_exc)
                if message == "DOCUMENT_UNREADABLE":
                    raise VisionProviderError(
                        "DOCUMENT_UNREADABLE",
                        "Document could not be understood from the extracted content.",
                    ) from normalize_exc
                raise
        except VisionProviderError:
            raise
        except (json.JSONDecodeError, ValidationError, ValueError) as exc:
            if strategy == "structured":
                # Should not happen with structured output, but handle gracefully
                raise VisionProviderError(
                    "OCR_SCHEMA_INVALID",
                    "Vision provider output did not match the extraction schema.",
                ) from exc
            raise VisionProviderError(
                "OCR_SCHEMA_INVALID",
                "Vision provider output is not valid JSON or does not match the schema.",
            ) from exc

    async def _request_with_retry(
        self,
        url: str,
        payload: dict[str, Any],
        *,
        retry_timeouts: bool = True,
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
                if not retry_timeouts:
                    raise error
            except VisionProviderError as exc:
                error = exc
            if not error.retryable or attempt == attempts - 1:
                raise error
            await asyncio.sleep(0.25 * (2 ** attempt))
        raise VisionProviderError("OCR_FAILED", "Vision provider request failed.")


def create_vision_provider() -> VisionExtractionProvider:
    return GeminiVisionProvider(
        api_key=os.getenv("GEMINI_API_KEY", ""),
        model=os.getenv("GEMINI_MODEL", "gemini-3.6-flash"),
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
        "Do not confuse memberCount with durationMonths. A number beside members/tickets is memberCount, "
        "and a number beside months/duration/tenure is durationMonths. If the evidence is ambiguous, return null. "
        "When a month-wise table is visible, extract every readable row into installmentSchedule in row order. "
        "Use the table month number/label as monthNumber/monthLabel and preserve unreadable cells as null. "
        "If a schedule table is visible but cannot be fully read, return the readable rows and add a warning; do not return an empty schedule silently. "
        f"Document type: {document_type}. Language hint: {language_hint}."
    )


def canonicalize_provider_payload(payload: Any) -> Any:
    """Normalize a small set of common model aliases before strict validation."""
    if not isinstance(payload, dict):
        return payload
    extraction = payload.get("extraction")
    if not isinstance(extraction, dict):
        return payload
    members = extraction.get("members")
    if not isinstance(members, list):
        return payload

    normalized_members: list[Any] = []
    allowed_member_keys = ("memberNumber", "name", "contact", "address")
    for member in members:
        if not isinstance(member, dict):
            normalized_members.append(member)
            continue
        normalized = {
            key: member[key] for key in allowed_member_keys if key in member
        }
        if "name" not in normalized and "memberName" in member:
            normalized["name"] = member["memberName"]
        ticket_number = member.get("ticketNumber")
        if "memberNumber" not in normalized and (
            isinstance(ticket_number, int)
            or (isinstance(ticket_number, str) and ticket_number.isdigit())
        ):
            normalized["memberNumber"] = int(ticket_number)
        normalized_members.append(normalized)

    return {
        **payload,
        "extraction": {**extraction, "members": normalized_members},
    }


# ---------------------------------------------------------------------------
# Response schema for structured output (Strat 1)
# ---------------------------------------------------------------------------
# NOTE: Gemini's `responseSchema` does NOT support `additionalProperties: false`
# on nested objects. Only the top-level schema may use it. All nested objects
# use `additionalProperties: true` (implicit) to avoid HTTP 400 errors.
# ---------------------------------------------------------------------------

# Gemini responseSchema rejects JSON-Schema union forms like {"type": ["string","null"]}.
# Use OpenAPI-style nullable primitives instead.
NULLABLE_STRING = {"type": "string", "nullable": True}
NULLABLE_NUMBER = {"type": "number", "nullable": True}
NULLABLE_INTEGER = {"type": "integer", "nullable": True}

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

MEMBER_PROPERTIES = {
    "memberNumber": NULLABLE_INTEGER,
    "name": NULLABLE_STRING,
    "contact": NULLABLE_STRING,
    "address": NULLABLE_STRING,
}

PROVIDER_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
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
                "members": {
                    "type": "array",
                    "items": {"type": "object", "properties": MEMBER_PROPERTIES},
                },
                "installmentSchedule": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": SCHEDULE_PROPERTIES,
                    },
                },
                "auctionHistory": {"type": "array", "items": {"type": "object"}},
                "collections": {"type": "array", "items": {"type": "object"}},
                "dividends": {"type": "array", "items": {"type": "object"}},
            },
        },
        "confidence": {
            "type": "object",
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


# ---------------------------------------------------------------------------
# JSON example for plain-json fallback (Strat 2)
# ---------------------------------------------------------------------------

JSON_OUTPUT_EXAMPLE: dict[str, Any] = {
    "rawText": "Full text extracted from the document",
    "documentType": "CHIT_REGISTER",
    "languageDetected": "ENGLISH",
    "extraction": {
        "chitName": "Example Chit",
        "chitCode": "CH-001",
        "organizerName": "Organizer Name",
        "chitValue": 100000.0,
        "durationMonths": 25,
        "memberCount": 20,
        "monthlyInstallment": 5000.0,
        "installmentPattern": "FIXED_MONTHLY",
        "installmentMode": "Monthly",
        "startDate": "2024-01-01",
        "foremanCommissionPercent": 5.0,
        "minimumDiscountPercent": None,
        "maximumDiscountPercent": None,
        "prizeAmount": None,
        "auctionPattern": None,
        "contactNumber": None,
        "fractionalTicketInformation": None,
        "specialRules": None,
        "notes": None,
        "fieldResults": {},
        "unrecognizedText": [],
        "members": [{
            "memberNumber": None,
            "name": "Member Name",
            "contact": None,
            "address": None,
        }],
        "installmentSchedule": [],
        "auctionHistory": [],
        "collections": [],
        "dividends": [],
    },
    "confidence": {
        "overallScore": 0.0,
        "fieldScores": {},
        "mathValidated": False,
        "requiresHumanReview": True,
    },
    "missingFields": [],
    "warnings": [],
}
