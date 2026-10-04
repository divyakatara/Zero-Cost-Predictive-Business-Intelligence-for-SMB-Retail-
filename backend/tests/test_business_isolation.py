"""TASK-14 (#15) and TASK-13/15/16/30: one business can never read or change
another business's data.

Each business gets uniquely named products ("alpha_*" / "beta_*"), and every
response to Alpha is checked to never mention "beta_" at all, so a new field
or endpoint that leaks rows fails here without a dedicated assertion.
Endpoints using Postgres-only SQL (date_trunc: dashboard, sales, analytics,
alerts, chatbot context) can't run on SQLite and are checked live instead.
"""
import io
import json
from datetime import date, timedelta

import pandas as pd
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

import models
from database import get_db
from routes import agent, business_pages, chat, data, inventory, sales
from routes.auth import create_access_token
from services import gemini_helper, tenancy


def _business(db, key, status="approved"):
    owner = models.User(name=key, email=f"{key}@shop.com", password="x", role="business")
    db.add(owner)
    db.flush()
    business = models.Business(
        owner_user_id=owner.id, name=f"{key.title()} Mart", business_type="Retail", category="Grocery",
        address_line1="1 St", city="Pune", state="MH", pincode="411001", phone="99",
        email=f"{key}@shop.com", registration_number="R", status=status,
    )
    db.add(business)
    db.flush()
    return business


def _seed(db, business, prefix, stock):
    for n in (1, 2):
        product = models.Product(
            name=f"{prefix}_item_{n}", product_code=f"{prefix}_item_{n}", supplier_code="supplier_1",
            supplier_stock=stock, reorder_level=100, business_id=business.id,
        )
        db.add(product)
        db.flush()
        db.add(models.Inventory(product_id=product.id, stock=stock, reorder_level=100, business_id=business.id))
        for i in range(30):
            day = date(2023, 1, 1) + timedelta(days=i)
            db.add(models.Sale(
                product_id=product.id, product_code=product.product_code, business_id=business.id,
                quantity=10 + i % 3, quantity_sold=10 + i % 3, revenue=100.0, profit=30.0, price=10.0,
                date=day, sale_date=day, weekday=day.weekday(), month=day.month, is_weekend=day.weekday() >= 5, promo=False,
            ))


@pytest.fixture
def world(db, suppliers, monkeypatch, tmp_path):
    monkeypatch.setattr(gemini_helper, "generate_text", lambda prompt, fallback: (fallback, False))
    monkeypatch.setattr(inventory, "DEMAND_CACHE_DIR", tmp_path)
    alpha, beta = _business(db, "alpha"), _business(db, "beta")
    pending = _business(db, "gamma", status="pending")
    _seed(db, alpha, "alpha", stock=50)   # below reorder level: agent candidates
    _seed(db, beta, "beta", stock=40)
    db.commit()

    app = FastAPI()
    for router in (business_pages.router, inventory.router, data.router, agent.router, sales.router, chat.router):
        app.include_router(router, dependencies=[Depends(tenancy.scope_to_business)])
    Session = sessionmaker(bind=db.get_bind())

    def fresh_session():  # one session per request, like production
        session = Session()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = fresh_session
    return {"client": TestClient(app), "alpha": alpha, "beta": beta, "pending": pending, "Session": Session}


def headers(key, role="business"):
    token = create_access_token({"id": 1, "email": f"{key}@shop.com", "role": role, "name": key})
    return {"Authorization": f"Bearer {token}"}


ALPHA = headers("alpha")
BETA = headers("beta")


def get_as(world, path, who=ALPHA):
    response = world["client"].get(path, headers=who)
    assert response.status_code == 200, (path, response.status_code, response.text)
    return response.json()


READ_ENDPOINTS = [
    "/business-pages/inventory",
    "/business-pages/insights",
    "/business-pages/suppliers",
    "/inventory/predictions",
    "/agent/replenishment",
    "/agent/drafts",
    "/agent/orders",
    "/agent/actions",
    "/api/data/status",
    "/api/data/products",
    "/api/data/history",
    "/sales/",
]


@pytest.mark.parametrize("path", READ_ENDPOINTS)
def test_alpha_never_sees_beta_rows(world, path):
    body = json.dumps(get_as(world, path, ALPHA))
    assert "beta_" not in body, f"{path} leaked Beta's data"


def test_each_business_sees_its_own_rows(world):
    alpha = [i["id"] for i in get_as(world, "/business-pages/inventory", ALPHA)["items"]]
    beta = [i["id"] for i in get_as(world, "/business-pages/inventory", BETA)["items"]]
    assert alpha == ["alpha_item_1", "alpha_item_2"]
    assert beta == ["beta_item_1", "beta_item_2"]
    assert get_as(world, "/api/data/status", ALPHA)["sales_count"] == 60


def test_crafted_request_for_another_business_product_is_404(world, db):
    beta_product = db.query(models.Product).filter_by(product_code="beta_item_1").one()
    client = world["client"]

    assert client.get(f"/agent/replenishment/{beta_product.id}", headers=ALPHA).status_code == 404
    assert client.post("/agent/drafts", json={"product_id": beta_product.id}, headers=ALPHA).status_code == 404
    assert client.get("/inventory/predict/beta_item_1", headers=ALPHA).status_code == 404


def test_another_business_draft_cannot_be_read_or_approved(world, db):
    beta_product = db.query(models.Product).filter_by(product_code="beta_item_1").one()
    client = world["client"]
    draft = client.post("/agent/drafts", json={"product_id": beta_product.id}, headers=BETA).json()

    assert client.get(f"/agent/drafts/{draft['id']}", headers=ALPHA).status_code == 404
    assert client.post(f"/agent/drafts/{draft['id']}/approve", json={}, headers=ALPHA).status_code == 404
    assert client.post(f"/agent/drafts/{draft['id']}/cancel", json={}, headers=ALPHA).status_code == 404
    assert client.get(f"/agent/drafts/{draft['id']}", headers=BETA).json()["status"] == "awaiting_approval"


def test_new_rows_are_stamped_with_the_callers_business(world, db):
    product = db.query(models.Product).filter_by(product_code="alpha_item_1").one()
    created = world["client"].post("/agent/drafts", json={"product_id": product.id}, headers=ALPHA).json()

    check = world["Session"]()
    order = check.get(models.PurchaseOrder, created["id"])
    assert order.business_id == world["alpha"].id
    assert {a.business_id for a in check.query(models.AgentAction).filter_by(purchase_order_id=order.id)} == {world["alpha"].id}
    check.close()


def test_clear_only_removes_the_callers_data(world):
    response = world["client"].post("/api/data/clear", headers=ALPHA)

    assert response.status_code == 200
    assert get_as(world, "/api/data/status", ALPHA)["sales_count"] == 0
    assert get_as(world, "/api/data/status", BETA)["sales_count"] == 60


def _workbook(prefix):
    buffer = io.BytesIO()
    days = pd.date_range("2024-01-01", periods=5)
    with pd.ExcelWriter(buffer) as writer:
        pd.DataFrame({"product_id": [f"{prefix}_new"], "product_name": ["New"], "category": ["Grocery"], "price": [5.0], "cost_price": [3.0]}).to_excel(writer, sheet_name="products", index=False)
        pd.DataFrame({"sale_date": days, "product_id": [f"{prefix}_new"] * 5, "quantity_sold": [3] * 5, "sales_amount": [15.0] * 5}).to_excel(writer, sheet_name="retail_sales", index=False)
        pd.DataFrame({"supplier_id": ["evil"], "supplier_name": ["Should not be imported"]}).to_excel(writer, sheet_name="suppliers", index=False)
    return buffer.getvalue()


def test_import_replaces_only_the_callers_data_and_logs_it(world, db):
    suppliers_before = db.query(models.Supplier).count()
    response = world["client"].post(
        "/api/data/import",
        files={"file": ("alpha.xlsx", _workbook("alpha"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        headers=ALPHA,
    )

    assert response.status_code == 200, response.text
    assert [i["id"] for i in get_as(world, "/business-pages/inventory", ALPHA)["items"]] == ["alpha_new"]
    assert get_as(world, "/api/data/status", ALPHA)["dataset_name"] == "alpha.xlsx"
    assert get_as(world, "/api/data/status", BETA)["sales_count"] == 60  # untouched
    assert db.query(models.Supplier).count() == suppliers_before      # marketplace untouched

    alpha_history = get_as(world, "/api/data/history", ALPHA)
    assert [(h["filename"], h["row_count"]) for h in alpha_history] == [("alpha.xlsx", 5)]
    assert get_as(world, "/api/data/history", BETA) == []


def test_load_demo_gives_the_business_its_own_copy(world, db):
    demo = tenancy.ensure_demo_business(db)
    _seed(db, demo, "demo", stock=500)
    db.commit()

    assert world["client"].post("/api/data/load-demo", headers=ALPHA).status_code == 200

    alpha = [i["id"] for i in get_as(world, "/business-pages/inventory", ALPHA)["items"]]
    assert alpha == ["demo_item_1", "demo_item_2"]
    assert get_as(world, "/api/data/status", ALPHA)["sales_count"] == 60
    assert db.query(models.Product).filter_by(business_id=demo.id).count() == 2  # demo rows not moved
    assert [i["id"] for i in get_as(world, "/business-pages/inventory", BETA)["items"]] == ["beta_item_1", "beta_item_2"]


def test_unapproved_business_and_suppliers_are_refused(world):
    client = world["client"]
    assert client.get("/business-pages/inventory", headers=headers("gamma")).status_code == 403
    assert client.get("/business-pages/inventory", headers=headers("s1", role="supplier")).status_code == 403
    assert client.get("/business-pages/inventory").status_code == 401


def test_admin_cannot_wipe_or_import_for_everyone(world):
    admin = headers("admin", role="admin")
    client = world["client"]
    assert client.post("/api/data/clear", headers=admin).status_code == 403
    assert client.post("/api/data/load-demo", headers=admin).status_code == 403
    assert get_as(world, "/api/data/status", admin)["sales_count"] == 120  # platform-wide, read-only


def test_chatbot_figures_are_per_business(world):
    # _live_stats feeds the chatbot's offline answers; it runs on the scoped session.
    alpha_session, beta_session = world["Session"](), world["Session"]()
    alpha_session.info["business_id"] = world["alpha"].id
    beta_session.info["business_id"] = world["beta"].id
    alpha_session.query(models.Sale).filter(models.Sale.product_code == "alpha_item_1").update({"revenue": 999.0})
    alpha_session.commit()

    alpha_stats, beta_stats = chat._live_stats(alpha_session), chat._live_stats(beta_session)

    assert set(alpha_stats["top_products"]) <= {"alpha_item_1", "alpha_item_2"}
    assert set(beta_stats["top_products"]) <= {"beta_item_1", "beta_item_2"}
    assert alpha_stats["revenue"] != beta_stats["revenue"]
    alpha_session.close()
    beta_session.close()

