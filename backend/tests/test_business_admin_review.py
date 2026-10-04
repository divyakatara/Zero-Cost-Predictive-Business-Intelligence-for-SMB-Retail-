from fastapi import FastAPI
from fastapi.testclient import TestClient

import models
from database import get_db
from routes.auth import create_access_token
from routes.business import router
from tests.test_business_registration import create_user, valid_payload


def create_test_app(db):
    app = FastAPI()
    app.include_router(router)

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    return app


def auth_header(role, email="someone@example.com"):
    token = create_access_token({"id": 1, "email": email, "role": role, "name": "Test"})
    return {"Authorization": f"Bearer {token}"}


ADMIN = auth_header("admin", "admin@smarterp.com")


def registered_business(db, client, email="owner@example.com"):
    user = create_user(db, email)
    response = client.post("/business/register", json=valid_payload(email))
    assert response.status_code == 200
    return user, response.json()


def test_admin_lists_all_businesses_with_owner_email(db):
    client = TestClient(create_test_app(db))
    registered_business(db, client, "a@example.com")
    registered_business(db, client, "b@example.com")

    response = client.get("/business/admin/all", headers=ADMIN)

    assert response.status_code == 200
    assert {b["userEmail"] for b in response.json()} == {"a@example.com", "b@example.com"}


def test_non_admin_cannot_list_or_review(db):
    client = TestClient(create_test_app(db))
    _, business = registered_business(db, client)
    business_headers = auth_header("business", "owner@example.com")

    assert client.get("/business/admin/all", headers=business_headers).status_code == 403
    assert client.post(f"/business/{business['id']}/approve", headers=business_headers).status_code == 403
    assert client.get("/business/admin/all").status_code == 401


def test_approve_persists_and_owner_sees_it(db):
    client = TestClient(create_test_app(db))
    user, business = registered_business(db, client)

    response = client.post(f"/business/{business['id']}/approve", headers=ADMIN)

    assert response.status_code == 200
    assert response.json()["status"] == "approved"
    assert response.json()["reviewedAt"] is not None
    owner_view = client.get("/business/by-email", params={"email": user.email}).json()
    assert owner_view["status"] == "approved"


def test_reject_stores_reason_and_default(db):
    client = TestClient(create_test_app(db))
    _, first = registered_business(db, client, "a@example.com")
    _, second = registered_business(db, client, "b@example.com")

    with_reason = client.post(f"/business/{first['id']}/reject", json={"reason": "GSTIN mismatch"}, headers=ADMIN)
    without_reason = client.post(f"/business/{second['id']}/reject", json={}, headers=ADMIN)

    assert with_reason.json()["status"] == "rejected"
    assert with_reason.json()["rejectionReason"] == "GSTIN mismatch"
    assert without_reason.json()["rejectionReason"] == "Details could not be verified."


def test_revoke_returns_business_to_pending(db):
    client = TestClient(create_test_app(db))
    _, business = registered_business(db, client)
    client.post(f"/business/{business['id']}/approve", headers=ADMIN)

    response = client.post(f"/business/{business['id']}/revoke", headers=ADMIN)

    assert response.json()["status"] == "pending"
    assert response.json()["rejectionReason"] == "Approval revoked by Admin."


def test_rejected_business_can_be_reapproved(db):
    client = TestClient(create_test_app(db))
    _, business = registered_business(db, client)
    client.post(f"/business/{business['id']}/reject", json={"reason": "x"}, headers=ADMIN)

    response = client.post(f"/business/{business['id']}/approve", headers=ADMIN)

    assert response.json()["status"] == "approved"
    assert response.json()["rejectionReason"] is None


def test_invalid_transitions_return_409(db):
    client = TestClient(create_test_app(db))
    _, business = registered_business(db, client)

    assert client.post(f"/business/{business['id']}/revoke", headers=ADMIN).status_code == 409
    client.post(f"/business/{business['id']}/approve", headers=ADMIN)
    assert client.post(f"/business/{business['id']}/approve", headers=ADMIN).status_code == 409
    assert client.post(f"/business/{business['id']}/reject", json={}, headers=ADMIN).status_code == 409


def test_unknown_business_returns_404(db):
    client = TestClient(create_test_app(db))

    assert client.post("/business/999/approve", headers=ADMIN).status_code == 404
    assert db.query(models.Business).count() == 0
