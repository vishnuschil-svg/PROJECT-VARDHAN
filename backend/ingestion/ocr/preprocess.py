"""Image preprocessing for local Tesseract OCR."""

from __future__ import annotations

import io
from typing import Any


def preprocess_image_bytes(content: bytes, *, max_edge: int = 2400) -> bytes:
    """
    Best-effort preprocess. Returns PNG bytes.
    If Pillow/OpenCV unavailable, returns original bytes unchanged.
    """
    try:
        from PIL import Image, ImageOps, ImageFilter
    except ImportError:
        return content

    image = Image.open(io.BytesIO(content))
    image = ImageOps.exif_transpose(image)
    image = image.convert("RGB")

    width, height = image.size
    longest = max(width, height)
    if longest > max_edge:
        scale = max_edge / float(longest)
        image = image.resize((int(width * scale), int(height * scale)), Image.Resampling.LANCZOS)

    gray = ImageOps.grayscale(image)
    gray = ImageOps.autocontrast(gray)
    gray = gray.filter(ImageFilter.MedianFilter(size=3))

    try:
        import numpy as np
        import cv2

        arr = np.array(gray)
        # mild deskew via minAreaRect on thresholded ink
        _, binary = cv2.threshold(arr, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        coords = np.column_stack(np.where(binary < 200))
        if len(coords) > 100:
            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle = -(90 + angle)
            else:
                angle = -angle
            if abs(angle) > 0.4 and abs(angle) < 15:
                h, w = arr.shape[:2]
                matrix = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
                arr = cv2.warpAffine(
                    arr, matrix, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
                )
        arr = cv2.adaptiveThreshold(
            arr, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 11
        )
        # border cleanup
        arr = cv2.copyMakeBorder(arr, 8, 8, 8, 8, cv2.BORDER_CONSTANT, value=255)
        gray = Image.fromarray(arr)
    except Exception:
        # Keep Pillow-only pipeline when OpenCV path fails
        pass

    out = io.BytesIO()
    gray.save(out, format="PNG")
    return out.getvalue()


def page_segmentation_mode(layout_hint: str | None = None) -> int:
    """Tesseract PSM selection."""
    hint = (layout_hint or "").upper()
    if hint in {"SPARSE", "POSTER"}:
        return 11
    if hint in {"SINGLE_COLUMN", "REGISTER"}:
        return 4
    if hint in {"TABLE", "SCHEDULE"}:
        return 6
    return 3  # fully automatic page segmentation
