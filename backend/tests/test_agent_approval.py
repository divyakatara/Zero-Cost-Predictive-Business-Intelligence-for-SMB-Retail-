"""TASK-35 (#36): no simulated order exists without an explicit human approval."""
import pytest

import models
from services import agent_orchestrator
from services.agent_orchestrator import AgentWorkflowError


@pytest.fixture
def draft(db, suppliers):
    product = models.Product(name="Rice", product_code="item_1", supplier_code="supplier_1")
    db.add(product)
    db.commit()
    order = models.PurchaseOrder(
        product_id=product.id,
        supplier_id=suppliers[0].id,
        status="awaiting_approval",
        is_simulated=True,
        quantity=50,
        requested_by="alpha@shop.com",
    )
    db.add(order)
    db.commit()
    return order


def _action_types(db, order):
    return [
        action.action_type
        for action in db.query(models.AgentAction).filter(models.AgentAction.purchase_order_id == order.id).order_by(models.AgentAction.id)
    ]


def test_approve_creates_a_simulated_order_and_logs_the_decision(db, draft):
    order = agent_orchestrator.approve_draft(db, draft.id, approved_by="alpha@shop.com")

    assert order.status == "created"
    assert order.is_simulated is True
    assert order.decided_by == "alpha@shop.com"
    assert _action_types(db, order) == ["approved", "order_created"]


def test_reject_leaves_no_order_only_the_logged_decision(db, draft):
    order = agent_orchestrator.reject_draft(db, draft.id, rejected_by="alpha@shop.com", reason="Too expensive")

    assert order.status == "rejected"
    assert order.decision_reason == "Too expensive"
    assert _action_types(db, order) == ["rejected"]
    assert db.query(models.PurchaseOrder).filter(models.PurchaseOrder.status == "created").count() == 0


def test_a_rejected_draft_can_never_become_an_order(db, draft):
    agent_orchestrator.reject_draft(db, draft.id)

    with pytest.raises(AgentWorkflowError):
        agent_orchestrator.approve_draft(db, draft.id)

    assert db.query(models.PurchaseOrder).filter(models.PurchaseOrder.status == "created").count() == 0


def test_cancel_withdraws_the_draft_and_logs_it(db, draft):
    order = agent_orchestrator.cancel_draft(db, draft.id, cancelled_by="alpha@shop.com")

    assert order.status == "cancelled"
    assert order.decided_by == "alpha@shop.com"
    assert _action_types(db, order) == ["cancelled"]


def test_cancelled_draft_is_terminal(db, draft):
    agent_orchestrator.cancel_draft(db, draft.id)

    for action in (
        lambda: agent_orchestrator.approve_draft(db, draft.id),
        lambda: agent_orchestrator.reject_draft(db, draft.id),
        lambda: agent_orchestrator.cancel_draft(db, draft.id),
    ):
        with pytest.raises(AgentWorkflowError) as error:
            action()
        assert error.value.status_code == 409


def test_only_awaiting_drafts_can_be_cancelled(db, draft):
    agent_orchestrator.approve_draft(db, draft.id)

    with pytest.raises(AgentWorkflowError) as error:
        agent_orchestrator.cancel_draft(db, draft.id)
    assert error.value.status_code == 409


def test_cancel_route_returns_409_after_terminal_state(db, draft):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    from database import get_db
    from routes.agent import router

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_db] = lambda: db
    client = TestClient(app)

    first = client.post(f"/agent/drafts/{draft.id}/cancel", json={"cancelled_by": "alpha@shop.com"})
    second = client.post(f"/agent/drafts/{draft.id}/approve", json={})

    assert first.status_code == 200 and first.json()["status"] == "cancelled"
    assert second.status_code == 409
