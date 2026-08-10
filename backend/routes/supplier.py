from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


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


@router.post("/", response_model=schemas.SupplierResponse)
def add_supplier(supplier: schemas.SupplierCreate, db: Session = Depends(get_db)):
    """Add a new supplier."""
    new_supplier = models.Supplier(
        name=supplier.name,
        location=supplier.location,
        rating=supplier.rating,
        lead_time=supplier.lead_time,
    )
    db.add(new_supplier)
    db.commit()
    db.refresh(new_supplier)
    return new_supplier


@router.get("/", response_model=List[schemas.SupplierDatasetResponse])
def get_suppliers(db: Session = Depends(get_db)):
    """Get all suppliers."""
    suppliers = (
        db.query(models.Supplier)
        .filter(models.Supplier.supplier_code.isnot(None))
        .order_by(models.Supplier.id.asc())
        .all()
    )
    return [supplier_to_dataset_row(supplier) for supplier in suppliers]
