"""
Wind Power Intelligence Platform - FastAPI Backend
Provides endpoints for actual & forecast wind generation data from Elexon BMRS,
along with forecast accuracy metrics for UK day-ahead market decision-making.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import actuals, forecasts, metrics, health
from app.core.config import settings
from app.core.cache import cache_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    logger.info("Starting Wind Power Intelligence Platform API...")
    await cache_manager.initialize()
    logger.info("Cache manager initialized.")
    yield
    logger.info("Shutting down...")
    await cache_manager.close()


app = FastAPI(
    title="Wind Power Intelligence Platform",
    description=(
        "API for UK wind power actuals vs forecasts analytics. "
        "Data sourced from Elexon BMRS (FUELHH & WINDFOR datasets). "
        "Designed for day-ahead market procurement decisions."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ---------------------------------------------------------------------------
# CORS – allow the Vite dev server and the deployed Vercel frontend
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(actuals.router, prefix="/api/v1", tags=["Actuals"])
app.include_router(forecasts.router, prefix="/api/v1", tags=["Forecasts"])
app.include_router(metrics.router, prefix="/api/v1", tags=["Metrics"])


@app.get("/", include_in_schema=False)
async def root():
    return {
        "service": "Wind Power Intelligence Platform",
        "version": "1.0.0",
        "docs": "/api/docs",
    }
