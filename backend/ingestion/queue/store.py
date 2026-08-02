"""Durable SQLite job store for ingestion."""

from __future__ import annotations

import json
import os
import sqlite3
import threading
import uuid
from pathlib import Path
from typing import Any

from ingestion.schemas import PARSER_VERSION, SCHEMA_VERSION, utc_now_iso


_LOCK = threading.RLock()


def default_queue_path() -> Path:
    configured = os.getenv("INGESTION_QUEUE_PATH", "").strip()
    if configured:
        return Path(configured)
    return Path(__file__).resolve().parents[1] / "data" / "ingestion_queue.db"


class IngestionQueueStore:
    def __init__(self, path: Path | None = None):
        self.path = path or default_queue_path()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.path), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with _LOCK:
            conn = self._connect()
            try:
                conn.executescript(
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
                      created_at TEXT NOT NULL,
                      updated_at TEXT NOT NULL
                    );
                    CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_batch ON ingestion_jobs(batch_id);
                    CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_hash
                      ON ingestion_jobs(tenant_id, sha256, parser_version, schema_version);
                    CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status ON ingestion_jobs(status);
                    """
                )
                conn.commit()
            finally:
                conn.close()

    def create_job(
        self,
        *,
        tenant_id: str,
        workspace_id: str | None,
        user_id: str | None,
        file_name: str,
        mime_type: str,
        sha256: str,
        byte_size: int,
        batch_id: str | None = None,
        language_hint: str = "UNKNOWN",
        status: str = "UPLOADED",
    ) -> dict[str, Any]:
        job_id = str(uuid.uuid4())
        now = utc_now_iso()
        batch = batch_id or str(uuid.uuid4())
        with _LOCK:
            conn = self._connect()
            try:
                conn.execute(
                    """
                    INSERT INTO ingestion_jobs (
                      id, batch_id, tenant_id, workspace_id, user_id, status,
                      file_name, mime_type, sha256, byte_size, parser_version,
                      schema_version, language_hint, error_code, error_message,
                      draft_json, source_preview, audit_json, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, '[]', ?, ?)
                    """,
                    (
                        job_id,
                        batch,
                        tenant_id,
                        workspace_id,
                        user_id,
                        status,
                        file_name,
                        mime_type,
                        sha256,
                        byte_size,
                        PARSER_VERSION,
                        SCHEMA_VERSION,
                        language_hint,
                        now,
                        now,
                    ),
                )
                conn.commit()
            finally:
                conn.close()
        return self.get_job(job_id)  # type: ignore[return-value]

    def find_duplicate(
        self,
        *,
        tenant_id: str,
        sha256: str,
    ) -> dict[str, Any] | None:
        with _LOCK:
            conn = self._connect()
            try:
                row = conn.execute(
                    """
                    SELECT * FROM ingestion_jobs
                    WHERE tenant_id = ?
                      AND sha256 = ?
                      AND parser_version = ?
                      AND schema_version = ?
                      AND status IN ('NEEDS_REVIEW', 'VALIDATED', 'COMPLETED')
                    ORDER BY created_at DESC
                    LIMIT 1
                    """,
                    (tenant_id, sha256, PARSER_VERSION, SCHEMA_VERSION),
                ).fetchone()
            finally:
                conn.close()
        return self._row_to_dict(row) if row else None

    def get_job(self, job_id: str) -> dict[str, Any] | None:
        with _LOCK:
            conn = self._connect()
            try:
                row = conn.execute(
                    "SELECT * FROM ingestion_jobs WHERE id = ?", (job_id,)
                ).fetchone()
            finally:
                conn.close()
        return self._row_to_dict(row) if row else None

    def list_batch(self, batch_id: str) -> list[dict[str, Any]]:
        with _LOCK:
            conn = self._connect()
            try:
                rows = conn.execute(
                    "SELECT * FROM ingestion_jobs WHERE batch_id = ? ORDER BY created_at ASC",
                    (batch_id,),
                ).fetchall()
            finally:
                conn.close()
        return [self._row_to_dict(row) for row in rows]

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
        assignments = ", ".join(f"{key} = ?" for key in updates)
        values = list(updates.values()) + [job_id]
        with _LOCK:
            conn = self._connect()
            try:
                conn.execute(
                    f"UPDATE ingestion_jobs SET {assignments} WHERE id = ?",
                    values,
                )
                conn.commit()
            finally:
                conn.close()
        return self.get_job(job_id)

    def claim_next(self, statuses: tuple[str, ...] = ("UPLOADED",)) -> dict[str, Any] | None:
        with _LOCK:
            conn = self._connect()
            try:
                placeholders = ",".join("?" for _ in statuses)
                row = conn.execute(
                    f"""
                    SELECT * FROM ingestion_jobs
                    WHERE status IN ({placeholders})
                    ORDER BY created_at ASC
                    LIMIT 1
                    """,
                    statuses,
                ).fetchone()
                if not row:
                    return None
                job_id = row["id"]
                now = utc_now_iso()
                conn.execute(
                    "UPDATE ingestion_jobs SET status = ?, updated_at = ? WHERE id = ? AND status = ?",
                    ("ROUTED", now, job_id, row["status"]),
                )
                conn.commit()
                claimed = conn.execute(
                    "SELECT * FROM ingestion_jobs WHERE id = ?", (job_id,)
                ).fetchone()
            finally:
                conn.close()
        return self._row_to_dict(claimed) if claimed else None

    @staticmethod
    def _row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
        data = dict(row)
        for key in ("draft_json", "audit_json"):
            raw = data.get(key)
            if isinstance(raw, str) and raw:
                try:
                    data[key.replace("_json", "")] = json.loads(raw)
                except json.JSONDecodeError:
                    data[key.replace("_json", "")] = None
            else:
                data[key.replace("_json", "")] = [] if key == "audit_json" else None
        return data


def dumps_draft(draft: Any) -> str:
    if hasattr(draft, "model_dump"):
        return json.dumps(draft.model_dump(), ensure_ascii=False)
    return json.dumps(draft, ensure_ascii=False)
