from collections import defaultdict
from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

import models
from database import get_db

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
    products = db.query(models.Product).order_by(models.Product.product_code.asc()).all()
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
                "name": product.product_code or product.name,
                "category": product.category or product.location or "General",
                "qty": product.supplier_stock or 0,
                "reorder": product.reorder_level or 0,
                "status": status,
                "unit": "units",
                "supplier": product.supplier_name or product.supplier_code or "-",
                "updated": product.branch_id or "-",
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
    latest_sale_date = db.query(func.max(models.Sale.sale_date)).scalar()
    predicted_revenue = predicted_revenue_expression()

    total_revenue = db.query(func.coalesce(func.sum(models.Sale.revenue), 0.0)).scalar() or 0.0
    total_orders = db.query(func.count(models.Sale.id)).scalar() or 0
    avg_order_value = total_revenue / total_orders if total_orders else 0.0

    monthly_rows = (
        db.query(
            func.date_trunc("month", models.Sale.sale_date).label("month_start"),
            func.coalesce(func.sum(models.Sale.revenue), 0.0).label("actual"),
            func.coalesce(func.sum(predicted_revenue), 0.0).label("predicted"),
        )
        .filter(models.Sale.sale_date.isnot(None))
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
            db.query(
                week_number_expr,
                func.coalesce(func.sum(models.Sale.revenue), 0.0).label("actual"),
                func.coalesce(func.sum(predicted_revenue), 0.0).label("predicted"),
            )
            .filter(func.extract("year", models.Sale.sale_date) == latest_sale_date.year)
            .filter(func.extract("month", models.Sale.sale_date) == latest_sale_date.month)
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
            db.query(
                models.Sale.sale_date,
                func.coalesce(func.sum(models.Sale.revenue), 0.0).label("actual"),
                func.coalesce(func.sum(predicted_revenue), 0.0).label("predicted"),
            )
            .filter(models.Sale.sale_date >= start_of_week)
            .filter(models.Sale.sale_date <= start_of_week + timedelta(days=6))
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
        db.query(
            models.Sale.product_code,
            func.coalesce(func.sum(models.Sale.revenue), 0.0).label("revenue"),
            func.coalesce(func.sum(models.Sale.quantity_sold), 0).label("units"),
        )
        .filter(models.Sale.product_code.isnot(None))
        .group_by(models.Sale.product_code)
        .order_by(desc("revenue"))
        .limit(5)
        .all()
    )
    top_products = [
        {
            "name": row.product_code,
            "revenue": currency_value(row.revenue),
            "units": int(row.units or 0),
            "trend": "up" if index % 2 == 0 else "down",
        }
        for index, row in enumerate(top_product_rows)
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
def suppliers_overview(db: Session = Depends(get_db)):
    suppliers = (
        db.query(models.Supplier)
        .filter(models.Supplier.supplier_code.isnot(None))
        .order_by(desc(models.Supplier.rating), models.Supplier.lead_time.asc())
        .all()
    )

    def supplier_card(supplier, rank=None, badge=None):
        return {
            "id": supplier.id,
            "name": supplier.supplier_name or supplier.name,
            "category": supplier.location or "General",
            "rating": round(float(supplier.rating or 0), 1),
            "reviews": int((supplier.stock_utilization_rate or 0) / 10),
            "status": "Active",
            "since": supplier.branch_id or "Imported",
            "tags": [value for value in [supplier.product_code, supplier.contact_number, supplier.stock_status] if value] or ["No tags"],
            "leadTime": f"{supplier.lead_time or 0} days",
            "fillRate": f"{max(0, 100 - (supplier.supply_risk_score or 0) * 10)}%",
            "onTime": f"{max(0, 100 - (supplier.lead_time or 0) * 5)}%",
            "contact": supplier.contact_number or "No contact info",
            "phone": supplier.contact_number or "No phone",
            "location": supplier.location or "No location",
            "desc": f"Supplier stock: {supplier.supplier_stock or 0} units - Risk score {supplier.supply_risk_score or 0}",
            "rank": rank,
            "badge": badge,
        }

    my_suppliers = [supplier_card(supplier) for supplier in suppliers[:3]]
    recommended = []
    for index, supplier in enumerate(suppliers[3:12], start=1):
        badge = "Top Rated" if index == 1 else "Highly Rated" if index <= 3 else None
        recommended.append(supplier_card(supplier, rank=index, badge=badge))

    categories = ["All"] + sorted({supplier["category"] for supplier in my_suppliers + recommended})

    return {
        "headerNote": "Your partners & recommended suppliers - Ranked from database",
        "mySuppliers": my_suppliers,
        "recommended": recommended,
        "categories": categories,
    }


@router.get("/analytics")
def analytics_overview(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    suppliers = db.query(models.Supplier).all()
    predicted_revenue = predicted_revenue_expression()

    total_stock = sum(product.supplier_stock or 0 for product in products)
    total_quantity_sold = (
        db.query(func.coalesce(func.sum(func.coalesce(models.Sale.quantity_sold, models.Sale.quantity, 0)), 0))
        .scalar()
        or 0
    )
    stock_turnover = round(total_quantity_sold / total_stock, 2) if total_stock else 0

    sold_product_codes = {
        row[0]
        for row in db.query(models.Sale.product_code)
        .filter(models.Sale.product_code.isnot(None))
        .distinct()
        .all()
    }
    dead_stock_count = sum(1 for product in products if product.product_code not in sold_product_codes)
    dead_stock_share = round((dead_stock_count / len(products)) * 100, 1) if products else 0

    supplier_reliability = round((sum(float(s.rating or 0) for s in suppliers) / len(suppliers)) / 5 * 100, 1) if suppliers else 0

    weekly_rows = (
        db.query(
            func.date_trunc("week", models.Sale.sale_date).label("week_start"),
            func.coalesce(func.sum(models.Sale.revenue), 0.0).label("actual"),
            func.coalesce(func.sum(predicted_revenue), 0.0).label("predicted"),
        )
        .filter(models.Sale.sale_date.isnot(None))
        .group_by("week_start")
        .order_by(desc("week_start"))
        .limit(4)
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
                "name": f"W{index}",
                "actual": round(actual, 2),
                "predicted": round(predicted, 2),
            }
        )
    while len(accuracy_data) < 4:
        accuracy_data.append({"name": f"W{len(accuracy_data) + 1}", "actual": 0, "predicted": 0})
    forecast_accuracy = round(sum(accuracy_values) / len(accuracy_values), 1) if accuracy_values else 0

    product_lookup = {
        product.product_code: product.category or product.location or "General"
        for product in products
        if product.product_code
    }
    product_revenue_rows = (
        db.query(
            models.Sale.product_code,
            func.coalesce(func.sum(models.Sale.revenue), 0.0).label("revenue"),
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
        db.query(
            weekday_expr.label("weekday"),
            func.coalesce(func.sum(models.Sale.revenue), 0.0).label("revenue"),
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

    matrix_rows = (
        db.query(
            models.Sale.product_code,
            func.coalesce(func.sum(func.coalesce(models.Sale.quantity_sold, models.Sale.quantity, 0)), 0).label("qty"),
            func.coalesce(func.sum(models.Sale.revenue), 0.0).label("revenue"),
            func.coalesce(func.sum(models.Sale.profit), 0.0).label("profit"),
        )
        .filter(models.Sale.product_code.isnot(None))
        .group_by(models.Sale.product_code)
        .order_by(desc("revenue"))
        .limit(4)
        .all()
    )
    matrix_data = []
    for row in matrix_rows:
        revenue = currency_value(row.revenue)
        profit = currency_value(row.profit)
        margin = (profit / revenue * 100) if revenue else 0
        matrix_data.append(
            {
                "name": row.product_code,
                "velocity": f"{int(row.qty or 0)} units sold",
                "margin": f"{margin:.1f}%",
                "note": f"Revenue {revenue:.0f} - Profit {profit:.0f}",
            }
        )

    supplier_data = []
    for supplier in suppliers[:4]:
        supplier_data.append(
            {
                "name": supplier.supplier_name or supplier.name,
                "category": supplier.location or "General",
                "fillRate": f"{max(0, 100 - (supplier.supply_risk_score or 0) * 10)}%",
                "onTime": f"{max(0, 100 - (supplier.lead_time or 0) * 5)}%",
                "variance": f"{(supplier.supply_risk_score or 0) * 10}%",
                "signal": "Stable" if (supplier.supply_risk_score or 0) <= 2 else "Watch",
            }
        )

    return {
        "headerNote": "Operational breakdowns - Live database data",
        "kpis": [
            {"label": "Stock Turnover", "value": f"{stock_turnover}x", "sub": "Units sold versus available stock"},
            {"label": "Dead Stock Share", "value": f"{dead_stock_share}%", "sub": "Products without recorded sales"},
            {"label": "Supplier Reliability", "value": f"{supplier_reliability}%", "sub": "Derived from supplier ratings"},
            {"label": "Forecast Accuracy", "value": f"{forecast_accuracy}%", "sub": "Actual vs lag-based prediction"},
        ],
        "categoryData": category_data or [{"name": "General", "value": 0}],
        "demandData": demand_data,
        "accuracyData": accuracy_data,
        "matrixData": matrix_data or [{"name": "No product", "velocity": "0 units sold", "margin": "0%", "note": "Waiting for sales data"}],
        "supplierData": supplier_data or [{"name": "No supplier", "category": "General", "fillRate": "0%", "onTime": "0%", "variance": "0%", "signal": "Waiting"}],
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

    critical_products = [
        product for product in products
        if classify_stock(product.supplier_stock, product.reorder_level, product.stock_status) == "critical"
    ]
    risky_suppliers = [supplier for supplier in suppliers if (supplier.supply_risk_score or 0) >= 3]
    top_product = sales_rows[0] if sales_rows else None

    action_items = len(critical_products) + len(risky_suppliers)
    sales_opportunities = len(sales_rows)
    risk_flags = len(risky_suppliers)
    priority_score = min(100, (action_items + sales_opportunities) * 10)

    primary_suggestions = [
        {
            "title": f"Restock {critical_products[0].product_code}" if critical_products else "Inventory is stable",
            "subtitle": "Inventory",
            "priority": f"Priority {min(5, len(critical_products))}",
            "impact": f"{len(critical_products)} critical items" if critical_products else "0 critical items",
            "action": "Review reorder quantities" if critical_products else "No action needed",
            "reason": "Some products are at or below reorder level." if critical_products else "Current stock levels look healthy.",
        },
        {
            "title": f"Push demand for {top_product.product_code}" if top_product else "No sales leader yet",
            "subtitle": "Sales",
            "priority": f"Priority {2 if top_product else 0}",
            "impact": f"Revenue {currency_value(top_product.revenue):.0f}" if top_product else "0",
            "action": "Promote top-selling product" if top_product else "Wait for more sales data",
            "reason": "Highest-revenue product can be highlighted for repeat orders." if top_product else "Not enough sales data yet.",
        },
        {
            "title": f"Review {risky_suppliers[0].supplier_name or risky_suppliers[0].name}" if risky_suppliers else "Supplier base looks stable",
            "subtitle": "Supplier",
            "priority": f"Priority {min(5, len(risky_suppliers))}",
            "impact": f"{len(risky_suppliers)} risky suppliers" if risky_suppliers else "0 risk flags",
            "action": "Follow up with supplier" if risky_suppliers else "No action needed",
            "reason": "Higher supply risk scores need attention." if risky_suppliers else "Suppliers are within acceptable risk.",
        },
    ]

    recommendation_cards = [
        {"title": "Boost repeat orders", "value": str(sales_opportunities), "note": "Top products ready for promotion"},
        {"title": "Reduce lost sales", "value": str(len(critical_products)), "note": "Critical items to restock"},
        {"title": "Improve stock timing", "value": str(sum(1 for p in products if classify_stock(p.supplier_stock, p.reorder_level, p.stock_status) == 'low')), "note": "Low-stock products to monitor"},
        {"title": "Cut supply delays", "value": str(len(risky_suppliers)), "note": "Suppliers with elevated risk"},
    ]

    suggestion_table = [
        {"area": "Sales", "suggestion": primary_suggestions[1]["action"], "confidence": "72%" if top_product else "0%", "status": "Ready" if top_product else "Waiting"},
        {"area": "Inventory", "suggestion": primary_suggestions[0]["action"], "confidence": "88%" if critical_products else "40%", "status": "Action" if critical_products else "Stable"},
        {"area": "Supplier", "suggestion": primary_suggestions[2]["action"], "confidence": "70%" if risky_suppliers else "35%", "status": "Review" if risky_suppliers else "Stable"},
        {"area": "Operations", "suggestion": "Track demand and supply daily", "confidence": "60%", "status": "Monitor"},
    ]

    return {
        "headerNote": "Smart suggestions to improve sales and business performance - Live database data",
        "kpis": [
            {"label": "Action Items", "value": str(action_items), "sub": "Combined stock and supplier actions"},
            {"label": "Sales Opportunities", "value": str(sales_opportunities), "sub": "Products with strong demand"},
            {"label": "Risk Flags", "value": str(risk_flags), "sub": "Suppliers needing review"},
            {"label": "Priority Score", "value": f"{priority_score}%", "sub": "Overall urgency score"},
        ],
        "primarySuggestions": primary_suggestions,
        "recommendationCards": recommendation_cards,
        "suggestionTable": suggestion_table,
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
            "title": f"Supplier risk raised for {supplier.supplier_name or supplier.name}",
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
