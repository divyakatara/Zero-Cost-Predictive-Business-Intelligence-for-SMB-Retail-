import re
from datetime import datetime, timezone
from pathlib import Path
from typing import List

import joblib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

try:
    import pandas as pd
except ImportError:  # pragma: no cover
    pd = None

try:
    from sklearn.tree import DecisionTreeRegressor
except ImportError:  # pragma: no cover
    DecisionTreeRegressor = None

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.post("/", response_model=schemas.InventoryResponse)
def update_stock(item: schemas.InventoryCreate, db: Session = Depends(get_db)):
    """Create or update stock information for a product."""
    inventory_item = (
        db.query(models.Inventory)
        .filter(models.Inventory.product_id == item.product_id)
        .first()
    )

    if inventory_item:
        inventory_item.stock = item.stock
        inventory_item.reorder_level = item.reorder_level
    else:
        inventory_item = models.Inventory(
            product_id=item.product_id,
            stock=item.stock,
            reorder_level=item.reorder_level,
        )
        db.add(inventory_item)

    db.commit()
    db.refresh(inventory_item)
    return inventory_item


@router.get("/", response_model=List[schemas.InventoryResponse])
def get_inventory(db: Session = Depends(get_db)):
    """Get all inventory records."""
    return db.query(models.Inventory).all()


FEATURES = ["weekday", "month", "is_weekend", "promo", "lag_1", "lag_7"]


def build_training_frame(sales):
    """One row per sale (oldest first) with lag features derived from this
    product's own quantity series: lag_1 = previous period, lag_7 = seven
    periods back. The stored lag_1/lag_7 columns are not used because they
    are incomplete (lag_1 is empty) and counted per branch rather than per
    period, so they don't match what the forecast row can be built from.
    Rows without a full 7-period history are dropped.
    """
    data = pd.DataFrame([{
        "weekday": s.weekday,
        "month": s.month,
        "is_weekend": int(s.is_weekend) if s.is_weekend is not None else 0,
        "promo": int(s.promo) if s.promo is not None else 0,
        "quantity_sold": s.quantity_sold,
    } for s in sales])
    data = data.dropna(subset=["weekday", "month", "quantity_sold"])
    data["lag_1"] = data["quantity_sold"].shift(1)
    data["lag_7"] = data["quantity_sold"].shift(7)
    return data.dropna(subset=["lag_1", "lag_7"]).astype(int).reset_index(drop=True)


def build_forecast_row(data):
    """Feature row for the period right after the last one in `data`."""
    last_row = data.iloc[-1]
    next_weekday = (int(last_row["weekday"]) + 1) % 7
    return {
        "weekday": next_weekday,
        "month": int(last_row["month"]),
        "is_weekend": 1 if next_weekday in (5, 6) else 0,
        "promo": 0,
        "lag_1": int(data["quantity_sold"].iloc[-1]),
        # The forecast period is one step after the last row, so 7 periods back is the 7th-from-last row.
        "lag_7": int(data["quantity_sold"].iloc[-7]),
    }


# Trained trees are persisted here, one file per product (gitignored).
DEMAND_CACHE_DIR = Path(__file__).resolve().parents[1] / "ml" / "cache"


def _sales_signature(db: Session, product: "models.Product") -> list:
    """Fingerprint of a product's sales history. A cached tree is reused only
    while this matches, so new or re-imported data triggers a retrain."""
    count, latest, units = (
        db.query(
            func.count(models.Sale.id),
            func.max(models.Sale.sale_date),
            func.coalesce(func.sum(models.Sale.quantity_sold), 0),
        )
        .filter(models.Sale.product_id == product.id)
        .one()
    )
    return [int(count), latest.isoformat() if latest else None, int(units)]


def _cache_path(product_code: str) -> Path:
    return DEMAND_CACHE_DIR / f"decision_tree_{re.sub(r'[^A-Za-z0-9_-]', '_', product_code)}.joblib"


def get_demand_model(db: Session, product: "models.Product", refresh: bool = False) -> tuple[dict, bool]:
    """(cached model bundle, retrained?) for one product. Trains and persists
    a Decision Tree only when there is no cache, the sales data changed, or a
    refresh is requested."""
    signature = _sales_signature(db, product)
    path = _cache_path(product.product_code)
    if not refresh and path.exists():
        try:
            bundle = joblib.load(path)
            if bundle.get("signature") == signature:
                return bundle, False
        except Exception:
            pass  # unreadable cache: retrain below

    if signature[0] < 10:
        raise HTTPException(
            status_code=400,
            detail="Not enough sales history for this product to make a prediction (need at least 10 records).",
        )
    sales = (
        db.query(models.Sale)
        .filter(models.Sale.product_id == product.id)
        .order_by(models.Sale.sale_date)
        .all()
    )
    data = build_training_frame(sales)
    if len(data) < 7:
        raise HTTPException(status_code=400, detail="Not enough sales history for this product to make a prediction.")

    # Train the Decision Tree(ML)
    model = DecisionTreeRegressor(max_depth=6, random_state=42)
    model.fit(data[FEATURES], data["quantity_sold"])

    bundle = {
        "signature": signature,
        "model": model,
        "forecast_row": build_forecast_row(data),
        "records_used": len(data),
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    DEMAND_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, path)
    return bundle, True


def predict_for_product(db: Session, product: "models.Product", refresh: bool = False) -> dict:
    bundle, retrained = get_demand_model(db, product, refresh=refresh)
    #ML stmt
    predicted_demand = max(0, round(bundle["model"].predict(pd.DataFrame([bundle["forecast_row"]]))[0]))

    # Same stock fields the Inventory page and the procurement agent use.
    current_stock = product.supplier_stock
    reorder_level = product.reorder_level

    needs_reorder = None
    suggested_order = None
    if current_stock is not None:
        needs_reorder = current_stock < predicted_demand or (
            reorder_level is not None and current_stock <= reorder_level
        )
        # Enough to cover the predicted demand and still sit at the reorder level.
        suggested_order = max(0, predicted_demand + (reorder_level or 0) - current_stock)

    return {
        "product_code": product.product_code,
        "predicted_demand": int(predicted_demand),
        "current_stock": current_stock,
        "reorder_level": reorder_level,
        "needs_reorder": needs_reorder,
        "suggested_order": suggested_order,
        "records_used": bundle["records_used"],
        "model_cached": not retrained,
        "trained_at": bundle["trained_at"],
    }


@router.get("/predictions")
def predict_all(refresh: bool = False, db: Session = Depends(get_db)):
    """Next-day Decision Tree demand prediction for every product."""
    if pd is None or DecisionTreeRegressor is None:
        raise HTTPException(status_code=503, detail="Demand forecasting is unavailable in this environment.")
    items = []
    products = (
        db.query(models.Product)
        .filter(models.Product.product_code.isnot(None))
        .order_by(models.Product.product_code)
        .all()
    )
    for product in products:
        try:
            items.append(predict_for_product(db, product, refresh=refresh))
        except HTTPException as exc:
            items.append({"product_code": product.product_code, "error": exc.detail})
    return {
        "model": "DecisionTreeRegressor(max_depth=6)",
        "horizon": "next day",
        "suggestion_rule": "suggested_order = max(0, predicted_demand + reorder_level - current_stock)",
        "items": items,
    }


@router.get("/predict/{product_code}")
def predict_demand(product_code: str, refresh: bool = False, db: Session = Depends(get_db)):
    """Predict next-period demand for a product using a Decision Tree,
    and compare it against current stock to recommend a reorder.

    Takes the public product_code (e.g. "item_1"), the same identifier the
    anomaly API uses; it is translated to products.id internally. The trained
    tree is cached per product and reused until that product's sales change
    (or ?refresh=true).
    """
    if pd is None or DecisionTreeRegressor is None:
        raise HTTPException(
            status_code=503,
            detail="Demand forecasting is unavailable because the ML dependencies are not working in this environment.",
        )

    product = db.query(models.Product).filter(models.Product.product_code == product_code).first()
    if product is None:
        raise HTTPException(status_code=404, detail=f"No product with product_code '{product_code}'.")

    return predict_for_product(db, product, refresh=refresh)
