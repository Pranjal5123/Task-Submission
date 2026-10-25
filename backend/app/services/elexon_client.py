"""Elexon BMRS API client with retry logic and caching."""

import logging
from typing import Any, Dict, List, Optional

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.config import settings
from app.core.cache import cache_manager

logger = logging.getLogger(__name__)


class ElexonClient:
    """Async client for the Elexon BMRS data API."""

    BASE_URL = settings.ELEXON_BASE_URL

    def __init__(self) -> None:
        self._client: Optional[httpx.AsyncClient] = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=settings.HTTP_TIMEOUT,
                headers={
                    "Accept": "application/json",
                    "User-Agent": "WindPowerIntelligencePlatform/1.0",
                },
            )
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    @retry(
        retry=retry_if_exception_type((httpx.HTTPError, httpx.TimeoutException)),
        stop=stop_after_attempt(settings.HTTP_MAX_RETRIES),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    async def _get(self, path: str, params: Dict[str, Any]) -> Any:
        url = f"{self.BASE_URL}{path}"
        params["format"] = "json"
        logger.info("GET %s params=%s", url, params)
        response = await self._get_client().get(url, params=params)
        response.raise_for_status()
        return response.json()

    async def get_wind_actuals(
        self, from_date: str, to_date: str
    ) -> List[Dict[str, Any]]:
        """Fetch actual wind generation half-hourly data (FUELHH)."""
        cache_key = f"actuals:{from_date}:{to_date}"
        cached = await cache_manager.get(cache_key)
        if cached is not None:
            logger.debug("Cache HIT for %s", cache_key)
            return cached

        data = await self._get(
            "/datasets/FUELHH/stream",
            {"fuelType": "WIND", "from": from_date, "to": to_date},
        )
        # Normalise: keep only WIND records (API should filter but be defensive)
        records = [r for r in data if r.get("fuelType", "").upper() == "WIND"]
        await cache_manager.set(cache_key, records, ttl=settings.CACHE_TTL_SECONDS)
        return records

    async def get_wind_forecasts(
        self, from_date: str, to_date: str
    ) -> List[Dict[str, Any]]:
        """Fetch wind generation forecasts (WINDFOR).

        The WINDFOR dataset contains multiple forecast vintages (publishTime)
        for each target startTime. We return all records so the caller can
        select the appropriate day-ahead vintage.
        """
        cache_key = f"forecasts:{from_date}:{to_date}"
        cached = await cache_manager.get(cache_key)
        if cached is not None:
            logger.debug("Cache HIT for %s", cache_key)
            return cached

        data = await self._get(
            "/datasets/WINDFOR/stream",
            {"from": from_date, "to": to_date},
        )
        await cache_manager.set(cache_key, data, ttl=settings.CACHE_TTL_SECONDS)
        return data


# Singleton instance reused across requests
elexon_client = ElexonClient()
