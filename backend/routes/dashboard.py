from fastapi import APIRouter, Depends
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

import models
from database import get_db
from services import replenishment

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

    # Every product counts toward stock health (this used to stop at the first 7).
    product_rows = db.query(models.Product).order_by(models.Product.product_code.asc()).all()
    stock_health = {"Good": 0, "Low": 0, "Critical": 0}
    stock_alerts = []
    for product in product_rows:
        status = stock_status(product.supplier_stock, product.reorder_level, None)
        stock_health[status] = stock_health.get(status, 0) + 1
        if status in {"Critical", "Low"}:
            stock_alerts.append({
                "severity": "high" if status == "Critical" else "medium",
                "title": f"{product.product_code or product.name} is {status.lower()} on stock",
                "detail": f"{product.supplier_stock or 0} units left against a reorder level of {product.reorder_level or 0}.",
                "target": "Inventory",
            })
    stock_alerts.sort(key=lambda alert: alert["severity"] != "high")
    low_stock_items = stock_health["Low"] + stock_health["Critical"]

    # Same deterministic analysis the Procurement AI page uses, so the numbers match.
    reorder_candidates = [
        {
            "productId": item["product_id"],
            "product": item["product_name"],
            "status": item["stock_status"].title(),
            "stock": item["current_stock"],
            "reorder": item["reorder_level"],
            "recommendedQuantity": item["recommended_quantity"],
        }
        for item in replenishment.list_replenishment_candidates(db)
    ]

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

    risky_suppliers = (
        db.query(models.Supplier)
        .filter(models.Supplier.supply_risk_score.isnot(None))
        .filter(models.Supplier.supply_risk_score >= 3)
        .order_by(models.Supplier.supply_risk_score.desc())
        .all()
    )
    supplier_alerts = [
        {
            "severity": "medium",
            "title": f"{supplier.name} has an elevated supply risk",
            "detail": f"Risk score {supplier.supply_risk_score}/5 · lead time {supplier.lead_time} days"
            + (f" · on-time {supplier.on_time_delivery_rate:.0f}%" if supplier.on_time_delivery_rate is not None else ""),
            "target": "Supplier Marketplace",
        }
        for supplier in risky_suppliers
    ]

    return {
        "summary": {
            "salesToday": float(sales_today),
            "totalProfit": float(total_profit),
            "totalRevenue": float(total_revenue),
            "lowStockItems": low_stock_items,
            "activeAlerts": len(stock_alerts) + len(supplier_alerts),
        },
        "monthlySales": monthly_sales,
        "topProducts": top_products,
        "stockHealth": stock_health,
        "productCount": len(product_rows),
        "reorderCandidates": reorder_candidates,
        "alerts": stock_alerts + supplier_alerts,
        "hasData": bool(monthly_sales or top_products or product_rows),
    }
