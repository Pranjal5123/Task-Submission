"""In-memory cache manager with TTL support."""

import asyncio
import logging
import time
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger(__name__)


class CacheManager:
    """Thread-safe in-memory cache with TTL expiry."""

    def __init__(self) -> None:
        self._store: Dict[str, Tuple[Any, float]] = {}
        self._lock = asyncio.Lock()
        self._default_ttl: int = 300

    async def initialize(self) -> None:
        logger.info("In-memory cache initialized.")

    async def close(self) -> None:
        self._store.clear()
        logger.info("Cache cleared on shutdown.")

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, expires_at = entry
            if time.monotonic() > expires_at:
                del self._store[key]
                return None
            return value

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        ttl = ttl or self._default_ttl
        async with self._lock:
            self._store[key] = (value, time.monotonic() + ttl)

    async def delete(self, key: str) -> None:
        async with self._lock:
            self._store.pop(key, None)

    async def clear_prefix(self, prefix: str) -> int:
        async with self._lock:
            keys = [k for k in self._store if k.startswith(prefix)]
            for k in keys:
                del self._store[k]
            return len(keys)


cache_manager = CacheManager()
