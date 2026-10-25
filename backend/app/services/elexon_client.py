"""Elexon BMRS API client with retry logic and caching.

Correct parameter names (confirmed against live API):
  FUELHH  : settlementDateFrom / settlementDateTo
  WINDFOR : publishDateTimeFrom / publishDateTimeTo  (stream endpoint)

Using the wrong names (`from` / `to`) causes the API to silently ignore the
filter and return the most recently available data instead.
"""

import logging
from datetime import date, timedelta
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
    # async def _get(self, path: str, params: Dict[str, Any]) -> Any:
    #     url = f"{self.BASE_URL}{path}"
    #     params["format"] = "json"
    #     logger.info("GET %s params=%s", url, params)
    #     response = await self._get_client().get(url, params=params)
    #     response.raise_for_status()
    #     return response.json()



    
    async def _get(self, path: str, params: Dict[str, Any]) -> Any:
        url = f"{self.BASE_URL}{path}"
        params["format"] = "json"

        logger.info("GET %s params=%s", url, params)

        response = await self._get_client().get(url, params=params)

        if response.is_error:
            logger.error(
                "Elexon API error: status=%s url=%s response=%s",
                response.status_code,
                response.url,
                response.text[:2000],
            )

        response.raise_for_status()
        return response.json()


    async def get_wind_actuals(
        self, from_date: str, to_date: str
    ) -> List[Dict[str, Any]]:
        """Fetch actual wind generation half-hourly data (FUELHH).

        Correct Elexon API parameters:
          settlementDateFrom / settlementDateTo  (YYYY-MM-DD)
        """
        cache_key = f"actuals:{from_date}:{to_date}"
        cached = await cache_manager.get(cache_key)
        if cached is not None:
            logger.debug("Cache HIT for %s", cache_key)
            return cached

        data = await self._get(
            "/datasets/FUELHH",
            {
                "settlementDateFrom": from_date,
                "settlementDateTo": to_date,
                "fuelType": "WIND",
            },
        )

        # The non-stream endpoint wraps records in a `data` key
        records_raw = data if isinstance(data, list) else data.get("data", [])

        # Defensive: keep only WIND records and normalise field names
        records = []
        for r in records_raw:
            if r.get("fuelType", "").upper() != "WIND":
                continue
            # Ensure startTime is present (derive from settlementDate + period if missing)
            if "startTime" not in r and "settlementDate" in r:
                period = r.get("settlementPeriod", 1)
                minutes = (period - 1) * 30
                sd = r["settlementDate"]
                r["startTime"] = f"{sd}T{minutes // 60:02d}:{minutes % 60:02d}:00Z"
            records.append(r)

        await cache_manager.set(cache_key, records, ttl=settings.CACHE_TTL_SECONDS)
        return records

    async def get_wind_forecasts(
        self, from_date: str, to_date: str
    ) -> List[Dict[str, Any]]:
        """Fetch wind generation forecasts (WINDFOR) for a delivery date range.

        Strategy: the WINDFOR /stream endpoint filters by *publishDateTime*.
        To retrieve all forecast vintages whose *delivery period* (startTime)
        falls within [from_date, to_date] we set:
          publishDateTimeFrom = from_date - 2 days (gives pre-gate-closure forecasts)
          publishDateTimeTo   = to_date   + 1 day  (inclusive upper bound)

        We then filter server-side to keep only records whose startTime falls
        within the requested delivery window.

        The WINDFOR dataset contains multiple forecast vintages (publishTime)
        for each target startTime. We return all records so the caller can
        select the appropriate day-ahead vintage.
        """
        cache_key = f"forecasts:{from_date}:{to_date}"
        cached = await cache_manager.get(cache_key)
        if cached is not None:
            logger.debug("Cache HIT for %s", cache_key)
            return cached

        # Expand the publish window to cover pre-gate-closure vintages
        pub_from = (
            date.fromisoformat(from_date) - timedelta(days=2)
        ).isoformat() + "T00:00:00Z"
        pub_to = (
            date.fromisoformat(to_date) + timedelta(days=1)
        ).isoformat() + "T23:59:59Z"

        data = await self._get(
            "/datasets/WINDFOR/stream",
            {
                "publishDateTimeFrom": pub_from,
                "publishDateTimeTo": pub_to,
            },
        )

        records_raw = data if isinstance(data, list) else data.get("data", [])

        # Filter: keep only records whose delivery period (startTime) is within
        # the requested from_date .. to_date window (inclusive).
        from_prefix = from_date        # "YYYY-MM-DD" — startTime starts with this
        to_prefix   = to_date          # "YYYY-MM-DD"
        records = [
            r for r in records_raw
            if r.get("startTime") and from_prefix <= r["startTime"][:10] <= to_prefix
        ]

        logger.info(
            "WINDFOR: raw=%d, filtered_to_delivery_window=%d (from=%s to=%s)",
            len(records_raw), len(records), from_date, to_date,
        )

        await cache_manager.set(cache_key, records, ttl=settings.CACHE_TTL_SECONDS)
        return records


# Singleton instance reused across requests
elexon_client = ElexonClient()
