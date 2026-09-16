"""Agentic AI procurement workflow — human-in-the-loop only.

Every endpoint here either (a) reads deterministic analysis with no side
effects, or (b) performs one explicit, validated state transition on a
PurchaseOrder. No endpoint places a real external order, sends a real
message, or moves money — see services/agent_orchestrator.py for the state
machine that enforces this.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

import models
from database import get_db
from services import agent_orchestrator, replenishment
from services.agent_orchestrator import AgentWorkflowError

router = APIRouter(prefix="/agent", tags=["Agentic AI Procurement"])


class CreateDraftRequest(BaseModel):
    product_id: int
    requested_by: Optional[str] = None


class ApproveRequest(BaseModel):
    approved_by: Optional[str] = None
    edited_message: Optional[str] = None


class RejectRequest(BaseModel):
    rejected_by: Optional[str] = None
    reason: Optional[str] = None


def _order_to_dict(order: "models.PurchaseOrder") -> dict:
    # Prefer the denormalized snapshot taken when the draft was created — it
    # survives the referenced product/supplier later being deleted (e.g. by
    # the existing data-reset endpoints), which a live join would not.
    product = order.product
    supplier = order.supplier
    product_code = order.product_code or (product.product_code if product else None)
    product_name = order.product_name or ((product.product_code or product.name) if product else None)
    supplier_name = order.supplier_name or ((supplier.supplier_name or supplier.name) if supplier else None)
    return {
        "id": order.id,
        "status": order.status,
        "is_simulated": order.is_simulated,
        "product_id": order.product_id,
        "product_code": product_code,
        "product_name": product_name,
        "supplier_id": order.supplier_id,
        "supplier_name": supplier_name,
        "quantity": order.quantity,
        "recommended_quantity": order.recommended_quantity,
        "current_stock": order.current_stock,
        "reorder_level": order.reorder_level,
        "avg_daily_sales": order.avg_daily_sales,
        "lead_time_days": order.lead_time_days,
        "supplier_score": order.supplier_score,
        "supplier_rank": order.supplier_rank,
        "reasoning": replenishment.reasoning_from_json(order.reasoning),
        "explanation": order.explanation,
        "supplier_message": order.supplier_message,
        "requested_by": order.requested_by,
        "decided_by": order.decided_by,
        "decision_reason": order.decision_reason,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
    }


def _action_to_dict(action: "models.AgentAction") -> dict:
    return {
        "id": action.id,
        "purchase_order_id": action.purchase_order_id,
        "product_id": action.product_id,
        "action_type": action.action_type,
        "status": action.status,
        "message": action.message,
        "actor": action.actor,
        "error_detail": action.error_detail,
        "created_at": action.created_at.isoformat() if action.created_at else None,
    }


@router.get("/replenishment")
def list_replenishment(db: Session = Depends(get_db)):
    """Products currently flagged as needing reorder, most urgent first."""
    candidates = agent_orchestrator.get_replenishment_candidates(db)
    return {"count": len(candidates), "items": candidates}


@router.get("/replenishment/{product_id}")
def get_replenishment(product_id: int, db: Session = Depends(get_db)):
    """Deterministic reorder analysis for a single product."""
    try:
        return agent_orchestrator.get_product_analysis(db, product_id)
    except AgentWorkflowError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get("/suppliers/{product_id}")
def get_supplier_recommendation(product_id: int, db: Session = Depends(get_db)):
    """Ranked supplier recommendation for a single product."""
    try:
        return agent_orchestrator.get_supplier_recommendation(db, product_id)
    except AgentWorkflowError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)


@router.post("/drafts")
def create_draft(payload: CreateDraftRequest, db: Session = Depends(get_db)):
    """Run the full analysis pipeline and persist a draft awaiting approval."""
    try:
        order = agent_orchestrator.create_draft(db, payload.product_id, requested_by=payload.requested_by)
    except AgentWorkflowError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return _order_to_dict(order)


@router.get("/drafts")
def list_drafts(status: Optional[str] = None, db: Session = Depends(get_db)):
    """List purchase-order drafts/orders, optionally filtered by status."""
    query = db.query(models.PurchaseOrder).order_by(models.PurchaseOrder.created_at.desc())
    if status:
        query = query.filter(models.PurchaseOrder.status == status)
    return [_order_to_dict(order) for order in query.all()]


@router.get("/drafts/{order_id}")
def get_draft(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order draft not found.")
    return _order_to_dict(order)


@router.post("/drafts/{order_id}/approve")
def approve_draft(order_id: int, payload: ApproveRequest, db: Session = Depends(get_db)):
    """Explicit human approval — the ONLY way a simulated order gets created."""
    try:
        order = agent_orchestrator.approve_draft(
            db, order_id, approved_by=payload.approved_by, edited_message=payload.edited_message
        )
    except AgentWorkflowError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return _order_to_dict(order)


@router.post("/drafts/{order_id}/reject")
def reject_draft(order_id: int, payload: RejectRequest, db: Session = Depends(get_db)):
    try:
        order = agent_orchestrator.reject_draft(
            db, order_id, rejected_by=payload.rejected_by, reason=payload.reason
        )
    except AgentWorkflowError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    return _order_to_dict(order)


@router.get("/orders")
def list_orders(db: Session = Depends(get_db)):
    """Internal/simulated purchase orders that have actually been created (approved)."""
    orders = (
        db.query(models.PurchaseOrder)
        .filter(models.PurchaseOrder.status == "created")
        .order_by(models.PurchaseOrder.updated_at.desc())
        .all()
    )
    return [_order_to_dict(order) for order in orders]


@router.get("/actions")
def list_actions(purchase_order_id: Optional[int] = None, limit: int = 50, db: Session = Depends(get_db)):
    """Agent action/audit log, most recent first."""
    query = db.query(models.AgentAction).order_by(models.AgentAction.created_at.desc())
    if purchase_order_id is not None:
        query = query.filter(models.AgentAction.purchase_order_id == purchase_order_id)
    return [_action_to_dict(action) for action in query.limit(min(limit, 200)).all()]
