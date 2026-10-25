"""
Wind forecast accuracy & analytics service.

Business context
----------------
UK day-ahead power purchases must be made before gate closure (~11:00 on D-1).
To evaluate forecast quality we pair each actual half-hourly wind generation
reading with the **most recent forecast published before gate closure on the
day prior** (i.e. publishTime < D-1 11:00 and publishTime is as late as
possible, giving us the "best available" day-ahead forecast).

Metrics computed
----------------
- MAE  – Mean Absolute Error  (MW)
- RMSE – Root Mean Squared Error (MW)
- MAPE – Mean Absolute Percentage Error (%)
- Bias – Mean signed error: positive = over-forecast, negative = under-forecast
"""

import logging
import math
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_dt(dt_str: str) -> datetime:
    """Parse an ISO-8601 datetime string to a timezone-aware UTC datetime."""
    dt_str = dt_str.replace("Z", "+00:00")
    return datetime.fromisoformat(dt_str)


def _gate_closure(settlement_date: datetime) -> datetime:
    """Gate closure for day-ahead is approximately D-1 11:00 UTC."""
    d_minus_1 = settlement_date.date() - timedelta(days=1)
    return datetime(
        d_minus_1.year, d_minus_1.month, d_minus_1.day, 11, 0, 0,
        tzinfo=timezone.utc,
    )


# ---------------------------------------------------------------------------
# Core service functions
# ---------------------------------------------------------------------------

def build_actuals_map(
    raw_actuals: List[Dict[str, Any]],
) -> Dict[str, float]:
    """Return {startTime_iso: generation_MW} for all actual records."""
    return {
        r["startTime"].replace("Z", "+00:00"): float(r["generation"])
        for r in raw_actuals
        if r.get("startTime") and r.get("generation") is not None
    }


def select_day_ahead_forecasts(
    raw_forecasts: List[Dict[str, Any]],
    target_dates: Optional[List[str]] = None,
) -> Dict[str, Dict[str, Any]]:
    """
    For each unique startTime in raw_forecasts, find the forecast record
    whose publishTime is the LATEST one that is still before gate closure
    (D-1 11:00 UTC) of the delivery day.

    Returns {startTime_iso: {generation, publishTime, lead_hours}}
    """
    # Group by startTime
    by_start: Dict[str, List[Dict[str, Any]]] = {}
    for r in raw_forecasts:
        key = r.get("startTime", "").replace("Z", "+00:00")
        if not key:
            continue
        by_start.setdefault(key, []).append(r)

    result: Dict[str, Dict[str, Any]] = {}
    for start_iso, records in by_start.items():
        try:
            start_dt = _parse_dt(start_iso)
        except ValueError:
            continue

        gate = _gate_closure(start_dt)

        # Keep only forecasts published before gate closure
        valid = [
            r for r in records
            if _parse_dt(r["publishTime"].replace("Z", "+00:00")) < gate
        ]
        if not valid:
            continue

        # Pick the most recent of the valid ones
        best = max(valid, key=lambda r: r["publishTime"])
        publish_dt = _parse_dt(best["publishTime"].replace("Z", "+00:00"))
        lead_hours = round((start_dt - publish_dt).total_seconds() / 3600, 1)

        result[start_iso] = {
            "generation": float(best["generation"]),
            "publishTime": best["publishTime"],
            "leadHours": lead_hours,
        }

    return result


def compute_accuracy_metrics(
    actuals_map: Dict[str, float],
    forecast_map: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    """Compute MAE, RMSE, MAPE, Bias over matched actual/forecast pairs."""
    errors: List[float] = []
    abs_errors: List[float] = []
    pct_errors: List[float] = []
    pairs: List[Dict[str, Any]] = []

    for start_iso, actual_gen in actuals_map.items():
        fcast = forecast_map.get(start_iso)
        if fcast is None:
            continue

        forecast_gen = fcast["generation"]
        error = forecast_gen - actual_gen  # positive = over-forecast
        errors.append(error)
        abs_errors.append(abs(error))
        if actual_gen != 0:
            pct_errors.append(abs(error) / abs(actual_gen) * 100)

        pairs.append(
            {
                "startTime": start_iso,
                "actual": actual_gen,
                "forecast": forecast_gen,
                "error": round(error, 1),
                "absoluteError": round(abs(error), 1),
                "percentageError": round(abs(error) / abs(actual_gen) * 100, 2)
                if actual_gen != 0
                else None,
                "publishTime": fcast["publishTime"],
                "leadHours": fcast["leadHours"],
            }
        )

    n = len(errors)
    if n == 0:
        return {
            "mae": None,
            "rmse": None,
            "mape": None,
            "bias": None,
            "nPairs": 0,
            "pairs": [],
        }

    mae = sum(abs_errors) / n
    rmse = math.sqrt(sum(e**2 for e in errors) / n)
    mape = sum(pct_errors) / len(pct_errors) if pct_errors else None
    bias = sum(errors) / n

    # Sort pairs by startTime for chart rendering
    pairs.sort(key=lambda x: x["startTime"])

    return {
        "mae": round(mae, 1),
        "rmse": round(rmse, 1),
        "mape": round(mape, 2) if mape is not None else None,
        "bias": round(bias, 1),
        "nPairs": n,
        "pairs": pairs,
    }


def compute_daily_metrics(
    pairs: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Aggregate per-half-hour pairs into daily error statistics."""
    by_day: Dict[str, List[Dict[str, Any]]] = {}
    for p in pairs:
        day = p["startTime"][:10]  # "YYYY-MM-DD"
        by_day.setdefault(day, []).append(p)

    daily = []
    for day, day_pairs in sorted(by_day.items()):
        errors = [p["error"] for p in day_pairs]
        abs_errors = [abs(e) for e in errors]
        pct_errors = [p["percentageError"] for p in day_pairs if p["percentageError"] is not None]
        n = len(errors)
        rmse = math.sqrt(sum(e**2 for e in errors) / n)
        daily.append(
            {
                "date": day,
                "mae": round(sum(abs_errors) / n, 1),
                "rmse": round(rmse, 1),
                "mape": round(sum(pct_errors) / len(pct_errors), 2) if pct_errors else None,
                "bias": round(sum(errors) / n, 1),
                "nPeriods": n,
            }
        )
    return daily


def get_latest_forecast_snapshot(
    raw_forecasts: List[Dict[str, Any]],
) -> Tuple[Optional[str], List[Dict[str, Any]]]:
    """
    Return (publishTime, records) for the single most recent forecast vintage,
    sorted by startTime. This represents the 'latest available forecast'.
    """
    if not raw_forecasts:
        return None, []

    latest_publish = max(
        r["publishTime"] for r in raw_forecasts if r.get("publishTime")
    )
    snapshot = [r for r in raw_forecasts if r["publishTime"] == latest_publish]
    snapshot.sort(key=lambda r: r["startTime"])
    return latest_publish, snapshot
