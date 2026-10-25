"""Actual wind generation endpoint (FUELHH dataset)."""

import logging
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.schemas.responses import ActualsResponse, ActualRecord
from app.services.elexon_client import elexon_client

logger = logging.getLogger(__name__)
router = APIRouter()


def _default_from() -> str:
    """30 days ago as YYYY-MM-DD — computed fresh per request."""
    return (date.today() - timedelta(days=30)).isoformat()


def _default_to() -> str:
    """Today as YYYY-MM-DD — computed fresh per request."""
    return date.today().isoformat()


@router.get(
    "/actuals",
    response_model=ActualsResponse,
    summary="Get actual wind generation",
    description=(
        "Returns half-hourly (30-min) actual wind generation data from the "
        "Elexon BMRS FUELHH dataset filtered to WIND fuel type. "
        "Defaults to the last 30 days if no date range is supplied."
    ),
)
async def get_actuals(
    from_date: Optional[str] = Query(
        default=None,
        alias="from",
        description="Start date (YYYY-MM-DD). Defaults to 30 days ago.",
        examples=["YYYY-MM-DD"],
    ),
    to_date: Optional[str] = Query(
        default=None,
        alias="to",
        description="End date (YYYY-MM-DD). Defaults to today.",
        examples=["YYYY-MM-DD"],
    ),
):
    # Apply dynamic defaults if caller omits dates
    from_date = from_date or _default_from()
    to_date = to_date or _default_to()

    try:
        raw = await elexon_client.get_wind_actuals(from_date, to_date)
    except Exception as exc:
        logger.error("Failed to fetch actuals: %s", exc, exc_info=True)
        raise HTTPException(status_code=502, detail=f"Upstream Elexon API error: {exc}")

    records = []
    for r in raw:
        try:
            records.append(
                ActualRecord(
                    startTime=r["startTime"],
                    settlementDate=r.get("settlementDate", ""),
                    settlementPeriod=r.get("settlementPeriod", 0),
                    generation=float(r["generation"]),
                    publishTime=r.get("publishTime", ""),
                )
            )
        except (KeyError, ValueError) as e:
            logger.warning("Skipping malformed actuals record: %s — %s", r, e)

    # Sort by startTime ascending
    records.sort(key=lambda x: x.startTime)

    return ActualsResponse(
        count=len(records),
        fromDate=from_date,
        toDate=to_date,
        data=records,
    )
