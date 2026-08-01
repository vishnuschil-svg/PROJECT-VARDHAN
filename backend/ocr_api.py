from __future__ import annotations

import os
import re
import uuid
from pathlib import PurePath
from typing import Any, Callable

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from ocr_schemas import OCRDomainError, OCRExtractionResponse
from vision_providers import VisionExtractionProvider, VisionProviderError, create_vision_provider


SUPPORTED_MIME_TYPES = frozenset(
    {"image/jpeg", "image/png", "image/webp", "application/pdf"}
)
SUPPORTED_EXTENSIONS = {
    "image/jpeg": frozenset({".jpg", ".jpeg"}),
    "image/png": frozenset({".png"}),
    "image/webp": frozenset({".webp"}),
    "application/pdf": frozenset({".pdf"}),
}
DOCUMENT_TYPES = frozenset(
    {"CHIT_REGISTER", "CHIT_POSTER", "CHIT_PLAN", "INSTALLMENT_SCHEDULE", "UNKNOWN"}
)
LANGUAGE_HINTS = frozenset({"TELUGU", "ENGLISH", "BILINGUAL", "UNKNOWN"})


def get_vision_provider() -> VisionExtractionProvider:
    return create_vision_provider()


def build_ocr_router(workspace_dependency: Callable[..., Any]) -> APIRouter:
    router = APIRouter(prefix="/v1/ocr", tags=["ocr"])

    @router.post(
        "/extract",
        response_model=OCRExtractionResponse,
        response_model_by_alias=True,
    )
    async def extract_chit_document(
        file: UploadFile = File(...),
        document_type: str = Form("CHIT_REGISTER"),
        language_hint: str = Form("UNKNOWN"),
        _: tuple[Any, ...] = Depends(workspace_dependency),
        provider: VisionExtractionProvider = Depends(get_vision_provider),
    ) -> OCRExtractionResponse:
        normalized_document_type = document_type.strip().upper()
        normalized_language_hint = language_hint.strip().upper()
        if normalized_document_type not in DOCUMENT_TYPES:
            await file.close()
            raise_domain_error(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                "UNSUPPORTED_DOCUMENT",
                "Unsupported document_type.",
            )
        if normalized_language_hint not in LANGUAGE_HINTS:
            await file.close()
            raise_domain_error(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                "UNSUPPORTED_DOCUMENT",
                "Unsupported language_hint.",
            )
        if not provider.isConfigured():
            await file.close()
            raise_domain_error(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "OCR_NOT_CONFIGURED",
                "Document extraction is not configured.",
            )

        try:
            validate_file_name(file.filename)
            mime_type = (file.content_type or "").lower()
            if mime_type not in SUPPORTED_MIME_TYPES:
                raise_domain_error(
                    status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    "UNSUPPORTED_DOCUMENT",
                    "Use JPEG, PNG, WebP, or PDF.",
                )
            validate_file_extension(file.filename, mime_type)
            content = await read_bounded_upload(file)
            validate_signature(content, mime_type)
            validate_document_integrity(content, mime_type)
            validate_pdf_page_limit(content, mime_type)
            result = await provider.extractDocument(
                content=content,
                mime_type=mime_type,
                document_type=normalized_document_type,
                language_hint=normalized_language_hint,
            )
            return OCRExtractionResponse(
                status="SUCCESS",
                documentId=str(uuid.uuid4()),
                provider=provider.name,
                **result.model_dump(),
            )
        except VisionProviderError as exc:
            status_code = {
                "OCR_NOT_CONFIGURED": status.HTTP_503_SERVICE_UNAVAILABLE,
                "OCR_TIMEOUT": status.HTTP_504_GATEWAY_TIMEOUT,
                "OCR_RATE_LIMIT": status.HTTP_429_TOO_MANY_REQUESTS,
                "OCR_PROVIDER_UNAVAILABLE": status.HTTP_503_SERVICE_UNAVAILABLE,
                "OCR_SCHEMA_INVALID": status.HTTP_502_BAD_GATEWAY,
                "DOCUMENT_UNREADABLE": status.HTTP_422_UNPROCESSABLE_CONTENT,
            }.get(exc.code, status.HTTP_502_BAD_GATEWAY)
            raise_domain_error(
                status_code, exc.code, exc.message, retryable=exc.retryable
            )
        finally:
            await file.close()

    return router


async def read_bounded_upload(file: UploadFile) -> bytes:
    max_file_mb = max(1, float(os.getenv("OCR_MAX_FILE_MB", "15")))
    max_bytes = int(max_file_mb * 1024 * 1024)
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(min(1024 * 1024, max_bytes + 1 - total))
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise_domain_error(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                "FILE_TOO_LARGE",
                f"Document exceeds the {max_file_mb:g} MB limit.",
            )
        chunks.append(chunk)
    if total == 0:
        raise_domain_error(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "DOCUMENT_UNREADABLE",
            "The uploaded document is empty.",
        )
    return b"".join(chunks)


def validate_file_name(file_name: str | None) -> None:
    candidate = (file_name or "").strip()
    if (
        not candidate
        or len(candidate) > 180
        or "\x00" in candidate
        or PurePath(candidate).name != candidate
        or "/" in candidate
        or "\\" in candidate
    ):
        raise_domain_error(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "UNSUPPORTED_DOCUMENT",
            "The uploaded file name is invalid.",
        )


def validate_file_extension(file_name: str | None, mime_type: str) -> None:
    extension = PurePath(file_name or "").suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS.get(mime_type, frozenset()):
        raise_domain_error(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "UNSUPPORTED_DOCUMENT",
            "Document extension does not match its declared MIME type.",
        )


def validate_signature(content: bytes, mime_type: str) -> None:
    valid = {
        "image/jpeg": content.startswith(b"\xff\xd8\xff"),
        "image/png": content.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/webp": (
            len(content) >= 12
            and content.startswith(b"RIFF")
            and content[8:12] == b"WEBP"
        ),
        "application/pdf": content.startswith(b"%PDF-"),
    }[mime_type]
    if not valid:
        raise_domain_error(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            "UNSUPPORTED_DOCUMENT",
            "Document content does not match its declared MIME type.",
        )


def validate_document_integrity(content: bytes, mime_type: str) -> None:
    valid = True
    if mime_type == "image/jpeg":
        valid = len(content) >= 4 and b"\xff\xd9" in content[-64:]
    elif mime_type == "image/png":
        valid = len(content) >= 20 and b"IEND" in content[-32:]
    elif mime_type == "image/webp":
        declared_size = int.from_bytes(content[4:8], "little") + 8 if len(content) >= 12 else 0
        valid = declared_size == len(content)
    elif mime_type == "application/pdf":
        valid = len(content) >= 8 and b"%%EOF" in content[-2048:]
    if not valid:
        raise_domain_error(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "DOCUMENT_UNREADABLE",
            "The document is incomplete or corrupt. Re-export it or upload a clearer copy.",
        )


def validate_pdf_page_limit(content: bytes, mime_type: str) -> None:
    if mime_type != "application/pdf":
        return
    page_limit = max(1, int(os.getenv("OCR_PDF_MAX_PAGES", "25")))
    page_count = len(re.findall(rb"/Type\s*/Page(?!s)\b", content))
    if page_count > page_limit:
        raise_domain_error(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "PDF_PAGE_LIMIT_EXCEEDED",
            f"PDF exceeds the {page_limit}-page processing limit.",
        )


def raise_domain_error(
    status_code: int,
    code: str,
    message: str,
    *,
    retryable: bool = False,
) -> None:
    detail = OCRDomainError(code=code, message=message, retryable=retryable)
    raise HTTPException(status_code=status_code, detail=detail.model_dump())
