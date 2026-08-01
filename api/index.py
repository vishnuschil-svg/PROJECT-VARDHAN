"""Vercel ASGI entry point. The domain API remains implemented in backend/main.py."""

from pathlib import Path
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI

BACKEND_DIRECTORY = Path(__file__).resolve().parents[1] / "backend"
if str(BACKEND_DIRECTORY) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIRECTORY))

from main import app as domain_app  # noqa: E402


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with domain_app.router.lifespan_context(domain_app):
        yield


app = FastAPI(docs_url=None, redoc_url=None, lifespan=lifespan)
app.mount("/api", domain_app)
