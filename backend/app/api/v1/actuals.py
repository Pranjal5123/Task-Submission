"""Actual wind generation endpoint (FUELHH dataset)."""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings
from app.schemas.responses import ActualsResponse, ActualRecord
from app.services.elexon_client import elexon_client

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "/actuals",
    response_model=ActualsResponse,
    summary="Get actual wind generation",
    description=(
        "Returns half-hourly (30-min) actual wind generation data from the "
        "Elexon BMRS FUELHH dataset filtered to WIND fuel type. "
        "Defaults to January 2026."
    ),
)
async def get_actuals(
    from_date: Optional[str] = Query(
        default=settings.DATA_START_DATE,
        alias="from",
        description="Start date (YYYY-MM-DD). Inclusive.",
        examples=["2026-01-01"],
    ),
    to_date: Optional[str] = Query(
        default=settings.DATA_END_DATE,
        alias="to",
        description="End date (YYYY-MM-DD). Inclusive.",
        examples=["2026-01-31"],
    ),
):
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
