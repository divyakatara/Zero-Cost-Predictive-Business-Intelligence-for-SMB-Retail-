from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(tags=["Data"])


def supplier_to_dataset_row(supplier: models.Supplier) -> dict:
    return {
        "supplier_id": supplier.supplier_code,
        "supplier_name": supplier.supplier_name or supplier.name,
        "location": supplier.location,
        "rating": supplier.rating,
        "lead_time_days": supplier.lead_time,
        "contact_number": supplier.contact_number,
        "product_id": supplier.product_code,
        "branch_id": supplier.branch_id,
        "supplier_stock": supplier.supplier_stock,
        "reorder_level": supplier.reorder_level,
        "stock_status": supplier.stock_status,
        "stock_utilization_rate": supplier.stock_utilization_rate,
        "supplier_risk_score": supplier.supply_risk_score,
    }


@router.get("/products", response_model=List[schemas.ProductResponse])
def get_products(db: Session = Depends(get_db)):
    return db.query(models.Product).all()


@router.get("/suppliers", response_model=List[schemas.SupplierDatasetResponse])
def get_suppliers(db: Session = Depends(get_db)):
    suppliers = (
        db.query(models.Supplier)
        .filter(models.Supplier.supplier_code.isnot(None))
        .order_by(models.Supplier.id.asc())
        .all()
    )
    return [supplier_to_dataset_row(supplier) for supplier in suppliers]
