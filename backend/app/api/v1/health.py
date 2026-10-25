"""Health check endpoint."""

import logging

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
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                f"{settings.ELEXON_BASE_URL}/datasets/FUELHH/stream",
                params={"fuelType": "WIND", "from": "2026-01-01", "to": "2026-01-01", "format": "json"},
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
