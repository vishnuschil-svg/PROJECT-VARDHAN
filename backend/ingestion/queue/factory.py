"""Queue store factory — SQLite for local, Postgres for production.

Production never silently falls back to SQLite.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from ingestion.queue.store import IngestionQueueStore


class IngestionQueueConfigurationError(RuntimeError):
    """Raised when production queue configuration is invalid."""


def app_environment() -> str:
    return os.getenv("APP_ENV", os.getenv("ENVIRONMENT", "development")).strip().lower()


def is_production_environment() -> bool:
    return app_environment() in {"production", "prod"}


def resolve_queue_backend() -> str:
    configured = os.getenv("INGESTION_QUEUE_BACKEND", "").strip().lower()
    if configured in {"sqlite", "postgres", "postgresql"}:
        backend = "postgres" if configured.startswith("postgres") else "sqlite"
    elif is_production_environment():
        backend = "postgres"
    else:
        backend = "sqlite"

    # Production must never silently use SQLite.
    if is_production_environment() and backend == "sqlite":
        raise IngestionQueueConfigurationError(
            "Production APP_ENV/ENVIRONMENT forbids SQLite ingestion queue. "
            "Set INGESTION_QUEUE_BACKEND=postgres and DATABASE_URL."
        )
    if backend == "postgres" and not os.getenv("DATABASE_URL", "").strip():
        raise IngestionQueueConfigurationError(
            "Postgres ingestion queue requires DATABASE_URL."
        )
    return backend


def create_ingestion_queue_store() -> Any:
    backend = resolve_queue_backend()
    if backend == "postgres":
        from ingestion.queue.postgres_store import PostgresIngestionQueueStore

        return PostgresIngestionQueueStore()
    return IngestionQueueStore()


def queue_health_snapshot() -> dict[str, Any]:
    """Safe health fields only — never includes connection secrets."""
    try:
        backend = resolve_queue_backend()
        error = None
        ready = True
        if backend == "postgres":
            ready = bool(os.getenv("DATABASE_URL", "").strip())
            if ready:
                try:
                    import psycopg

                    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
                        with conn.cursor() as cur:
                            cur.execute("SELECT 1")
                            cur.fetchone()
                except Exception as exc:  # noqa: BLE001
                    ready = False
                    error = type(exc).__name__
        else:
            store = IngestionQueueStore()
            ready = Path(getattr(store, "path")).parent.exists()
    except Exception as exc:  # noqa: BLE001 - health must stay non-raising
        backend = os.getenv("INGESTION_QUEUE_BACKEND", "").strip().lower() or (
            "postgres" if is_production_environment() else "sqlite"
        )
        if backend.startswith("postgres"):
            backend = "postgres"
        ready = False
        error = type(exc).__name__
    return {
        "backend": backend if backend in {"sqlite", "postgres"} else "unknown",
        "ready": bool(ready),
        "errorCode": error,
        "productionLocked": is_production_environment(),
    }
