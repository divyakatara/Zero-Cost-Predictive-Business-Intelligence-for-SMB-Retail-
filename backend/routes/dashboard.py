from fastapi import APIRouter, Depends
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

import models
from database import get_db

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def stock_status(stock, reorder_level, raw_status):
    if stock is None or reorder_level is None:
        return raw_status or "Good"
    if stock <= reorder_level:
        return "Critical"
    if stock <= reorder_level * 1.25:
        return "Low"
    return "Good"


@router.get("/overview")
def get_dashboard_overview(db: Session = Depends(get_db)):
    latest_sale_date = db.query(func.max(models.Sale.sale_date)).scalar()

    sales_today = 0.0
    if latest_sale_date:
        sales_today = (
            db.query(func.coalesce(func.sum(models.Sale.revenue), 0.0))
            .filter(models.Sale.sale_date == latest_sale_date)
            .scalar()
            or 0.0
        )

    total_profit = (
        db.query(func.coalesce(func.sum(models.Sale.profit), 0.0)).scalar() or 0.0
    )

    monthly_rows = (
        db.query(
            func.date_trunc("month", models.Sale.sale_date).label("month_start"),
            func.coalesce(func.sum(models.Sale.revenue), 0.0).label("revenue"),
            func.coalesce(func.sum(models.Sale.profit), 0.0).label("profit"),
        )
        .filter(models.Sale.sale_date.isnot(None))
        .group_by("month_start")
        .order_by(desc("month_start"))
        .limit(6)
        .all()
    )
    monthly_sales = [
        {
            "month": row.month_start.strftime("%b"),
            "actual": float(row.revenue or 0.0),
            "predicted": float(row.profit or 0.0),
        }
        for row in reversed(monthly_rows)
    ]

    product_rows = db.query(models.Product).order_by(models.Product.id.asc()).all()
    inventory_rows = []
    reorder_candidates = []
    low_stock_items = 0

    for product in product_rows[:7]:
        status = stock_status(
            product.supplier_stock,
            product.reorder_level,
            product.stock_status,
        )
        row = {
            "product": product.product_code or product.name,
            "stock": product.supplier_stock or 0,
            "reorder": product.reorder_level or 0,
            "status": status,
        }
        inventory_rows.append(row)
        if status in {"Critical", "Low"}:
            low_stock_items += 1
            if len(reorder_candidates) < 3:
                reorder_candidates.append(row)

    top_product_rows = (
        db.query(
            models.Sale.product_code,
            func.coalesce(func.sum(models.Sale.revenue), 0.0).label("revenue"),
        )
        .filter(models.Sale.product_code.isnot(None))
        .group_by(models.Sale.product_code)
        .order_by(desc("revenue"))
        .limit(4)
        .all()
    )
    total_revenue = (
        db.query(func.coalesce(func.sum(models.Sale.revenue), 0.0)).scalar() or 0.0
    )
    top_products = [
        {
            "name": row.product_code,
            "value": float(row.revenue or 0.0),
            "percentage": round(((row.revenue or 0.0) / total_revenue) * 100, 1)
            if total_revenue
            else 0.0,
        }
        for row in top_product_rows
    ]

    supplier_alerts = (
        db.query(func.count(models.Supplier.id))
        .filter(models.Supplier.supply_risk_score.isnot(None))
        .filter(models.Supplier.supply_risk_score >= 3)
        .scalar()
        or 0
    )

    return {
        "summary": {
            "salesToday": float(sales_today),
            "totalProfit": float(total_profit),
            "lowStockItems": low_stock_items,
            "activeAlerts": int(low_stock_items + supplier_alerts),
        },
        "monthlySales": monthly_sales,
        "topProducts": top_products,
        "inventoryRows": inventory_rows,
        "reorderCandidates": reorder_candidates,
        "hasData": bool(monthly_sales or top_products or inventory_rows),
    }
