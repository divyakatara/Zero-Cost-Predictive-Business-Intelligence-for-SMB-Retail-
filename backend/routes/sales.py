from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(prefix="/sales", tags=["Sales"])


@router.post("/", response_model=schemas.SaleResponse)
def add_sale(sale: schemas.SaleCreate, db: Session = Depends(get_db)):
    """Add a new sales record."""
    new_sale = models.Sale(
        product_id=sale.product_id,
        quantity=sale.quantity,
        date=sale.date,
    )
    db.add(new_sale)
    db.commit()
    db.refresh(new_sale)
    return new_sale


@router.get("/", response_model=List[schemas.SaleResponse])
def get_sales(db: Session = Depends(get_db)):
    """Get all sales records."""
    return db.query(models.Sale).all()
