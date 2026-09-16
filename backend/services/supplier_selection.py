"""Supplier selection for the Agentic AI procurement workflow.

This does NOT recompute supplier scores — it reuses the weighted_score/rank
values already produced by the existing rule-based scoring pipeline
(csv_loader.py, at data-ingestion time) and already surfaced on the Supplier
Marketplace page. Recomputing scoring logic here would create exactly the
kind of duplicate scoring system this task explicitly says to avoid.

Known limitation (documented rather than silently worked around): the current
schema links each Product to at most one Supplier via `Product.supplier_id`
(see models.py), so there is no per-product supplier catalog with multiple
eligible bidders. The agent therefore recommends the product's assigned
supplier when one exists and is viable, and otherwise/also surfaces the
best globally-ranked alternative suppliers by weighted_score so the user
still gets a ranked choice rather than a dead end.
"""

from typing import Optional

from sqlalchemy import desc
from sqlalchemy.orm import Session

import models

MAX_ALTERNATIVES = 5


def _supplier_reasons(supplier: "models.Supplier") -> list[str]:
    reasons = []
    if supplier.weighted_score is not None:
        reasons.append(f"Weighted score {round(supplier.weighted_score, 1)}/100 (rank #{supplier.rank or 'n/a'}).")
    if supplier.quality_score is not None:
        reasons.append(f"Quality score {round(supplier.quality_score, 1)}.")
    if supplier.on_time_delivery_rate is not None:
        reasons.append(f"On-time delivery rate {round(supplier.on_time_delivery_rate, 1)}%.")
    if supplier.lead_time is not None:
        reasons.append(f"Lead time {supplier.lead_time} day(s).")
    if supplier.supply_risk_score is not None:
        reasons.append(f"Supply risk score {supplier.supply_risk_score}/5 (lower is safer).")
    if not reasons:
        reasons.append("No scoring data is available for this supplier yet.")
    return reasons


def _supplier_card(supplier: "models.Supplier", is_assigned: bool) -> dict:
    return {
        "supplier_id": supplier.id,
        "supplier_code": supplier.supplier_code,
        "name": supplier.supplier_name or supplier.name,
        "is_assigned_supplier": is_assigned,
        "weighted_score": supplier.weighted_score,
        "rank": supplier.rank,
        "quality_score": supplier.quality_score,
        "on_time_delivery_rate": supplier.on_time_delivery_rate,
        "lead_time_days": supplier.lead_time,
        "supply_risk_score": supplier.supply_risk_score,
        "reasons": _supplier_reasons(supplier),
    }


def _resolve_assigned_supplier(db: Session, product: "models.Product") -> Optional["models.Supplier"]:
    """Product.supplier_id (the relational FK) is frequently NULL even when a
    supplier is clearly assigned via the CSV-populated `supplier_code`/
    `supplier_name` fields (the same legacy dual-column issue that affects
    Sale.product_id vs Sale.product_code elsewhere in this codebase). Fall
    back to supplier_code so an already-known assignment isn't ignored.
    """
    if product.supplier:
        return product.supplier
    if product.supplier_code:
        return (
            db.query(models.Supplier)
            .filter(models.Supplier.supplier_code == product.supplier_code)
            .first()
        )
    return None


def recommend_suppliers(db: Session, product: "models.Product") -> dict:
    """Return the recommended supplier plus ranked alternatives for a product.

    Handles the no-supplier case explicitly rather than raising, so callers
    (the orchestrator, the API layer) can decide how to present it.
    """
    assigned = _resolve_assigned_supplier(db, product)

    ranked_query = (
        db.query(models.Supplier)
        .filter(models.Supplier.supplier_code.isnot(None))
        .order_by(models.Supplier.weighted_score.isnot(None).desc(), desc(models.Supplier.weighted_score))
    )
    ranked_all = ranked_query.all()

    if not ranked_all:
        return {
            "has_supplier": False,
            "recommended": None,
            "alternatives": [],
            "message": "No suppliers are available in the system yet.",
        }

    alternatives_pool = [s for s in ranked_all if not assigned or s.id != assigned.id]
    alternatives = [_supplier_card(s, is_assigned=False) for s in alternatives_pool[:MAX_ALTERNATIVES]]

    if assigned:
        recommended = _supplier_card(assigned, is_assigned=True)
        message = f"{recommended['name']} is this product's assigned supplier."
    else:
        top = ranked_all[0]
        recommended = _supplier_card(top, is_assigned=False)
        alternatives = [_supplier_card(s, is_assigned=False) for s in ranked_all[1 : MAX_ALTERNATIVES + 1]]
        message = f"No supplier is assigned to this product; {recommended['name']} is the top-ranked available supplier."

    return {
        "has_supplier": True,
        "recommended": recommended,
        "alternatives": alternatives,
        "message": message,
    }
