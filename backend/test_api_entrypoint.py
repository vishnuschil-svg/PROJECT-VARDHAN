"""Production serverless entry-point route contract."""

from __future__ import annotations

import unittest

from api.index import app


class ProductionEntrypointTests(unittest.TestCase):
    def test_api_routes_are_not_double_prefixed(self) -> None:
        paths = app.openapi()["paths"]

        self.assertIn("/api/health", paths)
        self.assertEqual(set(paths["/api/health"]), {"get"})
        self.assertIn("/api/v1/ocr/extract", paths)
        self.assertEqual(set(paths["/api/v1/ocr/extract"]), {"post"})
        self.assertNotIn("/api/api/v1/ocr/extract", paths)


if __name__ == "__main__":
    unittest.main()
