from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(prefix="/sales", tags=["Sales"])


@router.post("/", response_model=schemas.SaleResponse)
def add_sale(sale: schemas.SaleCreate, db: Session = Depends(get_db)):
    """Add a sales record, filling the same columns the data import and the
    workbook loader fill, so API-created and imported rows look alike."""
    product = db.query(models.Product).filter(models.Product.id == sale.product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found.")
    price = sale.price if sale.price is not None else product.price
    cost = product.cost_price
    revenue = price * sale.quantity_sold if price is not None else None
    total_cost = cost * sale.quantity_sold if cost is not None else None
    new_sale = models.Sale(
        **sale.model_dump(exclude={"price"}),
        product_code=product.product_code,
        price=price,
        revenue=revenue,
        cost_price=cost,
        total_cost=total_cost,
        profit=revenue - total_cost if revenue is not None and total_cost is not None else None,
        weekday=sale.sale_date.weekday(),
        month=sale.sale_date.month,
        is_weekend=sale.sale_date.weekday() >= 5,
    )
    db.add(new_sale)
    db.commit()
    db.refresh(new_sale)
    return new_sale


@router.get("/", response_model=List[schemas.SaleResponse])
def get_sales(db: Session = Depends(get_db)):
    """Get all sales records."""
    return db.query(models.Sale).all()
