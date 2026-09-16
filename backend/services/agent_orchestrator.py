"""Orchestrator for the human-in-the-loop Agentic AI procurement workflow.

This module is the single place that coordinates:
    replenishment analysis -> supplier recommendation -> message drafting
    -> persisting a draft -> approval-gated order creation -> action logging

Deliberately NOT split across route handlers or pushed into the frontend, so
the workflow has one source of truth for its state machine and every
transition is validated here rather than trusted from the client.

State machine (see models.PurchaseOrder.status):
    draft -> awaiting_approval -> approved -> created
                                -> rejected
    Any step that raises is logged as an "error" AgentAction; the order (if
    one was already created) is marked "failed" rather than left inconsistent.

No step in this file ever marks an order "approved" or "created" without an
explicit call to `approve_draft`, and `approve_draft`/`reject_draft` both
refuse to act unless the order is currently `awaiting_approval` — this is
what guarantees the agent can never approve its own recommendation.
"""

from typing import Optional

from sqlalchemy.orm import Session

import models
from services import gemini_helper, replenishment, supplier_selection

VALID_TRANSITIONS = {
    "draft": {"awaiting_approval", "failed"},
    "awaiting_approval": {"approved", "rejected", "cancelled", "failed"},
    "approved": {"created", "failed"},
}


class AgentWorkflowError(Exception):
    """Raised for a well-understood workflow problem (bad state, no data, ...)."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _log(db: Session, *, purchase_order_id: Optional[int], product_id: Optional[int],
         action_type: str, status: str, message: str, actor: str = "agent",
         details: Optional[str] = None, error_detail: Optional[str] = None) -> "models.AgentAction":
    action = models.AgentAction(
        purchase_order_id=purchase_order_id,
        product_id=product_id,
        action_type=action_type,
        status=status,
        message=message,
        details=details,
        actor=actor,
        error_detail=error_detail,
    )
    db.add(action)
    db.commit()
    db.refresh(action)
    return action


def _explanation_prompt(analysis: dict, supplier_info: dict) -> str:
    facts = "\n".join(f"- {line}" for line in analysis["reasoning"])
    supplier_line = supplier_info.get("message", "No supplier information is available.")
    return (
        "You are a procurement assistant inside a retail ERP. Explain the following reorder "
        "recommendation to a small-business owner in 2-4 plain sentences. Use only the facts given — "
        "never invent numbers. Do not use bracketed labels, markdown bold, or asterisks.\n\n"
        f"Product: {analysis['product_name']}\n"
        f"Recommended order quantity: {analysis['recommended_quantity']} units\n"
        f"Facts:\n{facts}\n"
        f"Supplier note: {supplier_line}"
    )


def _fallback_explanation(analysis: dict) -> str:
    return " ".join(analysis["reasoning"] + [
        f"The agent recommends ordering {analysis['recommended_quantity']} units."
    ])


def _message_prompt(analysis: dict, supplier: dict) -> str:
    return (
        "Draft a short, professional procurement email to a supplier requesting a reorder. "
        "Use only the facts given. Do not use bracketed labels, markdown bold, or asterisks. "
        "Sign off as 'Procurement Team'.\n\n"
        f"Supplier: {supplier['name']}\n"
        f"Product: {analysis['product_name']}\n"
        f"Requested quantity: {analysis['recommended_quantity']} units\n"
        f"Current stock: {analysis['current_stock']} units (reorder level {analysis['reorder_level']})\n"
    )


def _fallback_message(analysis: dict, supplier: dict) -> str:
    return (
        f"Hello {supplier['name']},\n\n"
        f"We would like to place a reorder for {analysis['product_name']}. Based on our current stock "
        f"({analysis['current_stock']} units, against a reorder level of {analysis['reorder_level']}) and "
        f"recent sales activity, we are requesting {analysis['recommended_quantity']} units.\n\n"
        "Please confirm availability, pricing, and the earliest possible delivery date.\n\n"
        "Thank you,\nProcurement Team"
    )


def get_replenishment_candidates(db: Session) -> list[dict]:
    return replenishment.list_replenishment_candidates(db)


def get_product_analysis(db: Session, product_id: int) -> dict:
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise AgentWorkflowError("Product not found.", status_code=404)
    return replenishment.analyze_product(db, product)


def get_supplier_recommendation(db: Session, product_id: int) -> dict:
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise AgentWorkflowError("Product not found.", status_code=404)
    return supplier_selection.recommend_suppliers(db, product)


def create_draft(db: Session, product_id: int, requested_by: Optional[str] = None) -> "models.PurchaseOrder":
    """Run the full analysis pipeline and persist a draft awaiting approval.

    Raises AgentWorkflowError (never a bare exception) for expected problems:
    missing product, a product that isn't flagged for replenishment, or an
    unexpected internal error (logged as an "error" AgentAction first).

    If a draft is already awaiting approval for this product, that existing
    draft is returned instead of creating a duplicate — repeatedly opening
    the same recommendation in the UI must not pile up parallel drafts.
    """
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise AgentWorkflowError("Product not found.", status_code=404)

    existing = (
        db.query(models.PurchaseOrder)
        .filter(models.PurchaseOrder.product_id == product.id)
        .filter(models.PurchaseOrder.status == "awaiting_approval")
        .order_by(models.PurchaseOrder.created_at.desc())
        .first()
    )
    if existing:
        _log(
            db, purchase_order_id=existing.id, product_id=product.id,
            action_type="draft_created", status="skipped",
            message=f"Draft #{existing.id} is already awaiting approval for this product; "
                    "reusing it instead of creating a duplicate.",
            actor=requested_by or "agent",
        )
        return existing

    try:
        analysis = replenishment.analyze_product(db, product)
        _log(
            db,
            purchase_order_id=None,
            product_id=product.id,
            action_type="replenishment_analysis",
            status="success",
            message=f"Analyzed {analysis['product_name']}: {analysis['stock_status']} stock.",
            details=replenishment.reasoning_to_json(analysis["reasoning"]),
        )

        if not analysis["needs_reorder"]:
            _log(
                db, purchase_order_id=None, product_id=product.id,
                action_type="draft_created", status="skipped",
                message="No draft created — stock is currently healthy.",
            )
            raise AgentWorkflowError(
                f"{analysis['product_name']} is not currently flagged for replenishment "
                f"(stock status: {analysis['stock_status']}).",
                status_code=409,
            )

        supplier_info = supplier_selection.recommend_suppliers(db, product)
        _log(
            db, purchase_order_id=None, product_id=product.id,
            action_type="supplier_recommendation",
            status="success" if supplier_info["has_supplier"] else "skipped",
            message=supplier_info["message"],
        )

        explanation, _ = gemini_helper.generate_text(
            _explanation_prompt(analysis, supplier_info),
            fallback=_fallback_explanation(analysis),
        )

        supplier_message = None
        if supplier_info["has_supplier"]:
            supplier_message, _ = gemini_helper.generate_text(
                _message_prompt(analysis, supplier_info["recommended"]),
                fallback=_fallback_message(analysis, supplier_info["recommended"]),
            )

        order = models.PurchaseOrder(
            product_id=product.id,
            product_code=product.product_code,
            product_name=analysis["product_name"],
            supplier_id=supplier_info["recommended"]["supplier_id"] if supplier_info["has_supplier"] else None,
            supplier_name=supplier_info["recommended"]["name"] if supplier_info["has_supplier"] else None,
            status="awaiting_approval",
            is_simulated=True,
            recommended_quantity=analysis["recommended_quantity"],
            quantity=analysis["recommended_quantity"],
            current_stock=analysis["current_stock"],
            reorder_level=analysis["reorder_level"],
            avg_daily_sales=analysis["avg_daily_sales"],
            lead_time_days=analysis["lead_time_days"],
            supplier_score=supplier_info["recommended"]["weighted_score"] if supplier_info["has_supplier"] else None,
            supplier_rank=supplier_info["recommended"]["rank"] if supplier_info["has_supplier"] else None,
            reasoning=replenishment.reasoning_to_json(analysis["reasoning"]),
            explanation=explanation,
            supplier_message=supplier_message,
            requested_by=requested_by,
        )
        db.add(order)
        db.commit()
        db.refresh(order)

        _log(
            db, purchase_order_id=order.id, product_id=product.id,
            action_type="draft_created", status="success",
            message=f"Draft #{order.id} created for {analysis['product_name']}: "
                    f"{analysis['recommended_quantity']} units, awaiting approval.",
            actor=requested_by or "agent",
        )
        return order
    except AgentWorkflowError:
        raise
    except Exception as exc:
        db.rollback()
        _log(
            db, purchase_order_id=None, product_id=product.id,
            action_type="error", status="failed",
            message=f"Draft creation for {product.product_code or product.name} failed unexpectedly.",
            error_detail=str(exc),
        )
        raise AgentWorkflowError(
            "Something went wrong while preparing this recommendation. The failure has been logged.",
            status_code=500,
        )


def _require_transition(order: "models.PurchaseOrder", target: str) -> None:
    allowed = VALID_TRANSITIONS.get(order.status, set())
    if target not in allowed:
        raise AgentWorkflowError(
            f"Cannot move purchase order #{order.id} from '{order.status}' to '{target}'. "
            f"Only these transitions are allowed from '{order.status}': {sorted(allowed) or 'none'}.",
            status_code=409,
        )


def approve_draft(
    db: Session,
    order_id: int,
    approved_by: Optional[str] = None,
    edited_message: Optional[str] = None,
) -> "models.PurchaseOrder":
    order = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == order_id).first()
    if not order:
        raise AgentWorkflowError("Purchase order draft not found.", status_code=404)

    _require_transition(order, "approved")

    try:
        if edited_message is not None:
            order.supplier_message = edited_message

        order.status = "approved"
        order.decided_by = approved_by
        order.decision_reason = "Approved by business user."
        db.commit()
        db.refresh(order)

        _log(
            db, purchase_order_id=order.id, product_id=order.product_id,
            action_type="approved", status="success",
            message=f"Draft #{order.id} approved{f' by {approved_by}' if approved_by else ''}.",
            actor=approved_by or "business_user",
        )

        # Approval immediately finalizes the simulated/internal order — there is no
        # real external system to wait on, so "approved" and "created" happen in
        # the same request, each as its own logged, valid transition.
        _require_transition(order, "created")
        order.status = "created"
        db.commit()
        db.refresh(order)

        _log(
            db, purchase_order_id=order.id, product_id=order.product_id,
            action_type="order_created", status="success",
            message=f"Simulated internal purchase order #{order.id} created "
                    f"({order.quantity} units). No real external order was placed.",
            actor="agent",
        )
        return order
    except AgentWorkflowError:
        raise
    except Exception as exc:
        db.rollback()
        order.status = "failed"
        db.commit()
        _log(
            db, purchase_order_id=order.id, product_id=order.product_id,
            action_type="error", status="failed",
            message=f"Approval of draft #{order.id} failed unexpectedly.",
            error_detail=str(exc),
        )
        raise AgentWorkflowError(
            "Something went wrong while approving this order. The failure has been logged.",
            status_code=500,
        )


def reject_draft(
    db: Session,
    order_id: int,
    rejected_by: Optional[str] = None,
    reason: Optional[str] = None,
) -> "models.PurchaseOrder":
    order = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == order_id).first()
    if not order:
        raise AgentWorkflowError("Purchase order draft not found.", status_code=404)

    _require_transition(order, "rejected")

    try:
        order.status = "rejected"
        order.decided_by = rejected_by
        order.decision_reason = reason or "Rejected by business user."
        db.commit()
        db.refresh(order)

        _log(
            db, purchase_order_id=order.id, product_id=order.product_id,
            action_type="rejected", status="success",
            message=f"Draft #{order.id} rejected{f' by {rejected_by}' if rejected_by else ''}: "
                    f"{order.decision_reason}",
            actor=rejected_by or "business_user",
        )
        return order
    except AgentWorkflowError:
        raise
    except Exception as exc:
        db.rollback()
        _log(
            db, purchase_order_id=order.id, product_id=order.product_id,
            action_type="error", status="failed",
            message=f"Rejection of draft #{order.id} failed unexpectedly.",
            error_detail=str(exc),
        )
        raise AgentWorkflowError(
            "Something went wrong while rejecting this order. The failure has been logged.",
            status_code=500,
        )
