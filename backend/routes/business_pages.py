from collections import defaultdict
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

import models
from database import get_db
from services.supplier_selection import ranked_suppliers

router = APIRouter(prefix="/business-pages", tags=["Business Pages"])


def classify_stock(stock, reorder_level, raw_status=None):
    if raw_status and raw_status.lower() in {"critical", "low", "ok"}:
        if raw_status.lower() == "ok":
            return "ok"
        return raw_status.lower()
    if stock is None or reorder_level is None:
        return "ok"
    if stock <= reorder_level:
        return "critical"
    if stock <= reorder_level * 1.25:
        return "low"
    return "ok"


def currency_value(value):
    return float(value or 0.0)


def predicted_revenue_expression():
    return func.coalesce(models.Sale.lag_7, 0) * func.coalesce(models.Sale.price, 0.0)


@router.get("/inventory")
def inventory_overview(db: Session = Depends(get_db)):
    return build_inventory_overview(db)


def build_inventory_overview(db: Session, supplier_code: Optional[str] = None):
    """Stock rows for every product, or only those supplied by supplier_code."""
    query = db.query(models.Product)
    if supplier_code is not None:
        query = query.filter(models.Product.supplier_code == supplier_code)
    products = query.order_by(models.Product.product_code.asc()).all()
    supplier_names = dict(db.query(models.Supplier.supplier_code, models.Supplier.name).all())
    rows = []
    critical_items = 0
    low_stock_items = 0
    healthy_stock = 0

    for product in products:
        status = classify_stock(
            product.supplier_stock,
            product.reorder_level,
            product.stock_status,
        )
        if status == "critical":
            critical_items += 1
        elif status == "low":
            low_stock_items += 1
        else:
            healthy_stock += 1

        rows.append(
            {
                "id": product.product_code or f"SKU-{product.id:03d}",
                "product_id": product.id,
                "name": product.product_code or product.name,
                "category": product.category or "General",
                "qty": product.supplier_stock or 0,
                "reorder": product.reorder_level or 0,
                "status": status,
                "unit": "units",
                "supplier": supplier_names.get(product.supplier_code) or product.supplier_code or "-",
                "updated": product.branch_id or "-",
                "retailer": product.business.name if product.business else "-",
            }
        )

    return {
        "headerNote": f"Real-time stock levels - {len(rows)} products loaded",
        "stats": [
            {"label": "Total SKUs", "value": len(rows), "change": "Imported from PostgreSQL", "icon": "I"},
            {"label": "Critical Items", "value": critical_items, "change": "At or below reorder level", "icon": "!"},
            {"label": "Low Stock", "value": low_stock_items, "change": "Needs closer monitoring", "icon": "L"},
            {"label": "Healthy Stock", "value": healthy_stock, "change": "Above reorder threshold", "icon": "H"},
        ],
        "items": rows,
    }


@router.get("/sales")
def sales_overview(db: Session = Depends(get_db)):
    return build_sales_overview(db)


def product_trends(db: Session, product_codes, latest_sale_date, days: int = 30):
    """'up'/'down'/'flat' per product: units sold in the latest `days` days vs
    the `days` before that, anchored on the latest sale date in the data."""
    if not product_codes or latest_sale_date is None:
        return {}
    recent_start = latest_sale_date - timedelta(days=days - 1)
    previous_start = recent_start - timedelta(days=days)
    rows = (
        db.query(models.Sale.product_code, models.Sale.sale_date, models.Sale.quantity_sold)
        .filter(models.Sale.product_code.in_(product_codes))
        .filter(models.Sale.sale_date >= previous_start, models.Sale.sale_date <= latest_sale_date)
        .all()
    )
    recent = defaultdict(int)
    previous = defaultdict(int)
    for code, sale_date, units in rows:
        (recent if sale_date >= recent_start else previous)[code] += units or 0
    return {
        code: "up" if recent[code] > previous[code] else "down" if recent[code] < previous[code] else "flat"
        for code in product_codes
    }


def build_sales_overview(db: Session, product_codes=None):
    """Sales KPIs, charts and top products for all sales, or only sales of the
    given product codes (used for a supplier's own products)."""

    def scoped(query):
        if product_codes is not None:
            query = query.filter(models.Sale.product_code.in_(product_codes))
        return query

    latest_sale_date = scoped(db.query(func.max(models.Sale.sale_date))).scalar()
    predicted_revenue = predicted_revenue_expression()

    total_revenue = scoped(db.query(func.coalesce(func.sum(models.Sale.revenue), 0.0))).scalar() or 0.0
    total_orders = scoped(db.query(func.count(models.Sale.id))).scalar() or 0
    avg_order_value = total_revenue / total_orders if total_orders else 0.0

    monthly_rows = (
        scoped(db.query(
            func.date_trunc("month", models.Sale.sale_date).label("month_start"),
            func.coalesce(func.sum(models.Sale.revenue), 0.0).label("actual"),
            func.coalesce(func.sum(predicted_revenue), 0.0).label("predicted"),
        )
        .filter(models.Sale.sale_date.isnot(None)))
        .group_by("month_start")
        .all()
    )

    monthly_map = defaultdict(lambda: {"actual": 0.0, "predicted": 0.0})
    for row in monthly_rows:
        month_key = row.month_start.strftime("%b")
        monthly_map[month_key]["actual"] += currency_value(row.actual)
        monthly_map[month_key]["predicted"] += currency_value(row.predicted)

    month_order = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    all_time_data = [
        {"month": month, "actual": round(monthly_map[month]["actual"], 2), "predicted": round(monthly_map[month]["predicted"], 2)}
        for month in month_order
    ]

    this_month_data = []
    this_week_data = []

    if latest_sale_date:
        week_number_expr = (func.floor((func.extract("day", models.Sale.sale_date) - 1) / 7) + 1).label("week_number")
        latest_month_rows = (
            scoped(db.query(
                week_number_expr,
                func.coalesce(func.sum(models.Sale.revenue), 0.0).label("actual"),
                func.coalesce(func.sum(predicted_revenue), 0.0).label("predicted"),
            )
            .filter(func.extract("year", models.Sale.sale_date) == latest_sale_date.year)
            .filter(func.extract("month", models.Sale.sale_date) == latest_sale_date.month))
            .group_by(week_number_expr)
            .all()
        )
        week_map = {
            f"Week {int(row.week_number or 0)}": {
                "actual": currency_value(row.actual),
                "predicted": currency_value(row.predicted),
            }
            for row in latest_month_rows
        }
        for week_index in range(1, 6):
            label = f"Week {week_index}"
            this_month_data.append(
                {
                    "month": label,
                    "actual": round(week_map.get(label, {}).get("actual", 0.0), 2),
                    "predicted": round(week_map.get(label, {}).get("predicted", 0.0), 2),
                }
            )

        start_of_week = latest_sale_date - timedelta(days=latest_sale_date.weekday())
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        week_rows = (
            scoped(db.query(
                models.Sale.sale_date,
                func.coalesce(func.sum(models.Sale.revenue), 0.0).label("actual"),
                func.coalesce(func.sum(predicted_revenue), 0.0).label("predicted"),
            )
            .filter(models.Sale.sale_date >= start_of_week)
            .filter(models.Sale.sale_date <= start_of_week + timedelta(days=6)))
            .group_by(models.Sale.sale_date)
            .all()
        )
        day_map = {
            day_names[row.sale_date.weekday()]: {
                "actual": currency_value(row.actual),
                "predicted": currency_value(row.predicted),
            }
            for row in week_rows
        }
        for label in day_names:
            this_week_data.append(
                {
                    "month": label,
                    "actual": round(day_map.get(label, {}).get("actual", 0.0), 2),
                    "predicted": round(day_map.get(label, {}).get("predicted", 0.0), 2),
                }
            )

    top_product_rows = (
        scoped(db.query(
            models.Sale.product_code,
            func.coalesce(func.sum(models.Sale.revenue), 0.0).label("revenue"),
            func.coalesce(func.sum(models.Sale.quantity_sold), 0).label("units"),
        )
        .filter(models.Sale.product_code.isnot(None)))
        .group_by(models.Sale.product_code)
        .order_by(desc("revenue"))
        .limit(5)
        .all()
    )
    trends = product_trends(db, [row.product_code for row in top_product_rows], latest_sale_date)
    top_products = [
        {
            "name": row.product_code,
            "revenue": currency_value(row.revenue),
            "units": int(row.units or 0),
            "trend": trends.get(row.product_code, "flat"),
        }
        for row in top_product_rows
    ]
    top_products_chart = [{"name": row["name"], "revenue": row["revenue"]} for row in top_products]

    recent_months = sorted(monthly_rows, key=lambda row: row.month_start)[-3:]
    last_three_months = [currency_value(row.actual) for row in recent_months if currency_value(row.actual) > 0]
    predicted_next = sum(last_three_months) / len(last_three_months) if last_three_months else 0.0

    return {
        "headerNote": "Overview, predictions & top products - Live database data",
        "kpis": [
            {"label": "Total Revenue", "value": total_revenue, "sub": "Imported from PostgreSQL"},
            {"label": "Total Orders", "value": total_orders, "sub": "Retail sales records"},
            {"label": "Avg Order Value", "value": avg_order_value, "sub": "Average revenue per order"},
            {"label": "Predicted (Next)", "value": predicted_next, "sub": "Based on recent monthly revenue"},
        ],
        "allTimeData": all_time_data,
        "thisMonthData": this_month_data,
        "thisWeekData": this_week_data,
        "topProducts": top_products,
        "topProductsChart": top_products_chart,
    }


@router.get("/suppliers")
def suppliers_overview(business: Optional[str] = None, db: Session = Depends(get_db)):
    """Supplier marketplace, personalized by the caller's purchase history.

    `business` is the identity the procurement agent records as
    PurchaseOrder.requested_by (the business email). Until business_id exists
    (TASK-12/13) this is how orders are attributed to a business.
    """
    # Same ordering the procurement agent uses to pick a supplier.
    suppliers = ranked_suppliers(db)

    # Products each supplier supplies to this business (the session is scoped).
    supplied = defaultdict(list)
    for code, supplier_code in db.query(models.Product.product_code, models.Product.supplier_code).all():
        if code and supplier_code:
            supplied[supplier_code].append(code)

    def supplier_card(supplier, index_rank=None, badge=None):
        pct = lambda value: f"{value:.0f}%" if value is not None else "-"
        return {
            "id": supplier.id,
            "name": supplier.name,
            "location": supplier.location or "-",
            "rating": round(float(supplier.rating or 0), 1),
            "rank": supplier.rank or index_rank,
            "badge": badge,
            "leadTime": f"{supplier.lead_time} days" if supplier.lead_time is not None else "-",
            "onTime": pct(supplier.on_time_delivery_rate),
            "quality": f"{supplier.quality_score:.0f}" if supplier.quality_score is not None else "-",
            "reliability": f"{supplier.reliability_score:.0f}" if supplier.reliability_score is not None else "-",
            "weightedScore": round(float(supplier.weighted_score or 0), 1),
            "riskScore": supplier.supply_risk_score,
            "contact": supplier.contact_number,
            "products": sorted(supplied.get(supplier.supplier_code, []), key=lambda c: (len(c), c)),
        }

    # Suppliers this business has actually ordered from, most-used first.
    order_counts = {}
    if business:
        order_counts = dict(
            db.query(models.PurchaseOrder.supplier_id, func.count(models.PurchaseOrder.id))
            .filter(func.lower(models.PurchaseOrder.requested_by) == business.strip().lower())
            .filter(models.PurchaseOrder.status == "created")
            .filter(models.PurchaseOrder.supplier_id.isnot(None))
            .group_by(models.PurchaseOrder.supplier_id)
            .all()
        )

    used = sorted(
        (supplier for supplier in suppliers if supplier.id in order_counts),
        key=lambda supplier: -order_counts[supplier.id],  # stable sort keeps rank order on ties
    )
    if used:
        my_suppliers = [
            supplier_card(supplier, badge=f"{order_counts[supplier.id]} order(s) placed")
            for supplier in used
        ]
    else:
        # No purchase history yet: start from the top-ranked suppliers.
        used = suppliers[:3]
        my_suppliers = [supplier_card(supplier) for supplier in used]

    used_ids = {supplier.id for supplier in used}
    recommended = []
    for index, supplier in enumerate(suppliers, start=1):
        if supplier.id in used_ids or len(recommended) >= 9:
            continue
        recommended.append(supplier_card(supplier, index_rank=index))

    categories = ["All"] + sorted({supplier["location"] for supplier in my_suppliers + recommended})

    return {
        "headerNote": "Partners & recommended suppliers — Ranked via Weighted Scoring Algorithm",
        "mySuppliers": my_suppliers,
        "recommended": recommended,
        "categories": categories,
    }



ANALYTICS_PERIODS = {"all", "month", "week"}


def analytics_window(db: Session, period: str):
    """(start, end, label) for the requested period, anchored on the latest sale
    date in the data (the dataset is historical, so "this month" means its latest
    month). start/end are None for all time."""
    latest = db.query(func.max(models.Sale.sale_date)).scalar()
    if period == "all" or latest is None:
        return None, None, "All time"
    if period == "month":
        start = latest.replace(day=1)
        return start, latest, latest.strftime("%B %Y")
    start = latest - timedelta(days=latest.weekday())
    return start, latest, f"{start.strftime('%d %b')} - {latest.strftime('%d %b %Y')}"


@router.get("/analytics")
def analytics_overview(period: str = "all", db: Session = Depends(get_db)):
    period = period if period in ANALYTICS_PERIODS else "all"
    start, end, period_label = analytics_window(db, period)

    def in_period(query):
        """Restrict a Sale query to the selected period."""
        if start is None:
            return query
        return query.filter(models.Sale.sale_date >= start, models.Sale.sale_date <= end)

    products = db.query(models.Product).all()
    suppliers = db.query(models.Supplier).all()
    predicted_revenue = predicted_revenue_expression()

    total_stock = sum(product.supplier_stock or 0 for product in products)
    total_quantity_sold = (
        in_period(db.query(func.coalesce(func.sum(func.coalesce(models.Sale.quantity_sold, 0)), 0)))
        .scalar()
        or 0
    )
    stock_turnover = round(total_quantity_sold / total_stock, 2) if total_stock else 0

    sold_product_codes = {
        row[0]
        for row in in_period(db.query(models.Sale.product_code))
        .filter(models.Sale.product_code.isnot(None))
        .distinct()
        .all()
    }
    dead_stock_count = sum(1 for product in products if product.product_code not in sold_product_codes)
    dead_stock_share = round((dead_stock_count / len(products)) * 100, 1) if products else 0

    reliability_scores = [s.reliability_score for s in suppliers if s.reliability_score is not None]
    supplier_reliability = round(sum(reliability_scores) / len(reliability_scores), 1) if reliability_scores else 0

    bucket = "day" if period == "week" else "week"
    weekly_rows = (
        in_period(
            db.query(
                func.date_trunc(bucket, models.Sale.sale_date).label("week_start"),
                func.coalesce(func.sum(models.Sale.revenue), 0.0).label("actual"),
                func.coalesce(func.sum(predicted_revenue), 0.0).label("predicted"),
            )
        )
        .filter(models.Sale.sale_date.isnot(None))
        .group_by("week_start")
        .order_by(desc("week_start"))
        .limit(4 if period == "all" else 7)
        .all()
    )
    accuracy_data = []
    accuracy_values = []
    for index, row in enumerate(reversed(weekly_rows), start=1):
        actual = currency_value(row.actual)
        predicted = currency_value(row.predicted)
        if actual > 0:
            accuracy_values.append(max(0.0, 100 - (abs(actual - predicted) / actual) * 100))
        accuracy_data.append(
            {
                "name": row.week_start.strftime("%a") if bucket == "day" else f"W{index}",
                "actual": round(actual, 2),
                "predicted": round(predicted, 2),
            }
        )
    while period != "week" and len(accuracy_data) < 4:
        accuracy_data.append({"name": f"W{len(accuracy_data) + 1}", "actual": 0, "predicted": 0})
    forecast_accuracy = round(sum(accuracy_values) / len(accuracy_values), 1) if accuracy_values else 0

    product_lookup = {
        product.product_code: product.category or "General"
        for product in products
        if product.product_code
    }
    product_revenue_rows = (
        in_period(
            db.query(
                models.Sale.product_code,
                func.coalesce(func.sum(models.Sale.revenue), 0.0).label("revenue"),
            )
        )
        .filter(models.Sale.product_code.isnot(None))
        .group_by(models.Sale.product_code)
        .all()
    )
    category_totals = defaultdict(float)
    for row in product_revenue_rows:
        category = product_lookup.get(row.product_code, "General")
        category_totals[category] += currency_value(row.revenue)
    category_data = [
        {"name": key, "value": round(value, 2)}
        for key, value in sorted(category_totals.items(), key=lambda item: item[1], reverse=True)[:5]
    ]

    weekday_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    weekday_map = {0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat"}
    weekday_expr = func.extract("dow", models.Sale.sale_date)
    demand_rows = (
        in_period(
            db.query(
                weekday_expr.label("weekday"),
                func.coalesce(func.sum(models.Sale.revenue), 0.0).label("revenue"),
            )
        )
        .filter(models.Sale.sale_date.isnot(None))
        .group_by(weekday_expr)
        .all()
    )
    demand_totals = {day: 0.0 for day in weekday_names}
    for row in demand_rows:
        label = weekday_map.get(int(row.weekday))
        if label:
            demand_totals[label] = currency_value(row.revenue)
    demand_data = [{"name": day, "value": round(demand_totals[day], 2)} for day in weekday_names]

    # Every supplier, best-ranked first, using the recorded delivery and quality
    # figures (this used to show only 4 suppliers with derived percentages).
    supplier_data = [
        {
            "name": supplier.name,
            "location": supplier.location or "-",
            "onTime": f"{supplier.on_time_delivery_rate:.0f}%" if supplier.on_time_delivery_rate is not None else "-",
            "quality": f"{supplier.quality_score:.0f}" if supplier.quality_score is not None else "-",
            "reliability": f"{supplier.reliability_score:.0f}" if supplier.reliability_score is not None else "-",
            "leadTime": f"{supplier.lead_time} days" if supplier.lead_time is not None else "-",
            "score": f"{supplier.weighted_score:.1f}" if supplier.weighted_score is not None else "-",
            "rank": supplier.rank,
            "signal": "Watch" if (supplier.supply_risk_score or 0) >= 3 else "Stable",
        }
        for supplier in sorted(suppliers, key=lambda s: (s.rank is None, s.rank or 0))
    ]

    return {
        "headerNote": f"Operational breakdowns - {period_label} - Live database data",
        "period": period,
        "periodLabel": period_label,
        "kpis": [
            {"label": "Stock Turnover", "value": f"{stock_turnover}x", "sub": "Units sold versus available stock"},
            {"label": "Dead Stock Share", "value": f"{dead_stock_share}%", "sub": "Products without recorded sales"},
            {"label": "Supplier Reliability", "value": f"{supplier_reliability}%", "sub": "Average recorded reliability score"},
            {"label": "Forecast Accuracy", "value": f"{forecast_accuracy}%", "sub": "Actual vs lag-based prediction"},
        ],
        "categoryData": category_data or [{"name": "General", "value": 0}],
        "demandData": demand_data,
        "supplierData": supplier_data,
    }


@router.get("/insights")
def insights_overview(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    suppliers = db.query(models.Supplier).all()
    sales_rows = (
        db.query(
            models.Sale.product_code,
            func.coalesce(func.sum(models.Sale.revenue), 0.0).label("revenue"),
        )
        .filter(models.Sale.product_code.isnot(None))
        .group_by(models.Sale.product_code)
        .order_by(desc("revenue"))
        .limit(3)
        .all()
    )

    statuses = {product.id: classify_stock(product.supplier_stock, product.reorder_level, product.stock_status) for product in products}
    critical_products = [p for p in products if statuses[p.id] == "critical"]
    low_products = [p for p in products if statuses[p.id] == "low"]
    restock = critical_products + low_products
    risky_suppliers = sorted(
        (supplier for supplier in suppliers if (supplier.supply_risk_score or 0) >= 3),
        key=lambda supplier: -(supplier.supply_risk_score or 0),
    )
    top_product = sales_rows[0] if sales_rows else None
    total_revenue = db.query(func.coalesce(func.sum(models.Sale.revenue), 0.0)).scalar() or 0.0
    names = lambda items: ", ".join(p.product_code or p.name for p in items)

    primary_suggestions = [
        {
            "title": f"Restock {names(restock)}" if restock else "Inventory is stable",
            "subtitle": "Inventory",
            "priority": "High" if critical_products else "Medium" if low_products else "Low",
            "impact": f"{len(critical_products)} critical, {len(low_products)} low" if restock else "No product near its reorder level",
            "action": "Review the reorder in Procurement AI" if restock else "No action needed",
            "reason": "These products are at or within 25% of their reorder level." if restock else "Every product is above its reorder threshold.",
        },
        {
            "title": f"Promote {top_product.product_code}" if top_product else "No sales leader yet",
            "subtitle": "Sales",
            "priority": "Medium" if top_product else "Low",
            "impact": (
                f"₹{currency_value(top_product.revenue):,.0f} revenue ({currency_value(top_product.revenue) / total_revenue * 100:.1f}% of total)"
                if top_product and total_revenue else "-"
            ),
            "action": "Feature your best seller" if top_product else "Wait for more sales data",
            "reason": "Your highest-revenue product; keeping it in stock and visible protects the most revenue." if top_product else "Not enough sales data yet.",
        },
        {
            "title": f"Review {', '.join(s.name for s in risky_suppliers)}" if risky_suppliers else "Supplier base looks stable",
            "subtitle": "Supplier",
            "priority": "Medium" if risky_suppliers else "Low",
            "impact": (
                "; ".join(f"risk {s.supply_risk_score}/5, lead time {s.lead_time} days" for s in risky_suppliers)
                if risky_suppliers else "No supplier with risk score 3 or more"
            ),
            "action": "Follow up or line up an alternative supplier" if risky_suppliers else "No action needed",
            "reason": "A supply risk score of 3/5 or higher means delays are more likely." if risky_suppliers else "All suppliers are within acceptable risk.",
        },
    ]

    return {
        "headerNote": "Suggestions from your current stock, sales and suppliers - Live database data",
        "kpis": [
            {"label": "Action Items", "value": str(len(restock) + len(risky_suppliers)), "sub": "Restocks and supplier reviews"},
            {"label": "Products to Restock", "value": str(len(restock)), "sub": f"{len(critical_products)} critical · {len(low_products)} low"},
            {"label": "Suppliers to Review", "value": str(len(risky_suppliers)), "sub": "Supply risk score 3/5 or higher"},
        ],
        "primarySuggestions": primary_suggestions,
    }


@router.get("/alerts")
def alerts_overview(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    suppliers = db.query(models.Supplier).all()

    critical_products = [
        product for product in products
        if classify_stock(product.supplier_stock, product.reorder_level, product.stock_status) == "critical"
    ]
    low_products = [
        product for product in products
        if classify_stock(product.supplier_stock, product.reorder_level, product.stock_status) == "low"
    ]
    risky_suppliers = [supplier for supplier in suppliers if (supplier.supply_risk_score or 0) >= 3]

    monthly_rows = (
        db.query(
            func.date_trunc("month", models.Sale.sale_date).label("month_start"),
            func.coalesce(func.sum(models.Sale.revenue), 0.0).label("revenue"),
        )
        .filter(models.Sale.sale_date.isnot(None))
        .group_by("month_start")
        .order_by("month_start")
        .all()
    )
    sales_drop = False
    if len(monthly_rows) >= 2:
        sales_drop = currency_value(monthly_rows[-1].revenue) < currency_value(monthly_rows[-2].revenue)

    inventory_alerts = [
        {
            "title": f"{product.product_code} needs immediate restock",
            "subtitle": "Inventory",
            "severity": "High",
            "status": "Open",
            "note": f"Stock {product.supplier_stock or 0} is at or below reorder level {product.reorder_level or 0}.",
        }
        for product in critical_products[:2]
    ] or [
        {
            "title": "No low stock alert",
            "subtitle": "Inventory",
            "severity": "Low",
            "status": "Resolved",
            "note": "No stock-level issue detected right now.",
        }
    ]

    sales_alerts = []
    if sales_drop:
        sales_alerts.append(
            {
                "title": "Monthly revenue has dropped",
                "subtitle": "Sales",
                "severity": "Medium",
                "status": "Open",
                "note": "Latest month revenue is below the previous month.",
            }
        )
    if low_products:
        sales_alerts.append(
            {
                "title": "Low stock may affect future sales",
                "subtitle": "Sales",
                "severity": "Medium",
                "status": "Open",
                "note": f"{len(low_products)} products are close to reorder level.",
            }
        )
    if not sales_alerts:
        sales_alerts = [
            {
                "title": "No sales anomaly alert",
                "subtitle": "Sales",
                "severity": "Low",
                "status": "Resolved",
                "note": "Sales activity looks stable across current data.",
            }
        ]

    system_alerts = [
        {
            "title": f"Supplier risk raised for {supplier.name}",
            "subtitle": "Operations",
            "severity": "Medium" if (supplier.supply_risk_score or 0) == 3 else "High",
            "status": "Open",
            "note": f"Risk score is {supplier.supply_risk_score or 0}. Review lead time and fill rate.",
        }
        for supplier in risky_suppliers[:2]
    ] or [
        {
            "title": "No supplier risk alert",
            "subtitle": "Operations",
            "severity": "Low",
            "status": "Resolved",
            "note": "No supplier-related issue detected right now.",
        }
    ]

    recent_table = [
        {"type": "Inventory", "alert": item["title"], "severity": item["severity"], "status": item["status"]}
        for item in inventory_alerts
    ] + [
        {"type": "Sales", "alert": item["title"], "severity": item["severity"], "status": item["status"]}
        for item in sales_alerts
    ] + [
        {"type": "Operations", "alert": item["title"], "severity": item["severity"], "status": item["status"]}
        for item in system_alerts
    ]

    return {
        "headerNote": "Important business warnings and activity flags - Live database data",
        "kpis": [
            {"label": "Total Alerts", "value": str(len(recent_table)), "sub": "Current combined attention points"},
            {"label": "Inventory Alerts", "value": str(len(inventory_alerts)), "sub": "Stock-related issues"},
            {"label": "Sales Alerts", "value": str(len(sales_alerts)), "sub": "Revenue and demand warnings"},
            {"label": "System Alerts", "value": str(len(system_alerts)), "sub": "Supplier and operations flags"},
        ],
        "inventoryAlerts": inventory_alerts,
        "salesAlerts": sales_alerts,
        "systemAlerts": system_alerts,
        "recentTable": recent_table[:6],
    }
