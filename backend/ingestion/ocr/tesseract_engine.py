"""Native Tesseract OCR engine — text + confidence only."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

from ingestion.ocr.preprocess import page_segmentation_mode, preprocess_image_bytes


@dataclass
class LocalOCRResult:
    text: str
    confidence: float
    available: bool
    engine: str
    warnings: list[str]


class LocalOCRUnavailable(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def ocr_languages() -> str:
    return os.getenv("INGESTION_OCR_LANGS", "eng+tel")


def is_tesseract_available() -> bool:
    try:
        import pytesseract
        from PIL import Image  # noqa: F401

        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def run_tesseract(
    image_bytes: bytes,
    *,
    language_hint: str = "UNKNOWN",
    layout_hint: str | None = None,
    preprocess: bool = True,
) -> LocalOCRResult:
    warnings: list[str] = []
    if not is_tesseract_available():
        raise LocalOCRUnavailable(
            "Native Tesseract OCR is not installed or not on PATH."
        )

    import pytesseract
    from PIL import Image
    import io

    payload = preprocess_image_bytes(image_bytes) if preprocess else image_bytes
    image = Image.open(io.BytesIO(payload))
    langs = ocr_languages()
    hint = (language_hint or "UNKNOWN").upper()
    if hint == "ENGLISH":
        langs = "eng"
    elif hint == "TELUGU":
        langs = "tel"
    elif hint == "BILINGUAL":
        langs = "eng+tel"

    psm = page_segmentation_mode(layout_hint)
    config = f"--psm {psm}"
    try:
        data: dict[str, Any] = pytesseract.image_to_data(
            image, lang=langs, config=config, output_type=pytesseract.Output.DICT
        )
        text = pytesseract.image_to_string(image, lang=langs, config=config)
    except Exception as exc:
        # Retry English-only if Telugu pack missing
        warnings.append(f"Primary OCR langs failed ({langs}); retrying eng.")
        data = pytesseract.image_to_data(
            image, lang="eng", config=config, output_type=pytesseract.Output.DICT
        )
        text = pytesseract.image_to_string(image, lang="eng", config=config)
        warnings.append(str(exc)[:200])

    confidences: list[float] = []
    for raw in data.get("conf", []):
        try:
            score = float(raw)
        except (TypeError, ValueError):
            continue
        if score >= 0:
            confidences.append(score / 100.0)
    overall = sum(confidences) / len(confidences) if confidences else 0.0
    return LocalOCRResult(
        text=(text or "").strip(),
        confidence=overall,
        available=True,
        engine="tesseract",
        warnings=warnings,
    )
