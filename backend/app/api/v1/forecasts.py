"""Wind forecast endpoint (WINDFOR dataset) – latest snapshot & day-ahead selection."""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings
from app.schemas.responses import ForecastSnapshotResponse, ForecastRecord
from app.services.elexon_client import elexon_client
from app.services.analytics import (
    select_day_ahead_forecasts,
    get_latest_forecast_snapshot,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "/forecasts",
    response_model=ForecastSnapshotResponse,
    summary="Get latest wind generation forecast snapshot",
    description=(
        "Returns the most recently published forecast vintage from the "
        "Elexon BMRS WINDFOR dataset. This represents the 'latest available "
        "forecast' that a trader would see before the day-ahead gate closure. "
        "Defaults to January 2026."
    ),
)
async def get_forecasts(
    from_date: Optional[str] = Query(
        default=settings.DATA_START_DATE,
        alias="from",
        description="Start date (YYYY-MM-DD).",
        example="2026-01-01",
    ),
    to_date: Optional[str] = Query(
        default=settings.DATA_END_DATE,
        alias="to",
        description="End date (YYYY-MM-DD).",
        example="2026-01-31",
    ),
):
    try:
        raw = await elexon_client.get_wind_forecasts(from_date, to_date)
    except Exception as exc:
        logger.error("Failed to fetch forecasts: %s", exc, exc_info=True)
        raise HTTPException(status_code=502, detail=f"Upstream Elexon API error: {exc}")

    publish_time, snapshot = get_latest_forecast_snapshot(raw)

    records = [
        ForecastRecord(
            startTime=r["startTime"],
            generation=float(r["generation"]),
            publishTime=r["publishTime"],
        )
        for r in snapshot
    ]

    return ForecastSnapshotResponse(
        publishTime=publish_time,
        count=len(records),
        fromDate=from_date,
        toDate=to_date,
        data=records,
    )


@router.get(
    "/forecasts/day-ahead",
    summary="Get day-ahead selected forecasts (gate-closure aware)",
    description=(
        "For each delivery half-hour, returns the most recent forecast "
        "published before gate closure (D-1 11:00 UTC) — exactly what a "
        "trader would use for procurement decisions."
    ),
)
async def get_day_ahead_forecasts(
    from_date: Optional[str] = Query(
        default=settings.DATA_START_DATE,
        alias="from",
    ),
    to_date: Optional[str] = Query(
        default=settings.DATA_END_DATE,
        alias="to",
    ),
):
    try:
        raw = await elexon_client.get_wind_forecasts(from_date, to_date)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    forecast_map = select_day_ahead_forecasts(raw)
    records = sorted(
        [
            {
                "startTime": k,
                "generation": v["generation"],
                "publishTime": v["publishTime"],
                "leadHours": v["leadHours"],
            }
            for k, v in forecast_map.items()
        ],
        key=lambda x: x["startTime"],
    )
    return {"count": len(records), "fromDate": from_date, "toDate": to_date, "data": records}
