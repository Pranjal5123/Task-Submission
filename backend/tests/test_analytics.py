"""Tests for analytics service."""

import pytest
from app.services.analytics import (
    build_actuals_map,
    select_day_ahead_forecasts,
    compute_accuracy_metrics,
    compute_daily_metrics,
)

ACTUALS = [
    {"startTime": "2026-01-02T00:00:00+00:00", "generation": 5000},
    {"startTime": "2026-01-02T00:30:00+00:00", "generation": 5200},
]

FORECASTS = [
    # Published before gate closure (2026-01-01 11:00 UTC) for delivery on 2026-01-02
    {"startTime": "2026-01-02T00:00:00+00:00", "publishTime": "2026-01-01T09:00:00Z", "generation": 5100},
    # Later publish — should be selected as "best"
    {"startTime": "2026-01-02T00:00:00+00:00", "publishTime": "2026-01-01T10:55:00Z", "generation": 5150},
    # After gate closure — should be excluded
    {"startTime": "2026-01-02T00:00:00+00:00", "publishTime": "2026-01-01T12:00:00Z", "generation": 9999},
    {"startTime": "2026-01-02T00:30:00+00:00", "publishTime": "2026-01-01T10:00:00Z", "generation": 5300},
]


def test_build_actuals_map():
    m = build_actuals_map(ACTUALS)
    assert len(m) == 2
    assert m["2026-01-02T00:00:00+00:00"] == 5000


def test_select_day_ahead_forecasts_picks_latest_valid():
    fm = select_day_ahead_forecasts(FORECASTS)
    # Should select the 10:55 publish, not the 12:00 one
    assert "2026-01-02T00:00:00+00:00" in fm
    assert fm["2026-01-02T00:00:00+00:00"]["generation"] == 5150


def test_compute_accuracy_metrics():
    actuals_map = build_actuals_map(ACTUALS)
    forecast_map = select_day_ahead_forecasts(FORECASTS)
    result = compute_accuracy_metrics(actuals_map, forecast_map)

    assert result["nPairs"] == 2
    assert result["mae"] is not None
    assert result["rmse"] is not None
    # Bias: (5150 - 5000 + 5300 - 5200) / 2 = (150 + 100) / 2 = 125
    assert result["bias"] == pytest.approx(125.0, abs=1.0)


def test_compute_daily_metrics():
    pairs = [
        {"startTime": "2026-01-02T00:00:00+00:00", "error": 150, "absoluteError": 150, "percentageError": 3.0},
        {"startTime": "2026-01-02T00:30:00+00:00", "error": 100, "absoluteError": 100, "percentageError": 1.9},
    ]
    daily = compute_daily_metrics(pairs)
    assert len(daily) == 1
    assert daily[0]["date"] == "2026-01-02"
    assert daily[0]["nPeriods"] == 2
