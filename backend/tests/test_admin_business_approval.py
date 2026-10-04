from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

import models
from database import get_db
from routes.admin import router, create_auth_token


def create_test_app(db):
    app = FastAPI()
    app.include_router(router)

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db

    return app


def create_business(db, status="pending"):
    user = models.User(
        name="Test Business Owner",
        email="business@example.com",
        password="test-password",
        role="business",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    business = models.Business(
        owner_user_id=user.id,
        name="Test Retail Store",
        business_type="Retail",
        category="Fashion",
        year_established=2020,
        employee_count=5,
        description="Test business",
        address_line1="123 Test Street",
        address_line2=None,
        city="Bengaluru",
        state="Karnataka",
        pincode="560001",
        country="India",
        phone="9876543210",
        email=user.email,
        website="https://example.com",
        registration_number="REG12345",
        gstin="29ABCDE1234F1Z5",
        pan="ABCDE1234F",
        gst_certificate_name=None,
        status=status,
    )

    db.add(business)
    db.commit()
    db.refresh(business)

    return user, business


def admin_token():
    admin_user = SimpleNamespace(
        id=0,
        name="System Administrator",
        email="admin@smarterp.com",
        role="admin",
        gstin=None,
        supplier_code=None,
    )

    return create_auth_token(admin_user)


def business_token():
    business_user = SimpleNamespace(
        id=1,
        name="Test Business Owner",
        email="business@example.com",
        role="business",
        gstin=None,
        supplier_code=None,
    )

    return create_auth_token(business_user)


def test_admin_can_list_businesses(db):
    _, business = create_business(db)

    app = create_test_app(db)
    client = TestClient(app)

    response = client.get(
        "/admin/businesses",
        headers={"Authorization": f"Bearer {admin_token()}"},
    )

    assert response.status_code == 200

    data = response.json()

    assert isinstance(data, list)
    assert any(item["id"] == business.id for item in data)


def test_admin_can_approve_business(db):
    _, business = create_business(db, status="pending")

    app = create_test_app(db)
    client = TestClient(app)

    response = client.post(
        f"/admin/businesses/{business.id}/approve",
        headers={"Authorization": f"Bearer {admin_token()}"},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == business.id
    assert data["status"] == "approved"

    db.refresh(business)

    assert business.status == "approved"
    assert business.reviewed_at is not None


def test_admin_can_reject_business(db):
    _, business = create_business(db, status="pending")

    app = create_test_app(db)
    client = TestClient(app)

    response = client.post(
        f"/admin/businesses/{business.id}/reject",
        headers={"Authorization": f"Bearer {admin_token()}"},
        params={"reason": "GST certificate could not be verified."},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == business.id
    assert data["status"] == "rejected"
    assert data["rejectionReason"] == "GST certificate could not be verified."

    db.refresh(business)

    assert business.status == "rejected"
    assert business.rejection_reason == "GST certificate could not be verified."
    assert business.reviewed_at is not None


def test_admin_can_revoke_business_approval(db):
    _, business = create_business(db, status="approved")

    app = create_test_app(db)
    client = TestClient(app)

    response = client.post(
        f"/admin/businesses/{business.id}/revoke",
        headers={"Authorization": f"Bearer {admin_token()}"},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == business.id
    assert data["status"] == "pending"
    assert data["rejectionReason"] == "Approval revoked by Admin."

    db.refresh(business)

    assert business.status == "pending"
    assert business.rejection_reason == "Approval revoked by Admin."
    assert business.reviewed_at is not None


def test_admin_endpoint_requires_authentication(db):
    create_business(db)

    app = create_test_app(db)
    client = TestClient(app)

    response = client.get("/admin/businesses")

    assert response.status_code == 401


def test_admin_endpoint_rejects_non_admin_user(db):
    create_business(db)

    app = create_test_app(db)
    client = TestClient(app)

    response = client.get(
        "/admin/businesses",
        headers={"Authorization": f"Bearer {business_token()}"},
    )

    assert response.status_code == 403