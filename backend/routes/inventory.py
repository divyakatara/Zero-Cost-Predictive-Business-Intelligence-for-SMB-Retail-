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
