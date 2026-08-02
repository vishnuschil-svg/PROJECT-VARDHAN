"""Postgres-backed durable ingestion queue for production.

Uses DATABASE_URL (server-side only). Schema is created idempotently.
Keeps the same method surface as IngestionQueueStore.
"""

from __future__ import annotations

import json
import os
import uuid
from typing import Any
from urllib.parse import urlparse, unquote

from ingestion.schemas import PARSER_VERSION, SCHEMA_VERSION, utc_now_iso


class PostgresIngestionQueueStore:
    def __init__(self, database_url: str | None = None):
        self.database_url = database_url or os.getenv("DATABASE_URL", "").strip()
        if not self.database_url:
            raise RuntimeError("DATABASE_URL is required for Postgres ingestion queue.")
        self._init_db()

    def _connect(self):
        try:
            import psycopg
        except ImportError as exc:
            raise RuntimeError(
                "psycopg is required for Postgres ingestion queue. Install psycopg[binary]."
            ) from exc
        return psycopg.connect(self.database_url)

    def _init_db(self) -> None:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS ingestion_jobs (
                      id TEXT PRIMARY KEY,
                      batch_id TEXT,
                      tenant_id TEXT NOT NULL,
                      workspace_id TEXT,
                      user_id TEXT,
                      status TEXT NOT NULL,
                      file_name TEXT NOT NULL,
                      mime_type TEXT NOT NULL,
                      sha256 TEXT NOT NULL,
                      byte_size INTEGER NOT NULL,
                      parser_version TEXT NOT NULL,
                      schema_version TEXT NOT NULL,
                      language_hint TEXT,
                      error_code TEXT,
                      error_message TEXT,
                      draft_json TEXT,
                      source_preview TEXT,
                      audit_json TEXT,
                      created_at TIMESTAMPTZ NOT NULL,
                      updated_at TIMESTAMPTZ NOT NULL
                    );
                    CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_batch ON ingestion_jobs(batch_id);
                    CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_hash
                      ON ingestion_jobs(tenant_id, sha256, parser_version, schema_version);
                    CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status ON ingestion_jobs(status);
                    """
                )
            conn.commit()

    def create_job(self, **kwargs: Any) -> dict[str, Any]:
        job_id = str(uuid.uuid4())
        now = utc_now_iso()
        batch = kwargs.get("batch_id") or str(uuid.uuid4())
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO ingestion_jobs (
                      id, batch_id, tenant_id, workspace_id, user_id, status,
                      file_name, mime_type, sha256, byte_size, parser_version,
                      schema_version, language_hint, error_code, error_message,
                      draft_json, source_preview, audit_json, created_at, updated_at
                    ) VALUES (
                      %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NULL,NULL,NULL,NULL,'[]',%s,%s
                    )
                    """,
                    (
                        job_id,
                        batch,
                        kwargs["tenant_id"],
                        kwargs.get("workspace_id"),
                        kwargs.get("user_id"),
                        kwargs.get("status", "UPLOADED"),
                        kwargs["file_name"],
                        kwargs["mime_type"],
                        kwargs["sha256"],
                        kwargs["byte_size"],
                        PARSER_VERSION,
                        SCHEMA_VERSION,
                        kwargs.get("language_hint", "UNKNOWN"),
                        now,
                        now,
                    ),
                )
            conn.commit()
        return self.get_job(job_id)  # type: ignore[return-value]

    def find_duplicate(self, *, tenant_id: str, sha256: str) -> dict[str, Any] | None:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT * FROM ingestion_jobs
                    WHERE tenant_id = %s
                      AND sha256 = %s
                      AND parser_version = %s
                      AND schema_version = %s
                      AND status IN ('NEEDS_REVIEW', 'VALIDATED', 'COMPLETED')
                    ORDER BY created_at DESC
                    LIMIT 1
                    """,
                    (tenant_id, sha256, PARSER_VERSION, SCHEMA_VERSION),
                )
                row = cur.fetchone()
                if not row:
                    return None
                cols = [desc.name for desc in cur.description]
        return self._row_to_dict(cols, row)

    def get_job(self, job_id: str) -> dict[str, Any] | None:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM ingestion_jobs WHERE id = %s", (job_id,))
                row = cur.fetchone()
                if not row:
                    return None
                cols = [desc.name for desc in cur.description]
        return self._row_to_dict(cols, row)

    def list_batch(self, batch_id: str) -> list[dict[str, Any]]:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM ingestion_jobs WHERE batch_id = %s ORDER BY created_at ASC",
                    (batch_id,),
                )
                rows = cur.fetchall()
                cols = [desc.name for desc in cur.description]
        return [self._row_to_dict(cols, row) for row in rows]

    def update_job(self, job_id: str, **fields: Any) -> dict[str, Any] | None:
        allowed = {
            "status",
            "error_code",
            "error_message",
            "draft_json",
            "source_preview",
            "audit_json",
            "mime_type",
        }
        updates = {key: value for key, value in fields.items() if key in allowed}
        if not updates:
            return self.get_job(job_id)
        updates["updated_at"] = utc_now_iso()
        assignments = ", ".join(f"{key} = %s" for key in updates)
        values = list(updates.values()) + [job_id]
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"UPDATE ingestion_jobs SET {assignments} WHERE id = %s",
                    values,
                )
            conn.commit()
        return self.get_job(job_id)

    def claim_next(self, statuses: tuple[str, ...] = ("UPLOADED",)) -> dict[str, Any] | None:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT * FROM ingestion_jobs
                    WHERE status = ANY(%s)
                    ORDER BY created_at ASC
                    LIMIT 1
                    FOR UPDATE SKIP LOCKED
                    """,
                    (list(statuses),),
                )
                row = cur.fetchone()
                if not row:
                    conn.commit()
                    return None
                cols = [desc.name for desc in cur.description]
                job = self._row_to_dict(cols, row)
                now = utc_now_iso()
                cur.execute(
                    "UPDATE ingestion_jobs SET status = %s, updated_at = %s WHERE id = %s",
                    ("ROUTED", now, job["id"]),
                )
            conn.commit()
        return self.get_job(job["id"])

    @staticmethod
    def _row_to_dict(cols: list[str], row: Any) -> dict[str, Any]:
        data = {cols[i]: row[i] for i in range(len(cols))}
        for key in ("draft_json", "audit_json"):
            raw = data.get(key)
            if isinstance(raw, str) and raw:
                try:
                    data[key.replace("_json", "")] = json.loads(raw)
                except json.JSONDecodeError:
                    data[key.replace("_json", "")] = None
            else:
                data[key.replace("_json", "")] = [] if key == "audit_json" else None
            # normalize timestamps to iso strings
        for key in ("created_at", "updated_at"):
            if data.get(key) is not None:
                data[key] = str(data[key])
        return data
