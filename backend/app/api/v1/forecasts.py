"""Wind forecast endpoint (WINDFOR dataset) – latest snapshot & day-ahead selection."""

import logging
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.schemas.responses import ForecastSnapshotResponse, ForecastRecord
from app.services.elexon_client import elexon_client
from app.services.analytics import (
    select_day_ahead_forecasts,
    get_latest_forecast_snapshot,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _validate_date(value: str, field_name: str) -> str:
    """Validate YYYY-MM-DD format; raises HTTP 422 on failure."""
    try:
        date.fromisoformat(value)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid {field_name} '{value}': must be YYYY-MM-DD format.",
        )
    return value


def _default_from() -> str:
    return (date.today() - timedelta(days=30)).isoformat()


def _default_to() -> str:
    return date.today().isoformat()


@router.get(
    "/forecasts",
    response_model=ForecastSnapshotResponse,
    summary="Get latest wind generation forecast snapshot",
    description=(
        "Returns the most recently published forecast vintage from the "
        "Elexon BMRS WINDFOR dataset. This represents the 'latest available "
        "forecast' that a trader would see before the day-ahead gate closure. "
        "Defaults to the last 30 days if no date range is supplied."
    ),
)
async def get_forecasts(
    from_date: Optional[str] = Query(
        default=None,
        alias="from",
        description="Start date (YYYY-MM-DD). Defaults to 30 days ago.",
    ),
    to_date: Optional[str] = Query(
        default=None,
        alias="to",
        description="End date (YYYY-MM-DD). Defaults to today.",
    ),
):
    from_date = from_date or _default_from()
    to_date = to_date or _default_to()

    _validate_date(from_date, "from")
    _validate_date(to_date, "to")

    # WINDFOR forecasts: clamp to today+1 to capture day-ahead vintages
    today_str = date.today().isoformat()
    if from_date > today_str:
        from_date = today_str
    if to_date > today_str:
        to_date = today_str

    if from_date > to_date:
        raise HTTPException(
            status_code=422,
            detail=f"from ({from_date}) must not be after to ({to_date}).",
        )

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
        "trader would use for procurement decisions. "
        "Defaults to the last 30 days if no date range is supplied."
    ),
)
async def get_day_ahead_forecasts(
    from_date: Optional[str] = Query(default=None, alias="from"),
    to_date: Optional[str] = Query(default=None, alias="to"),
):
    from_date = from_date or _default_from()
    to_date = to_date or _default_to()

    _validate_date(from_date, "from")
    _validate_date(to_date, "to")

    today_str = date.today().isoformat()
    if from_date > today_str:
        from_date = today_str
    if to_date > today_str:
        to_date = today_str

    if from_date > to_date:
        raise HTTPException(
            status_code=422,
            detail=f"from ({from_date}) must not be after to ({to_date}).",
        )

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
