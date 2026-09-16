"""Deterministic replenishment analysis for the Agentic AI procurement workflow.

No machine learning and no Gemini calls happen here on purpose — reorder
quantities are a business-critical number and must be reproducible, explainable,
and independent of any external API being available. This mirrors the same
`Product.supplier_stock` / `Product.reorder_level` / `stock_status` fields the
existing Inventory page (business_pages.inventory_overview) already reads, so
the agent's view of "what's low" always matches what the user sees on screen.

Reorder-quantity formula (a standard reorder-point / safety-stock model):

    coverage_days   = supplier_lead_time_days + SAFETY_BUFFER_DAYS
    target_stock    = avg_daily_sales * coverage_days
    recommended_qty = max(0, ceil(target_stock - current_stock))

If there isn't enough sales history to compute a reliable avg_daily_sales,
the formula falls back to simply topping the product back up to its
reorder_level, and the reasoning explicitly says so — the agent never invents
a sales trend it doesn't have data for.
"""

import json
import math
from datetime import date, timedelta
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

import models
from routes.business_pages import classify_stock

SAFETY_BUFFER_DAYS = 3
DEFAULT_LEAD_TIME_DAYS = 7
SALES_LOOKBACK_DAYS = 30
MIN_SALES_RECORDS_FOR_TREND = 5


def _sales_query(db: Session, product: "models.Product"):
    """Match sales the same way the rest of the app does: by product_code first
    (the field the CSV/Excel import reliably populates), falling back to the
    relational product_id for rows created directly via the API."""
    query = db.query(models.Sale)
    if product.product_code:
        return query.filter(models.Sale.product_code == product.product_code)
    return query.filter(models.Sale.product_id == product.id)


def _avg_daily_sales(db: Session, product: "models.Product") -> tuple[Optional[float], int, Optional[date]]:
    """Returns (avg_daily_sales, records_used, latest_sale_date)."""
    latest_date = (
        _sales_query(db, product)
        .with_entities(func.max(models.Sale.sale_date))
        .scalar()
    )
    if latest_date is None:
        return None, 0, None

    window_start = latest_date - timedelta(days=SALES_LOOKBACK_DAYS)
    rows = (
        _sales_query(db, product)
        .filter(models.Sale.sale_date.isnot(None))
        .filter(models.Sale.sale_date >= window_start)
        .with_entities(
            func.coalesce(models.Sale.quantity_sold, models.Sale.quantity, 0).label("qty"),
        )
        .all()
    )
    records_used = len(rows)
    if records_used < MIN_SALES_RECORDS_FOR_TREND:
        return None, records_used, latest_date

    total_units = sum(int(row.qty or 0) for row in rows)
    span_days = max(1, (latest_date - window_start).days)
    return round(total_units / span_days, 2), records_used, latest_date


def analyze_product(db: Session, product: "models.Product") -> dict:
    """Run the full deterministic replenishment analysis for one product.

    Returns a dict with the recommendation, every input used to reach it, and
    a human-readable `reasoning` list — never raises for missing data, only
    for a genuinely missing product (handled by the caller).
    """
    current_stock = product.supplier_stock or 0
    reorder_level = product.reorder_level or 0
    stock_state = classify_stock(product.supplier_stock, product.reorder_level, product.stock_status)
    needs_reorder = stock_state in ("critical", "low")

    lead_time_days = (
        product.supplier.lead_time
        if product.supplier and product.supplier.lead_time
        else DEFAULT_LEAD_TIME_DAYS
    )
    coverage_days = lead_time_days + SAFETY_BUFFER_DAYS

    avg_daily_sales, records_used, latest_sale_date = _avg_daily_sales(db, product)

    reasoning = [
        f"Current stock is {current_stock} units against a reorder level of {reorder_level} units "
        f"({stock_state.upper()})."
    ]

    if avg_daily_sales is not None:
        target_stock = avg_daily_sales * coverage_days
        recommended_quantity = max(0, math.ceil(target_stock - current_stock))
        reasoning.append(
            f"Average daily sales over the last {records_used} recorded days (up to "
            f"{latest_sale_date.isoformat() if latest_sale_date else 'n/a'}): {avg_daily_sales} units/day."
        )
        reasoning.append(
            f"Supplier lead time is {lead_time_days} day(s); adding a {SAFETY_BUFFER_DAYS}-day safety "
            f"buffer gives {coverage_days} days of coverage to plan for."
        )
        reasoning.append(
            f"Target stock to cover {coverage_days} days is {round(target_stock)} units, so the "
            f"recommended order quantity is {recommended_quantity} units."
        )
        method = "sales_trend"
    else:
        recommended_quantity = max(0, reorder_level - current_stock)
        if records_used == 0:
            reasoning.append(
                "No recorded sales history was found for this product, so the agent cannot compute a "
                "sales-trend forecast."
            )
        else:
            reasoning.append(
                f"Only {records_used} recent sales record(s) were found (fewer than the "
                f"{MIN_SALES_RECORDS_FOR_TREND} needed for a reliable trend), so the agent cannot compute "
                "a sales-trend forecast."
            )
        reasoning.append(
            f"Falling back to a simple top-up: order enough to bring stock back to the reorder level "
            f"({reorder_level} units), giving a recommended quantity of {recommended_quantity} units."
        )
        method = "reorder_level_fallback"

    if not needs_reorder:
        reasoning.insert(0, "Stock is currently healthy — this product is not flagged for replenishment.")

    return {
        "product_id": product.id,
        "product_code": product.product_code,
        "product_name": product.product_code or product.name,
        "needs_reorder": needs_reorder,
        "stock_status": stock_state,
        "current_stock": current_stock,
        "reorder_level": reorder_level,
        "avg_daily_sales": avg_daily_sales,
        "sales_records_used": records_used,
        "lead_time_days": lead_time_days,
        "safety_buffer_days": SAFETY_BUFFER_DAYS,
        "recommended_quantity": recommended_quantity,
        "method": method,
        "reasoning": reasoning,
    }


def list_replenishment_candidates(db: Session) -> list[dict]:
    """All products currently classified low/critical, most urgent first."""
    products = db.query(models.Product).order_by(models.Product.product_code.asc()).all()
    results = [analyze_product(db, product) for product in products]
    candidates = [r for r in results if r["needs_reorder"]]
    severity_rank = {"critical": 0, "low": 1}
    candidates.sort(key=lambda r: severity_rank.get(r["stock_status"], 2))
    return candidates


def reasoning_to_json(reasoning: list[str]) -> str:
    return json.dumps(reasoning)


def reasoning_from_json(raw: Optional[str]) -> list[str]:
    if not raw:
        return []
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        return []
