"""Safe normalization helpers — never invent missing financial values."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any


TELUGU_DIGITS = str.maketrans("౦౧౨౩౪౫౬౭౮౯", "0123456789")


def normalize_text(value: Any) -> str:
    text = str(value or "")
    text = text.translate(TELUGU_DIGITS)
    text = text.replace("\u00a0", " ")
    text = re.sub(r"[|]+", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def parse_money(value: Any) -> float | None:
    """Parse Indian/Western currency strings. Returns None when absent/unreadable."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        numeric = float(value)
        return numeric if numeric > 0 else None
    text = normalize_text(value)
    if not text or text.upper() in {"NA", "N/A", "NULL", "-", "—"}:
        return None
    text = text.replace("₹", "").replace("Rs.", "").replace("rs.", "").replace("INR", "")
    text = text.replace(",", "")
    match = re.search(r"-?\d+(?:\.\d+)?", text)
    if not match:
        return None
    numeric = float(match.group(0))
    # Never coerce missing to zero
    if numeric == 0:
        return None
    return numeric


def parse_int(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value if value > 0 else None
    if isinstance(value, float):
        if value <= 0:
            return None
        return int(value) if value.is_integer() else None
    text = normalize_text(value)
    match = re.search(r"\d+", text)
    if not match:
        return None
    numeric = int(match.group(0))
    return numeric if numeric > 0 else None


def parse_percent(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        numeric = float(value)
        if numeric < 0 or numeric > 100:
            return None
        return numeric
    text = normalize_text(value).replace("%", "")
    match = re.search(r"\d+(?:\.\d+)?", text)
    if not match:
        return None
    numeric = float(match.group(0))
    if numeric < 0 or numeric > 100:
        return None
    return numeric


def parse_indian_date(value: Any) -> str | None:
    """Return YYYY-MM-DD or None. Does not invent dates."""
    if value is None:
        return None
    text = normalize_text(value)
    if not text:
        return None
    # already ISO
    try:
        return datetime.fromisoformat(text[:10]).date().isoformat()
    except ValueError:
        pass
    for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%d.%m.%Y", "%d-%m-%y", "%d/%m/%y", "%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def sanitize_csv_formula(cell: Any) -> str:
    """Neutralize spreadsheet formula injection when exporting error reports."""
    text = str(cell if cell is not None else "")
    if text[:1] in {"=", "+", "-", "@", "\t", "\r"}:
        return "'" + text
    return text
