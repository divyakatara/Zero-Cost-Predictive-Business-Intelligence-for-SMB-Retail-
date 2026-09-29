from fastapi import FastAPI
from fastapi.testclient import TestClient

import models
from database import get_db
from routes.business import router


def create_test_app(db):
    app = FastAPI()
    app.include_router(router)

    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db

    return app


def create_user(db, email="owner@example.com"):
    user = models.User(
        name="Test Owner",
        email=email,
        password="test-password",
        role="business",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def valid_payload(email="owner@example.com"):
    return {
        "user_email": email,
        "businessName": "Test Retail Store",
        "businessType": "Retail",
        "category": "Fashion",
        "yearEstablished": 2020,
        "employeeCount": 5,
        "description": "Test business registration",
        "addressLine1": "123 Test Street",
        "addressLine2": "",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560001",
        "country": "India",
        "phone": "9876543210",
        "email": email,
        "website": "https://example.com",
        "registrationNumber": "REG12345",
        "gstin": "29ABCDE1234F1Z5",
        "pan": "ABCDE1234F",
        "gstCertificateName": None,
    }


def test_successful_business_registration(db):
    user = create_user(db)

    app = create_test_app(db)
    client = TestClient(app)

    response = client.post(
        "/business/register",
        json=valid_payload(user.email),
    )

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "pending"
    assert data["owner_user_id"] == user.id
    assert data["businessName"] == "Test Retail Store"

    business = (
        db.query(models.Business)
        .filter(models.Business.owner_user_id == user.id)
        .first()
    )

    assert business is not None
    assert business.status == "pending"
    assert business.submitted_at is not None


def test_missing_required_field_returns_400(db):
    user = create_user(db)

    app = create_test_app(db)
    client = TestClient(app)

    payload = valid_payload(user.email)
    payload.pop("businessName")

    response = client.post(
        "/business/register",
        json=payload,
    )

    assert response.status_code == 400


def test_invalid_email_returns_400(db):
    user = create_user(db)

    app = create_test_app(db)
    client = TestClient(app)

    payload = valid_payload(user.email)
    payload["email"] = "not-an-email"

    response = client.post(
        "/business/register",
        json=payload,
    )

    assert response.status_code == 400


def test_invalid_pincode_returns_400(db):
    user = create_user(db)

    app = create_test_app(db)
    client = TestClient(app)

    payload = valid_payload(user.email)
    payload["pincode"] = "123"

    response = client.post(
        "/business/register",
        json=payload,
    )

    assert response.status_code == 400


def test_rejected_business_can_be_resubmitted(db):
    user = create_user(db)

    rejected = models.Business(
        owner_user_id=user.id,
        name="Old Business",
        business_type="Retail",
        category="Fashion",
        year_established=2020,
        employee_count=5,
        description="Old registration",
        address_line1="Old Address",
        address_line2=None,
        city="Bengaluru",
        state="Karnataka",
        pincode="560001",
        country="India",
        phone="9876543210",
        email=user.email,
        website=None,
        registration_number="OLD123",
        gstin=None,
        pan=None,
        gst_certificate_name=None,
        status="rejected",
        rejection_reason="Documents could not be verified.",
    )

    db.add(rejected)
    db.commit()
    db.refresh(rejected)

    app = create_test_app(db)
    client = TestClient(app)

    payload = valid_payload(user.email)

    response = client.post(
        "/business/register",
        json=payload,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == rejected.id
    assert data["status"] == "pending"
    assert data["rejectionReason"] is None

    db.refresh(rejected)

    assert rejected.status == "pending"
    assert rejected.rejection_reason is None
    assert rejected.name == "Test Retail Store"


def test_get_business_by_email_returns_persisted_business(db):
    user = create_user(db)

    app = create_test_app(db)
    client = TestClient(app)

    register_response = client.post(
        "/business/register",
        json=valid_payload(user.email),
    )

    assert register_response.status_code == 200

    response = client.get(
        "/business/by-email",
        params={"email": user.email},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["businessName"] == "Test Retail Store"
    assert data["status"] == "pending"
    assert data["owner_user_id"] == user.id