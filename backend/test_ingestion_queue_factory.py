"""Queue factory selects sqlite by default and postgres when configured."""

from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from ingestion.queue.factory import (
    IngestionQueueConfigurationError,
    create_ingestion_queue_store,
    resolve_queue_backend,
)
from ingestion.queue.store import IngestionQueueStore


class QueueFactoryTests(unittest.TestCase):
    def test_default_is_sqlite(self):
        env = {"APP_ENV": "development", "ENVIRONMENT": "development"}
        with patch.dict(os.environ, env, clear=False):
            os.environ.pop("INGESTION_QUEUE_BACKEND", None)
            self.assertEqual(resolve_queue_backend(), "sqlite")

    def test_explicit_postgres_requires_database_url(self):
        with patch.dict(
            os.environ,
            {"INGESTION_QUEUE_BACKEND": "postgres", "APP_ENV": "development", "DATABASE_URL": ""},
            clear=False,
        ):
            os.environ["DATABASE_URL"] = ""
            with self.assertRaises(IngestionQueueConfigurationError):
                resolve_queue_backend()

    def test_production_forbids_sqlite(self):
        with patch.dict(
            os.environ,
            {
                "APP_ENV": "production",
                "INGESTION_QUEUE_BACKEND": "sqlite",
                "DATABASE_URL": "postgresql://example.invalid/postgres",
            },
            clear=False,
        ):
            with self.assertRaises(IngestionQueueConfigurationError):
                resolve_queue_backend()

    def test_production_without_database_url_fails(self):
        with patch.dict(
            os.environ,
            {"APP_ENV": "production", "INGESTION_QUEUE_BACKEND": "postgres", "DATABASE_URL": ""},
            clear=False,
        ):
            os.environ["DATABASE_URL"] = ""
            with self.assertRaises(IngestionQueueConfigurationError):
                resolve_queue_backend()

    def test_create_sqlite_store(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "q.db"
            with patch.dict(
                os.environ,
                {
                    "INGESTION_QUEUE_BACKEND": "sqlite",
                    "INGESTION_QUEUE_PATH": str(path),
                    "APP_ENV": "development",
                },
            ):
                store = create_ingestion_queue_store()
                self.assertIsInstance(store, IngestionQueueStore)
                job = store.create_job(
                    tenant_id="t1",
                    workspace_id="w1",
                    user_id="u1",
                    file_name="a.csv",
                    mime_type="text/csv",
                    sha256="abc",
                    byte_size=3,
                )
                self.assertEqual(job["status"], "UPLOADED")


if __name__ == "__main__":
    unittest.main()
