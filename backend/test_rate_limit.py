import unittest

from rate_limit import GatewayRateLimitAdapter, LocalMemoryRateLimitAdapter


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


if __name__ == "__main__":
    unittest.main()
