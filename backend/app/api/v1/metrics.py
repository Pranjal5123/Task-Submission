"""Forecast accuracy metrics endpoint."""

import logging
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.schemas.responses import AccuracyMetricsResponse
from app.services.elexon_client import elexon_client
from app.services.analytics import (
    build_actuals_map,
    select_day_ahead_forecasts,
    compute_accuracy_metrics,
    compute_daily_metrics,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _default_from() -> str:
    return (date.today() - timedelta(days=30)).isoformat()


def _default_to() -> str:
    return date.today().isoformat()


@router.get(
    "/metrics",
    response_model=AccuracyMetricsResponse,
    summary="Get forecast accuracy metrics",
    description=(
        "Computes MAE, RMSE, MAPE, and Bias by comparing day-ahead wind "
        "generation forecasts against actual generation readings. "
        "Forecast selection uses gate-closure logic (D-1 11:00 UTC). "
        "Defaults to the last 30 days if no date range is supplied."
    ),
)
async def get_metrics(
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

    try:
        raw_actuals, raw_forecasts = await _fetch_both(from_date, to_date)
    except Exception as exc:
        logger.error("Failed to fetch data for metrics: %s", exc, exc_info=True)
        raise HTTPException(status_code=502, detail=f"Upstream Elexon API error: {exc}")

    actuals_map = build_actuals_map(raw_actuals)
    forecast_map = select_day_ahead_forecasts(raw_forecasts)
    result = compute_accuracy_metrics(actuals_map, forecast_map)
    daily = compute_daily_metrics(result["pairs"])

    return AccuracyMetricsResponse(
        mae=result["mae"],
        rmse=result["rmse"],
        mape=result["mape"],
        bias=result["bias"],
        nPairs=result["nPairs"],
        fromDate=from_date,
        toDate=to_date,
        pairs=result["pairs"],
        dailyMetrics=daily,
    )


async def _fetch_both(from_date: str, to_date: str):
    """Fetch actuals and forecasts concurrently."""
    import asyncio
    actuals_task = asyncio.create_task(
        elexon_client.get_wind_actuals(from_date, to_date)
    )
    forecasts_task = asyncio.create_task(
        elexon_client.get_wind_forecasts(from_date, to_date)
    )
    return await asyncio.gather(actuals_task, forecasts_task)
