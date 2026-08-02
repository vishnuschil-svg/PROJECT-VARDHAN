"""Queue store factory — SQLite for local, Postgres for production."""

from __future__ import annotations

import os
from typing import Any

from ingestion.queue.store import IngestionQueueStore


def resolve_queue_backend() -> str:
    configured = os.getenv("INGESTION_QUEUE_BACKEND", "").strip().lower()
    if configured in {"sqlite", "postgres", "postgresql"}:
        return "postgres" if configured.startswith("postgres") else "sqlite"
    # Safe default: postgres when DATABASE_URL present and APP_ENV/production
    app_env = os.getenv("APP_ENV", os.getenv("ENVIRONMENT", "development")).lower()
    if app_env in {"production", "prod"} and os.getenv("DATABASE_URL"):
        return "postgres"
    return "sqlite"


def create_ingestion_queue_store() -> Any:
    backend = resolve_queue_backend()
    if backend == "postgres":
        from ingestion.queue.postgres_store import PostgresIngestionQueueStore

        return PostgresIngestionQueueStore()
    return IngestionQueueStore()
