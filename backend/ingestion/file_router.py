"""File ingestion router — MIME + signature based."""

from __future__ import annotations

import os
from dataclasses import dataclass

from ingestion import adapters
from ingestion.adapters import AdapterResult
from ingestion.signatures import DetectedFile, IngestionReject, assert_extension_matches, detect_file


@dataclass(frozen=True)
class RoutedFile:
    detected: DetectedFile
    result: AdapterResult


def max_file_bytes() -> int:
    return int(max(1.0, float(os.getenv("INGESTION_MAX_FILE_MB", "15"))) * 1024 * 1024)


def route_and_extract(
    content: bytes,
    *,
    filename: str,
    declared_mime: str,
    language_hint: str = "UNKNOWN",
) -> RoutedFile:
    if len(content) > max_file_bytes():
        raise IngestionReject("FILE_TOO_LARGE", "File exceeds configured size limit.")

    detected = detect_file(content, declared_mime, filename)
    assert_extension_matches(detected, filename)

    kind = detected.source_kind_hint
    if kind == "XLSX":
        result = adapters.extract_xlsx(content)
    elif kind == "CSV":
        result = adapters.extract_csv(content)
    elif kind == "PDF":
        result = adapters.extract_pdf(content, language_hint=language_hint)
    elif kind == "DOCX":
        result = adapters.extract_docx(content)
    elif kind == "DOC":
        result = adapters.extract_doc(content)
    elif kind == "IMAGE":
        result = adapters.extract_image(content, language_hint=language_hint)
    else:
        raise IngestionReject("UNSUPPORTED_DOCUMENT", "No adapter for detected file type.")

    return RoutedFile(detected=detected, result=result)
