"""MIME + magic-byte signature validation for ingestion routing."""

from __future__ import annotations

from dataclasses import dataclass


class IngestionReject(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(frozen=True)
class DetectedFile:
    mime_type: str
    source_kind_hint: str
    extension: str


ZIP_OLE_OLE2 = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"  # legacy DOC/XLS
PNG = b"\x89PNG\r\n\x1a\n"
JPEG_SOI = b"\xff\xd8\xff"
WEBP_RIFF = b"RIFF"
WEBP_WEBP = b"WEBP"
PDF = b"%PDF-"
ZIP_LOCAL = b"PK\x03\x04"
ZIP_EMPTY = b"PK\x05\x06"


def _looks_like_xlsx(content: bytes) -> bool:
    if not (content.startswith(ZIP_LOCAL) or content.startswith(ZIP_EMPTY)):
        return False
    head = content[:65536]
    return b"xl/" in head or b"xl\\worksheets" in head


def _looks_like_docx(content: bytes) -> bool:
    if not (content.startswith(ZIP_LOCAL) or content.startswith(ZIP_EMPTY)):
        return False
    head = content[:65536]
    return b"word/" in head or b"word/document.xml" in head


def detect_file(content: bytes, declared_mime: str, filename: str) -> DetectedFile:
    if not content:
        raise IngestionReject("UNSUPPORTED_DOCUMENT", "Empty file.")
    name = (filename or "upload.bin").lower()
    declared = (declared_mime or "").lower().strip()

    # Executables / scripts disguised as documents
    if content.startswith(b"MZ") or content.startswith(b"#!") or content.startswith(b"\x7fELF"):
        raise IngestionReject("UNSUPPORTED_DOCUMENT", "Executable or script content is not allowed.")

    if content.startswith(JPEG_SOI):
        return DetectedFile("image/jpeg", "IMAGE", ".jpg")
    if content.startswith(PNG):
        return DetectedFile("image/png", "IMAGE", ".png")
    if content.startswith(WEBP_RIFF) and len(content) >= 12 and content[8:12] == WEBP_WEBP:
        return DetectedFile("image/webp", "IMAGE", ".webp")
    if content.startswith(PDF):
        return DetectedFile("application/pdf", "PDF", ".pdf")

    if content.startswith(ZIP_LOCAL) or content.startswith(ZIP_EMPTY):
        # DOCX before XLSX: both OOXML zips contain [Content_Types].xml
        if _looks_like_docx(content) or name.endswith(".docx"):
            return DetectedFile(
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "DOCX",
                ".docx",
            )
        if _looks_like_xlsx(content) or name.endswith(".xlsx"):
            return DetectedFile(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "XLSX",
                ".xlsx",
            )
        raise IngestionReject("UNSUPPORTED_DOCUMENT", "Unrecognized or malformed ZIP-based document.")

    if content.startswith(ZIP_OLE_OLE2):
        # Legacy OLE compound document: DOC or XLS
        if name.endswith(".xls"):
            raise IngestionReject(
                "UNSUPPORTED_DOCUMENT",
                "Legacy XLS is not supported. Save as XLSX or CSV.",
            )
        return DetectedFile("application/msword", "DOC", ".doc")

    # CSV / plain text heuristics
    sample = content[:4096]
    try:
        text = sample.decode("utf-8")
    except UnicodeDecodeError:
        try:
            text = sample.decode("utf-16")
        except UnicodeDecodeError:
            try:
                text = sample.decode("latin-1")
            except UnicodeDecodeError as exc:
                raise IngestionReject(
                    "UNSUPPORTED_DOCUMENT",
                    "Unrecognized binary file type.",
                ) from exc

    if "\x00" in text[:200]:
        raise IngestionReject("UNSUPPORTED_DOCUMENT", "Unrecognized binary file type.")

    # Treat as CSV when delimiter-like and declared/named as csv/text
    if name.endswith(".csv") or declared in {"text/csv", "application/csv", "text/plain"}:
        return DetectedFile("text/csv", "CSV", ".csv")

    # Plain text fallback only when clearly textual CSV-like
    if "," in text or ";" in text or "\t" in text:
        return DetectedFile("text/csv", "CSV", ".csv")

    raise IngestionReject(
        "UNSUPPORTED_DOCUMENT",
        "Unsupported file type. Use XLSX, CSV, PDF, DOCX, DOC, JPG, PNG, or WEBP.",
    )


def assert_extension_matches(detected: DetectedFile, filename: str) -> None:
    name = (filename or "").lower()
    if not name or "." not in name:
        return
    ext = "." + name.rsplit(".", 1)[-1]
    allowed = {
        ".jpg": {".jpg", ".jpeg"},
        ".jpeg": {".jpg", ".jpeg"},
        ".png": {".png"},
        ".webp": {".webp"},
        ".pdf": {".pdf"},
        ".xlsx": {".xlsx"},
        ".docx": {".docx"},
        ".doc": {".doc"},
        ".csv": {".csv", ".txt"},
    }
    expected = allowed.get(detected.extension, {detected.extension})
    # Allow jpeg alias
    if detected.extension == ".jpg":
        expected = {".jpg", ".jpeg"}
    if ext not in expected and detected.source_kind_hint not in {"CSV"}:
        # Soft mismatch: signature wins, but reject obvious disguise (.exe renamed)
        if ext in {".exe", ".bat", ".cmd", ".js", ".msi", ".dll", ".com", ".scr"}:
            raise IngestionReject("UNSUPPORTED_DOCUMENT", "Disguised executable extension rejected.")
