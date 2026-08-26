from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

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
import pandas as pd
from sklearn.tree import DecisionTreeRegressor
from fastapi import HTTPException


@router.get("/predict/{product_id}")
def predict_demand(product_id: int, db: Session = Depends(get_db)):
    """Predict next-period demand for a product using a Decision Tree,
    and compare it against current stock to recommend a reorder."""

    # Pull this product's sales history
    sales = (
        db.query(models.Sale)
        .filter(models.Sale.product_id == product_id)
        .order_by(models.Sale.sale_date)
        .all()
    )

    if len(sales) < 10:
        raise HTTPException(
            status_code=400,
            detail="Not enough sales history for this product to make a prediction (need at least 10 records).",
        )

    # Build a dataframe from the sales rows
    data = pd.DataFrame([{
        "weekday": s.weekday,
        "month": s.month,
        "is_weekend": int(s.is_weekend) if s.is_weekend is not None else 0,
        "promo": int(s.promo) if s.promo is not None else 0,
        "lag_1": s.lag_1 if s.lag_1 is not None else 0,
        "lag_7": s.lag_7 if s.lag_7 is not None else 0,
        "quantity_sold": s.quantity_sold,
    } for s in sales])

    data = data.dropna()

    features = ["weekday", "month", "is_weekend", "promo", "lag_1", "lag_7"]
    X = data[features]
    y = data["quantity_sold"]

    # Train the Decision Tree(ML)
    model = DecisionTreeRegressor(max_depth=6, random_state=42)
    model.fit(X, y)

    # Build "next period" input using the most recent sale as a base
    last_row = data.iloc[-1]
    next_input = pd.DataFrame([{
        "weekday": (int(last_row["weekday"]) + 1) % 7,
        "month": int(last_row["month"]),
        "is_weekend": 1 if ((int(last_row["weekday"]) + 1) % 7) in (5, 6) else 0,
        "promo": 0,
        "lag_1": int(last_row["quantity_sold"]),
        "lag_7": int(last_row["lag_1"]),
    }])
    #ML stmt
    predicted_demand = max(0, round(model.predict(next_input)[0]))

    # Compare against current inventory
    inventory_item = (
        db.query(models.Inventory)
        .filter(models.Inventory.product_id == product_id)
        .first()
    )

    current_stock = inventory_item.stock if inventory_item else None
    reorder_level = inventory_item.reorder_level if inventory_item else None

    needs_reorder = None
    if current_stock is not None:
        needs_reorder = current_stock < predicted_demand or (
            reorder_level is not None and current_stock <= reorder_level
        )

    return {
        "product_id": product_id,
        "predicted_demand": int(predicted_demand),
        "current_stock": current_stock,
        "reorder_level": reorder_level,
        "needs_reorder": needs_reorder,
        "records_used": len(data),
    }