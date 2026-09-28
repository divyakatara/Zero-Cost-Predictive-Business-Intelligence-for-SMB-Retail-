from datetime import timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from routes.business_pages import classify_stock

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


def _average(values):
    values = [float(v) for v in values if v is not None]
    return sum(values) / len(values) if values else None


def _units_sold(db: Session, product_codes, start, end):
    if not product_codes:
        return 0
    return int(
        db.query(func.coalesce(func.sum(models.Sale.quantity_sold), 0))
        .filter(models.Sale.product_code.in_(product_codes))
        .filter(models.Sale.sale_date >= start, models.Sale.sale_date <= end)
        .scalar()
        or 0
    )


def _pricing_suggestion(supplier, peer_cost):
    """Compare this supplier's average cost with the average across suppliers."""
    if supplier.average_cost is None or not peer_cost:
        return None, {
            "title": "No cost data yet",
            "priority": "Priority 0",
            "impact": "-",
            "action": "Add average cost data",
            "reason": "No average cost is recorded for this supplier to compare against others.",
        }

    cost_diff = (supplier.average_cost - peer_cost) / peer_cost * 100
    impact = f"Avg cost ₹{supplier.average_cost:.2f} vs ₹{peer_cost:.2f}"
    if cost_diff > 5:
        return cost_diff, {
            "title": f"Pricing is {cost_diff:.0f}% above the supplier average",
            "priority": "Priority 3",
            "impact": impact,
            "action": "Review unit pricing to stay competitive",
            "reason": "Retailers rank suppliers partly on cost, so higher prices lower your ranking.",
        }
    if cost_diff < -5:
        return cost_diff, {
            "title": f"Pricing is {abs(cost_diff):.0f}% below the supplier average",
            "priority": "Priority 1",
            "impact": impact,
            "action": "Highlight your cost advantage to retailers",
            "reason": "Your cost is a competitive strength in supplier ranking.",
        }
    return cost_diff, {
        "title": "Pricing is in line with other suppliers",
        "priority": "Priority 0",
        "impact": impact,
        "action": "No action needed",
        "reason": "Your average cost is within 5% of the supplier average.",
    }


@router.get("/{supplier_code}/insights")
def supplier_insights(supplier_code: str, db: Session = Depends(get_db)):
    """Insights for one supplier, built only from that supplier's own records:
    retailer stock of the products it supplies, recent demand for them, its
    delivery/cost metrics compared with other suppliers, and the simulated
    purchase orders placed with it.

    Same response shape as /business-pages/insights so the pages render alike.
    """
    supplier = db.query(models.Supplier).filter(models.Supplier.supplier_code == supplier_code).first()
    if supplier is None:
        raise HTTPException(status_code=404, detail="No supplier record matches this supplier ID.")

    peers = db.query(models.Supplier).filter(models.Supplier.supplier_code.isnot(None)).all()
    peer_on_time = _average(s.on_time_delivery_rate for s in peers)
    peer_lead_time = _average(s.lead_time for s in peers)

    # Retailer stock of the products this supplier provides, most urgent first.
    products = db.query(models.Product).filter(models.Product.supplier_code == supplier_code).all()
    restock_needed = [
        (product, status)
        for product in products
        if (status := classify_stock(product.supplier_stock, product.reorder_level, product.stock_status)) in ("critical", "low")
    ]
    restock_needed.sort(key=lambda item: (item[0].supplier_stock or 0) / max(item[0].reorder_level or 1, 1))

    # Demand for this supplier's products: latest 30 days of sales vs the 30 before.
    product_codes = [p.product_code for p in products if p.product_code]
    latest_sale_date = db.query(func.max(models.Sale.sale_date)).scalar()
    units_recent = units_previous = 0
    if latest_sale_date:
        window_start = latest_sale_date - timedelta(days=29)
        units_recent = _units_sold(db, product_codes, window_start, latest_sale_date)
        units_previous = _units_sold(db, product_codes, window_start - timedelta(days=30), window_start - timedelta(days=1))
    demand_note = (
        f"{(units_recent - units_previous) / units_previous * 100:+.0f}% vs previous 30 days"
        if units_previous
        else "No earlier period to compare"
    )

    # Simulated (internal) purchase orders from the procurement agent.
    orders = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.supplier_id == supplier.id).all()
    created_orders = [o for o in orders if o.status == "created"]
    awaiting_orders = [o for o in orders if o.status == "awaiting_approval"]

    # Delivery risk flags, relative to the other suppliers.
    delivery_flags = []
    if supplier.on_time_delivery_rate is not None and peer_on_time is not None and supplier.on_time_delivery_rate < peer_on_time:
        delivery_flags.append(f"On-time delivery {supplier.on_time_delivery_rate:.0f}% is below the supplier average of {peer_on_time:.0f}%.")
    if supplier.lead_time is not None and peer_lead_time is not None and supplier.lead_time > peer_lead_time:
        delivery_flags.append(f"Lead time of {supplier.lead_time} days is longer than the supplier average of {peer_lead_time:.1f} days.")
    if (supplier.supply_risk_score or 0) >= 3:
        delivery_flags.append(f"Supply risk score is elevated ({supplier.supply_risk_score}).")

    cost_diff, pricing = _pricing_suggestion(supplier, _average(s.average_cost for s in peers))

    if restock_needed:
        product, status = restock_needed[0]
        inventory = {
            "title": f"Prepare a restock of {product.product_code or product.name}",
            "priority": f"Priority {min(5, len(restock_needed))}",
            "impact": f"{len(restock_needed)} product(s) at or near reorder level",
            "action": "Confirm available supply for an incoming order",
            "reason": f"Retailer stock is {product.supplier_stock or 0} units against a reorder level of {product.reorder_level or 0} ({status}).",
        }
    else:
        inventory = {
            "title": "Retailer stock of your products is healthy",
            "priority": "Priority 0",
            "impact": f"{len(products)} product(s) supplied",
            "action": "No action needed",
            "reason": "None of your products are at or near their reorder level." if products else "No products are linked to this supplier yet.",
        }

    delivery = {
        "title": "Improve delivery performance" if delivery_flags else "Delivery performance is on track",
        "priority": f"Priority {min(5, len(delivery_flags))}",
        "impact": f"{len(delivery_flags)} risk flag(s)",
        "action": "Reduce lead time and late deliveries" if delivery_flags else "No action needed",
        "reason": " ".join(delivery_flags) or "On-time rate, lead time, and risk score are at or better than the supplier average.",
    }

    ranked_count = sum(1 for s in peers if s.rank is not None)

    return {
        "headerNote": f"Insights for {supplier.supplier_name or supplier.name} ({supplier.supplier_code}) - Live database data",
        "kpis": [
            {"label": "Action Items", "value": str(len(restock_needed) + len(delivery_flags)), "sub": "Restocks and delivery risks"},
            {"label": "Order Opportunities", "value": str(len(restock_needed)), "sub": "Your products near reorder level"},
            {"label": "Delivery Risks", "value": str(len(delivery_flags)), "sub": "Compared with other suppliers"},
            {
                "label": "Performance Score",
                "value": f"{supplier.weighted_score:.0f}%" if supplier.weighted_score is not None else "-",
                "sub": f"Rank #{supplier.rank} of {ranked_count} suppliers" if supplier.rank else "Not ranked yet",
            },
        ],
        "primarySuggestions": [
            {**pricing, "subtitle": "Pricing"},
            {**inventory, "subtitle": "Inventory"},
            {**delivery, "subtitle": "Delivery"},
        ],
        "recommendationCards": [
            {"title": "Demand for your products", "value": f"{units_recent} units", "note": f"Last 30 days · {demand_note}"},
            {
                "title": "Lead time",
                "value": f"{supplier.lead_time} days" if supplier.lead_time is not None else "-",
                "note": f"Supplier average {peer_lead_time:.1f} days" if peer_lead_time is not None else "No comparison data",
            },
            {"title": "Products to restock", "value": str(len(restock_needed)), "note": f"Out of {len(products)} product(s) you supply"},
            {
                "title": "Simulated orders placed",
                "value": str(len(created_orders)),
                "note": f"{sum(o.quantity or 0 for o in created_orders)} units · {len(awaiting_orders)} awaiting retailer approval",
            },
        ],
        "suggestionTable": [
            {
                "area": "Orders",
                "suggestion": "Prepare for incoming retailer orders" if awaiting_orders else "No orders awaiting approval",
                "signal": f"{len(awaiting_orders)} awaiting approval",
                "status": "Action" if awaiting_orders else "Stable",
            },
            {"area": "Inventory", "suggestion": inventory["action"], "signal": inventory["impact"], "status": "Action" if restock_needed else "Stable"},
            {"area": "Delivery", "suggestion": delivery["action"], "signal": delivery["impact"], "status": "Review" if delivery_flags else "Stable"},
            {"area": "Pricing", "suggestion": pricing["action"], "signal": pricing["impact"], "status": "Review" if cost_diff is not None and cost_diff > 5 else "Stable"},
        ],
    }
