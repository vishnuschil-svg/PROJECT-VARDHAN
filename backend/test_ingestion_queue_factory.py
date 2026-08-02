"""Queue factory selects sqlite by default and postgres when configured."""

from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from ingestion.queue.factory import create_ingestion_queue_store, resolve_queue_backend
from ingestion.queue.store import IngestionQueueStore


class QueueFactoryTests(unittest.TestCase):
    def test_default_is_sqlite(self):
        with patch.dict(os.environ, {"INGESTION_QUEUE_BACKEND": "", "APP_ENV": "development"}, clear=False):
            os.environ.pop("INGESTION_QUEUE_BACKEND", None)
            self.assertEqual(resolve_queue_backend(), "sqlite")

    def test_explicit_postgres(self):
        with patch.dict(os.environ, {"INGESTION_QUEUE_BACKEND": "postgres"}, clear=False):
            self.assertEqual(resolve_queue_backend(), "postgres")

    def test_create_sqlite_store(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "q.db"
            with patch.dict(os.environ, {"INGESTION_QUEUE_BACKEND": "sqlite", "INGESTION_QUEUE_PATH": str(path)}):
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
