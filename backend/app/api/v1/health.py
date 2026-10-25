"""Health check endpoint."""

import logging
from datetime import date, timedelta

import httpx
from fastapi import APIRouter

from app.core.config import settings
from app.schemas.responses import HealthResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health", response_model=HealthResponse, summary="API health check")
async def health_check():
    """Returns API liveness status and Elexon API reachability."""
    reachable = False
    # Use yesterday as a minimal probe — no hardcoded dates
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            # NOTE: Do NOT pass fuelType here — /datasets/FUELHH rejects it
            # with HTTP 400. Filter to WIND is done in application code.
            resp = await client.get(
                f"{settings.ELEXON_BASE_URL}/datasets/FUELHH",
                params={
                    "settlementDateFrom": yesterday,
                    "settlementDateTo": yesterday,
                    "format": "json",
                },
            )
            reachable = resp.status_code == 200
    except Exception as exc:
        logger.warning("Elexon reachability check failed: %s", exc)

    return HealthResponse(
        status="ok",
        version="1.0.0",
        elexonApiReachable=reachable,
        message="Wind Power Intelligence Platform is running.",
    )
