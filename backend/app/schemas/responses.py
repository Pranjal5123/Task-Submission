"""Pydantic response schemas."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Shared
# ---------------------------------------------------------------------------

class PairRecord(BaseModel):
    startTime: str
    actual: float
    forecast: float
    error: float
    absoluteError: float
    percentageError: Optional[float]
    publishTime: str
    leadHours: float


class DailyMetric(BaseModel):
    date: str
    mae: float
    rmse: float
    mape: Optional[float]
    bias: float
    nPeriods: int


# ---------------------------------------------------------------------------
# Actuals
# ---------------------------------------------------------------------------

class ActualRecord(BaseModel):
    startTime: str
    settlementDate: str
    settlementPeriod: int
    generation: float
    publishTime: str


class ActualsResponse(BaseModel):
    count: int
    fromDate: str
    toDate: str
    data: List[ActualRecord]


# ---------------------------------------------------------------------------
# Forecasts
# ---------------------------------------------------------------------------

class ForecastRecord(BaseModel):
    startTime: str
    generation: float
    publishTime: str


class ForecastSnapshotResponse(BaseModel):
    publishTime: Optional[str]
    count: int
    fromDate: str
    toDate: str
    data: List[ForecastRecord]


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------

class AccuracyMetricsResponse(BaseModel):
    mae: Optional[float]
    rmse: Optional[float]
    mape: Optional[float]
    bias: Optional[float]
    nPairs: int
    fromDate: str
    toDate: str
    pairs: List[PairRecord]
    dailyMetrics: List[DailyMetric]


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    version: str
    elexonApiReachable: bool
    message: str
