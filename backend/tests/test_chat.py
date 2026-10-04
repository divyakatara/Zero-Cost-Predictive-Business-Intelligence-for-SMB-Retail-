"""TASK-29 (#30): the chatbot's admin mode comes from the verified token, and
its offline replies quote live figures rather than hard-coded ones."""
from datetime import date

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import models
from database import get_db
from routes import chat
from routes.auth import create_access_token


@pytest.fixture
def client(db, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "")  # force the deterministic fallback
    app = FastAPI()
    app.include_router(chat.router)
    app.dependency_overrides[get_db] = lambda: db
    return TestClient(app)


def headers(role):
    token = create_access_token({"id": 1, "email": f"{role}@test.local", "role": role, "name": role})
    return {"Authorization": f"Bearer {token}"}


ADMIN_ANSWER = "Business Approvals section"


def test_business_token_cannot_unlock_admin_mode(client):
    reply = client.post("/api/chat", json={"message": "any pending approvals?", "role": "admin"}, headers=headers("business"))

    assert reply.status_code == 200
    assert ADMIN_ANSWER not in reply.json()["reply"]


def test_admin_token_gets_admin_mode_without_sending_role(client):
    reply = client.post("/api/chat", json={"message": "any pending approvals?"}, headers=headers("admin"))

    assert ADMIN_ANSWER in reply.json()["reply"]


def test_chat_requires_a_token(client):
    assert client.post("/api/chat", json={"message": "hi"}).status_code == 401


def test_offline_reply_quotes_live_figures(db):
    # Called directly: the connected path's Gemini context uses Postgres-only
    # date_trunc, which the SQLite test database doesn't have.
    db.add(models.Product(name="Rice", product_code="item_9", supplier_stock=5, reorder_level=10))
    db.add_all([
        models.Sale(product_code="item_9", sale_date=date(2024, 1, d), quantity_sold=1, revenue=1000.0, profit=250.0)
        for d in (1, 2)
    ])
    db.commit()

    stats = chat._live_stats(db)
    revenue = chat._fallback_reply("what is my revenue?", is_admin=False, is_connected=True, stats=stats)
    stock = chat._fallback_reply("anything to restock?", is_admin=False, is_connected=True, stats=stats)

    assert "2 sales records" in revenue and "₹2,000.00" in revenue and "₹500.00" in revenue
    assert "66,25,422" not in revenue
    assert "item_9" in stock
