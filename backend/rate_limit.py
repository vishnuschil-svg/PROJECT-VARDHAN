from __future__ import annotations

import asyncio
import os
import secrets
import time
from dataclasses import dataclass
from typing import Mapping, Protocol


@dataclass(frozen=True)
class RateLimitDecision:
    allowed: bool
    limit: int
    remaining: int
    retry_after: int
    backend: str


class RateLimitAdapter(Protocol):
    async def check(self, key: str, limit: int, window_seconds: int, headers: Mapping[str, str] | None = None) -> RateLimitDecision: ...
    async def close(self) -> None: ...


class LocalMemoryRateLimitAdapter:
    """Concurrency-safe development fallback. Never selected implicitly in production."""

    def __init__(self) -> None:
        self._buckets: dict[str, list[float]] = {}
        self._lock = asyncio.Lock()

    async def check(self, key: str, limit: int, window_seconds: int, headers: Mapping[str, str] | None = None) -> RateLimitDecision:
        del headers
        now = time.monotonic()
        async with self._lock:
            bucket = self._buckets.setdefault(key, [])
            cutoff = now - window_seconds
            bucket[:] = [seen_at for seen_at in bucket if seen_at > cutoff]
            allowed = len(bucket) < limit
            if allowed:
                bucket.append(now)
            retry_after = max(1, int(window_seconds - (now - bucket[0]))) if bucket else window_seconds
            return RateLimitDecision(allowed, limit, max(0, limit - len(bucket)), retry_after, "local-memory")

    async def close(self) -> None:
        self._buckets.clear()


class RedisRateLimitAdapter:
    """Atomic fixed-window limiter shared by every API instance."""

    SCRIPT = """
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('TTL', KEYS[1])
return {count, ttl}
"""

    def __init__(self, redis_url: str, prefix: str = "vardhan:rate-limit") -> None:
        if not redis_url:
            raise RuntimeError("REDIS_URL is required for the Redis rate-limit backend")
        try:
            from redis.asyncio import from_url
        except ImportError as exc:
            raise RuntimeError("Install the redis package to use RATE_LIMIT_BACKEND=redis") from exc
        self._client = from_url(redis_url, encoding="utf-8", decode_responses=True)
        self._prefix = prefix

    async def check(self, key: str, limit: int, window_seconds: int, headers: Mapping[str, str] | None = None) -> RateLimitDecision:
        del headers
        window = int(time.time()) // window_seconds
        redis_key = f"{self._prefix}:{window}:{key}"
        count, ttl = await self._client.eval(self.SCRIPT, 1, redis_key, window_seconds)
        count = int(count)
        return RateLimitDecision(count <= limit, limit, max(0, limit - count), max(1, int(ttl)), "redis")

    async def close(self) -> None:
        await self._client.aclose()


class GatewayRateLimitAdapter:
    """Delegates enforcement to a trusted API gateway or edge platform."""

    def __init__(self, gateway_token: str) -> None:
        if not gateway_token:
            raise RuntimeError("RATE_LIMIT_GATEWAY_TOKEN is required for the gateway rate-limit backend")
        self._gateway_token = gateway_token

    async def check(self, key: str, limit: int, window_seconds: int, headers: Mapping[str, str] | None = None) -> RateLimitDecision:
        del key, window_seconds
        safe_headers = headers or {}
        supplied_token = safe_headers.get("x-vardhan-gateway-token", "")
        if not secrets.compare_digest(supplied_token, self._gateway_token):
            return RateLimitDecision(False, limit, 0, 1, "gateway-untrusted")
        allowed = safe_headers.get("x-vardhan-rate-limit-allowed", "true").lower() != "false"
        remaining = int(safe_headers.get("x-ratelimit-remaining", limit))
        retry_after = int(safe_headers.get("retry-after", "1"))
        return RateLimitDecision(allowed, limit, max(0, remaining), max(1, retry_after), "gateway")

    async def close(self) -> None:
        return None


def create_rate_limit_adapter() -> RateLimitAdapter:
    backend = os.getenv("RATE_LIMIT_BACKEND", "local").strip().lower()
    environment = os.getenv("VARDHAN_ENV", os.getenv("ENVIRONMENT", "development")).strip().lower()
    if backend == "redis":
        return RedisRateLimitAdapter(os.getenv("REDIS_URL", ""), os.getenv("RATE_LIMIT_REDIS_PREFIX", "vardhan:rate-limit"))
    if backend == "gateway":
        return GatewayRateLimitAdapter(os.getenv("RATE_LIMIT_GATEWAY_TOKEN", ""))
    if backend == "local" and environment not in {"production", "prod"}:
        return LocalMemoryRateLimitAdapter()
    raise RuntimeError("Production requires RATE_LIMIT_BACKEND=redis or RATE_LIMIT_BACKEND=gateway")
