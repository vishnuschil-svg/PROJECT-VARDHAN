"""Vercel ASGI entry point. The domain API remains implemented in backend/main.py."""

from pathlib import Path
import sys

BACKEND_DIRECTORY = Path(__file__).resolve().parents[1] / "backend"
if str(BACKEND_DIRECTORY) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIRECTORY))

from main import app  # noqa: E402,F401
