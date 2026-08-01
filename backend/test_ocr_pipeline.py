from __future__ import annotations

import asyncio
import json
import os
import unittest
from unittest.mock import patch

from fastapi import HTTPException

from ocr_api import (
    build_ocr_router,
    validate_document_integrity,
    validate_file_extension,
    validate_file_name,
    validate_pdf_page_limit,
    validate_signature,
)
from ocr_schemas import ChitExtraction, ExtractionConfidence, ProviderExtractionResult, normalize_provider_result
from vision_providers import GeminiVisionProvider, VisionProviderError


def provider_payload(*, confidence: float = 0.94) -> dict:
    return {
        "rawText": "Chit Name: Mitra Nidhi Gold",
        "documentType": "CHIT_REGISTER",
        "languageDetected": "ENGLISH",
        "extraction": {
            "chitName": "Mitra Nidhi Gold",
            "chitCode": None,
            "organizerName": None,
            "chitValue": 100000,
            "durationMonths": 20,
            "memberCount": 20,
            "monthlyInstallment": 5000,
            "installmentPattern": "FIXED_MONTHLY",
            "members": [],
            "installmentSchedule": [],
            "auctionHistory": [],
            "collections": [],
            "dividends": [],
        },
        "confidence": {
            "overallScore": confidence,
            "fieldScores": {"chitName": confidence},
            "mathValidated": False,
            "requiresHumanReview": False,
        },
        "missingFields": [],
        "warnings": [],
    }


class FakeTransport:
    def __init__(self, response: dict | None = None, delay: float = 0):
        self.response = response
        self.delay = delay
        self.request_data = None

    async def request(self, method, url, *, headers, payload, timeout_seconds):
        self.request_data = (method, url, headers, payload, timeout_seconds)
        if self.delay:
            await asyncio.sleep(self.delay)
        return self.response


class RetryTransport:
    def __init__(self, failures: int, response: dict):
        self.failures = failures
        self.response = response
        self.calls = 0

    async def request(self, method, url, *, headers, payload, timeout_seconds):
        self.calls += 1
        if self.calls <= self.failures:
            raise VisionProviderError(
                "OCR_RATE_LIMIT", "Provider rate limited.", retryable=True
            )
        return self.response


class OCRSchemaTests(unittest.TestCase):
    def test_strict_structured_output_and_math_normalization(self):
        result = ProviderExtractionResult.model_validate(provider_payload())
        normalized = normalize_provider_result(result)
        self.assertTrue(normalized.confidence.mathValidated)
        self.assertFalse(normalized.confidence.requiresHumanReview)
        self.assertEqual(normalized.extraction.installmentPattern, "FIXED_MONTHLY")

    def test_missing_mandatory_fields_require_review(self):
        result = ProviderExtractionResult(
            rawText="partial",
            extraction=ChitExtraction(chitName="Partial"),
            confidence=ExtractionConfidence(overallScore=0.95),
        )
        normalized = normalize_provider_result(result)
        self.assertTrue(normalized.confidence.requiresHumanReview)
        self.assertIn("chitValue", normalized.missingFields)
        self.assertIn("installmentPattern", normalized.missingFields)

    def test_empty_extraction_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "DOCUMENT_UNREADABLE"):
            normalize_provider_result(ProviderExtractionResult())

    def test_upload_guards_mime_signature_path_and_pdf_limit(self):
        validate_signature(b"\xff\xd8\xffdata", "image/jpeg")
        validate_signature(b"\x89PNG\r\n\x1a\ndata", "image/png")
        validate_signature(b"%PDF-1.7", "application/pdf")
        with self.assertRaises(HTTPException):
            validate_signature(b"not-a-png", "image/png")
        with self.assertRaises(HTTPException):
            validate_file_name("../secret.pdf")
        with patch.dict(os.environ, {"OCR_PDF_MAX_PAGES": "1"}):
            with self.assertRaises(HTTPException):
                validate_pdf_page_limit(
                    b"%PDF-1.7 /Type /Page /Type /Page", "application/pdf"
                )

    def test_extension_and_corrupt_document_guards(self):
        validate_file_extension("photo.jpeg", "image/jpeg")
        validate_document_integrity(b"\xff\xd8\xffpixels\xff\xd9", "image/jpeg")
        validate_document_integrity(
            b"\x89PNG\r\n\x1a\npayload-IEND-trailer", "image/png"
        )
        validate_document_integrity(b"%PDF-1.7 body %%EOF", "application/pdf")
        with self.assertRaises(HTTPException):
            validate_file_extension("photo.pdf", "image/jpeg")
        with self.assertRaises(HTTPException):
            validate_document_integrity(b"\xff\xd8\xfftruncated", "image/jpeg")
        with self.assertRaises(HTTPException):
            validate_document_integrity(b"%PDF-1.7 truncated", "application/pdf")

    def test_router_exposes_only_authenticated_dependency_bound_extract(self):
        async def workspace_context():
            return ("user", "workspace", object())

        router = build_ocr_router(workspace_context)
        route = next(item for item in router.routes if item.path == "/v1/ocr/extract")
        self.assertEqual({"POST"}, route.methods)
        self.assertTrue(route.dependant.dependencies)


class GeminiProviderTests(unittest.IsolatedAsyncioTestCase):
    async def test_jpg_and_pdf_generate_schema_enforced_requests(self):
        for mime_type in ("image/jpeg", "application/pdf"):
            transport = FakeTransport({
                "candidates": [{
                    "content": {
                        "parts": [{"text": json.dumps(provider_payload())}]
                    }
                }]
            })
            provider = GeminiVisionProvider(
                api_key="test-only-key",
                transport=transport,
            )
            result = await provider.extractDocument(
                content=b"document bytes",
                mime_type=mime_type,
                document_type="CHIT_REGISTER",
                language_hint="ENGLISH",
            )
            self.assertEqual("Mitra Nidhi Gold", result.extraction.chitName)
            request_payload = transport.request_data[3]
            self.assertEqual("application/json", request_payload["generationConfig"]["responseMimeType"])
            self.assertIn("responseSchema", request_payload["generationConfig"])
            self.assertEqual(
                mime_type,
                request_payload["contents"][0]["parts"][1]["inline_data"]["mime_type"],
            )

    async def test_timeout_and_invalid_provider_json_are_structured_errors(self):
        timeout_provider = GeminiVisionProvider(
            api_key="test-only-key",
            timeout_seconds=0.01,
            transport=FakeTransport({}, delay=0.1),
        )
        with self.assertRaises(VisionProviderError) as timeout:
            await timeout_provider.extractDocument(
                content=b"x",
                mime_type="image/jpeg",
                document_type="CHIT_REGISTER",
                language_hint="UNKNOWN",
            )
        self.assertEqual("OCR_TIMEOUT", timeout.exception.code)

        invalid_provider = GeminiVisionProvider(
            api_key="test-only-key",
            transport=FakeTransport({"candidates": []}),
        )
        with self.assertRaises(VisionProviderError) as invalid:
            await invalid_provider.extractDocument(
                content=b"x",
                mime_type="application/pdf",
                document_type="CHIT_REGISTER",
                language_hint="UNKNOWN",
            )
        self.assertEqual("OCR_SCHEMA_INVALID", invalid.exception.code)

    async def test_retryable_provider_failure_uses_bounded_retries(self):
        response = {
            "candidates": [{
                "content": {"parts": [{"text": json.dumps(provider_payload())}]}
            }]
        }
        transport = RetryTransport(2, response)
        provider = GeminiVisionProvider(
            api_key="test-only-key",
            max_retries=2,
            transport=transport,
        )
        result = await provider.extractDocument(
            content=b"x",
            mime_type="image/jpeg",
            document_type="CHIT_REGISTER",
            language_hint="BILINGUAL",
        )
        self.assertEqual("Mitra Nidhi Gold", result.extraction.chitName)
        self.assertEqual(3, transport.calls)


if __name__ == "__main__":
    unittest.main()
