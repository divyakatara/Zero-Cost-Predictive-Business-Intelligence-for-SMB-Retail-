from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import models
from database import get_db
from ml.anomaly import AnomalyResult, train_and_score

router = APIRouter(prefix="/anomaly", tags=["Anomaly Detection"])

_LAST_RESULT: Optional[AnomalyResult] = None

# Same cut-off the business alerts page uses: scores below this are "high risk".
HIGH_RISK_SCORE = -0.03


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
    product_code: Optional[str] = Query(None, description="Filter by product_code (e.g. item_1)"),
    product_id: Optional[str] = Query(None, description="Deprecated alias of product_code"),
    branch_id: Optional[str] = Query(None, description="Filter by branch_id"),
    refresh: bool = Query(False, description="Re-train model and re-score all rows"),
) -> dict[str, Any]:
    result = _get_result(refresh=refresh)
    anomalies = result.anomalies

    product_code = product_code or product_id
    if product_code:
        anomalies = [a for a in anomalies if a.get("product_code") == product_code]
    if branch_id:
        anomalies = [a for a in anomalies if a.get("branch_id") == branch_id]

    anomalies = anomalies[:limit]
    return {
        "count": len(anomalies),
        "total_anomalies": result.summary["total_anomalies"],
        "total_rows": result.summary["total_rows"],
        "filters_applied": {
            "product_code": product_code,
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


@router.get("/suppliers/{supplier_code}")
def get_supplier_anomalies(
    supplier_code: str,
    limit: int = Query(200, ge=1, le=500, description="Max anomalies to return, ordered by worst score first"),
    refresh: bool = Query(False, description="Re-train model and re-score all rows"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Anomalies for the products this supplier provides (Product.supplier_code)."""
    supplier = db.query(models.Supplier).filter(models.Supplier.supplier_code == supplier_code).first()
    if supplier is None:
        raise HTTPException(status_code=404, detail="No supplier record matches this supplier ID.")

    product_codes = sorted(
        code for (code,) in db.query(models.Product.product_code)
        .filter(models.Product.supplier_code == supplier_code, models.Product.product_code.isnot(None))
    )

    result = _get_result(refresh=refresh)
    # Anomaly records key products by code in their product_id field (e.g. "item_1").
    anomalies = [a for a in result.anomalies if a.get("product_id") in product_codes]

    per_product = {code: 0 for code in product_codes}
    for a in anomalies:
        per_product[a["product_id"]] += 1
    high_risk = sum(1 for a in anomalies if (a.get("anomaly_score") or 0) < HIGH_RISK_SCORE)

    return {
        "supplier_code": supplier.supplier_code,
        "supplier_name": supplier.supplier_name or supplier.name,
        "product_codes": product_codes,
        "total_anomalies": len(anomalies),
        "high_risk": high_risk,
        "moderate_risk": len(anomalies) - high_risk,
        "high_risk_threshold": HIGH_RISK_SCORE,
        "anomalies_per_product": per_product,
        "results": anomalies[:limit],
    }
