import os
import unittest
from unittest import mock

from rate_limit import (
    GatewayRateLimitAdapter,
    LocalMemoryRateLimitAdapter,
    normalize_redis_url,
    resolve_redis_url,
)


class RateLimitAdapterTests(unittest.IsolatedAsyncioTestCase):
    async def test_local_fallback_enforces_limit(self):
        adapter = LocalMemoryRateLimitAdapter()
        self.assertTrue((await adapter.check("client", 2, 60)).allowed)
        self.assertTrue((await adapter.check("client", 2, 60)).allowed)
        decision = await adapter.check("client", 2, 60)
        self.assertFalse(decision.allowed)
        self.assertEqual(decision.backend, "local-memory")

    async def test_gateway_requires_trusted_token_and_honors_edge_decision(self):
        adapter = GatewayRateLimitAdapter("gateway-secret")
        untrusted = await adapter.check("client", 100, 60, {})
        self.assertFalse(untrusted.allowed)
        trusted = await adapter.check("client", 100, 60, {
            "x-vardhan-gateway-token": "gateway-secret",
            "x-vardhan-rate-limit-allowed": "false",
            "retry-after": "12",
        })
        self.assertFalse(trusted.allowed)
        self.assertEqual(trusted.retry_after, 12)

    def test_normalize_redis_url_rejects_invalid_schemes(self):
        with self.assertRaisesRegex(RuntimeError, "redis://, rediss://, or unix://"):
            normalize_redis_url("https://example.upstash.io")
        with self.assertRaisesRegex(RuntimeError, "REDIS_URL is required"):
            normalize_redis_url("   ")

    def test_resolve_redis_url_accepts_marketplace_prefixed_fallback(self):
        with mock.patch.dict(os.environ, {"REDIS_URL": "", "REDIS_URL_REDIS_URL": "rediss://example.internal:6379"}, clear=False):
            self.assertEqual(resolve_redis_url(), "rediss://example.internal:6379")


if __name__ == "__main__":
    unittest.main()
