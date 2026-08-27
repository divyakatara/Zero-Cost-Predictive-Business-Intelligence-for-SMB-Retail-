from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query

from ml.anomaly import AnomalyResult, train_and_score

router = APIRouter(prefix="/anomaly", tags=["Anomaly Detection"])

_LAST_RESULT: Optional[AnomalyResult] = None


def _get_result(refresh: bool = False) -> AnomalyResult:
    global _LAST_RESULT
    if _LAST_RESULT is None or refresh:
        try:
            _LAST_RESULT = train_and_score(refresh_cache=refresh)
        except FileNotFoundError as exc:
            raise HTTPException(status_code=500, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Isolation Forest training failed: {exc}",
            )
    return _LAST_RESULT


@router.get("/summary")
def get_anomaly_summary(refresh: bool = Query(False, description="Re-train model and re-score all rows")) -> dict[str, Any]:
    result = _get_result(refresh=refresh)
    return result.summary


@router.get("/anomalies")
def get_anomalies(
    limit: int = Query(50, ge=1, le=500, description="Max anomalies to return, ordered by worst score first"),
    product_id: Optional[str] = Query(None, description="Filter by product_id"),
    branch_id: Optional[str] = Query(None, description="Filter by branch_id"),
    refresh: bool = Query(False, description="Re-train model and re-score all rows"),
) -> dict[str, Any]:
    result = _get_result(refresh=refresh)
    anomalies = result.anomalies

    if product_id:
        anomalies = [a for a in anomalies if a.get("product_id") == product_id]
    if branch_id:
        anomalies = [a for a in anomalies if a.get("branch_id") == branch_id]

    anomalies = anomalies[:limit]
    return {
        "count": len(anomalies),
        "total_anomalies": result.summary["total_anomalies"],
        "total_rows": result.summary["total_rows"],
        "filters_applied": {
            "product_id": product_id,
            "branch_id": branch_id,
        },
        "results": anomalies,
    }


@router.get("/all")
def get_all_scored(
    limit: int = Query(200, ge=1, le=10000, description="Max rows to return, ordered by most anomalous first"),
    only_anomalies: bool = Query(False, description="Only return anomaly rows"),
    refresh: bool = Query(False, description="Re-train model and re-score all rows"),
) -> dict[str, Any]:
    result = _get_result(refresh=refresh)
    rows = result.anomalies if only_anomalies else result.all_results
    rows = rows[:limit]
    return {
        "count": len(rows),
        "only_anomalies": only_anomalies,
        "total_rows": result.summary["total_rows"],
        "total_anomalies": result.summary["total_anomalies"],
        "results": rows,
    }
