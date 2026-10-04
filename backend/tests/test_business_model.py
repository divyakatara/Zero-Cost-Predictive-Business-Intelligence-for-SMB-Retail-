"""TASK-05 (#6): Business database model tests."""
from datetime import datetime

import pytest
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError

import models


def test_business_model_imports_successfully():
    """Verify Business model is defined and importable from models."""
    assert hasattr(models, "Business")
    assert models.Business.__tablename__ == "businesses"


def test_business_model_has_all_required_fields():
    """Verify all 10 required fields from TASK-05 are present on the model."""
    required_fields = [
        "business_id",
        "owner_user_id",
        "name",
        "gstin",
        "email",
        "phone",
        "status",
        "submitted_at",
        "reviewed_at",
        "rejection_reason",
    ]
    for field in required_fields:
        assert hasattr(models.Business, field), f"Missing required field: {field}"


def test_business_owner_foreign_key_references_users_id():
    """Verify owner_user_id has a foreign key referencing users.id."""
    mapper = inspect(models.Business)
    owner_col = mapper.columns["owner_user_id"]
    fk_targets = [fk.target_fullname for fk in owner_col.foreign_keys]
    assert "users.id" in fk_targets


def test_business_status_default_is_pending(db):
    """Verify Business.status defaults to 'pending' when not explicitly provided."""
    user = models.User(
        name="Business Owner",
        email="owner_default@example.com",
        password="secretpassword",
        role="business",
    )
    db.add(user)
    db.commit()

    business = models.Business(
        owner_user_id=user.id,
        name="Retail Store A",
        business_type="Retail",
        category="Groceries",
        address_line1="123 Market St",
        city="Bengaluru",
        state="Karnataka",
        pincode="560001",
        phone="9876543210",
        email="store@example.com",
        registration_number="REG100",
    )
    db.add(business)
    db.commit()
    db.refresh(business)

    assert business.status == "pending"
    assert business.submitted_at is not None
    assert isinstance(business.submitted_at, datetime)
    assert business.reviewed_at is None
    assert business.rejection_reason is None


def test_business_status_supports_approved_and_rejected(db):
    """Verify Business.status supports 'approved' and 'rejected' values."""
    user = models.User(
        name="Business Owner",
        email="owner_status@example.com",
        password="secretpassword",
        role="business",
    )
    db.add(user)
    db.commit()

    approved_biz = models.Business(
        owner_user_id=user.id,
        name="Approved Store",
        business_type="Retail",
        category="Apparel",
        address_line1="456 High St",
        city="Mumbai",
        state="Maharashtra",
        pincode="400001",
        phone="9876543211",
        email="approved@example.com",
        registration_number="REG101",
        status="approved",
        reviewed_at=datetime.utcnow(),
    )
    rejected_biz = models.Business(
        owner_user_id=user.id,
        name="Rejected Store",
        business_type="Retail",
        category="Electronics",
        address_line1="789 Low St",
        city="Delhi",
        state="Delhi",
        pincode="110001",
        phone="9876543212",
        email="rejected@example.com",
        registration_number="REG102",
        status="rejected",
        reviewed_at=datetime.utcnow(),
        rejection_reason="Incomplete documentation provided",
    )
    db.add_all([approved_biz, rejected_biz])
    db.commit()

    db.refresh(approved_biz)
    db.refresh(rejected_biz)

    assert approved_biz.status == "approved"
    assert approved_biz.reviewed_at is not None
    assert rejected_biz.status == "rejected"
    assert rejected_biz.rejection_reason == "Incomplete documentation provided"


def test_business_id_attribute_and_synonym(db):
    """Verify business_id acts as synonym to id on instance and query levels."""
    user = models.User(
        name="Owner Synonym",
        email="synonym@example.com",
        password="secretpassword",
        role="business",
    )
    db.add(user)
    db.commit()

    biz = models.Business(
        owner_user_id=user.id,
        name="Synonym Store",
        business_type="Retail",
        category="General",
        address_line1="100 Main St",
        city="Chennai",
        state="Tamil Nadu",
        pincode="600001",
        phone="9876543213",
        email="synonym_store@example.com",
        registration_number="REG103",
    )
    db.add(biz)
    db.commit()
    db.refresh(biz)

    assert biz.business_id == biz.id
    assert biz.business_id is not None

    queried_by_business_id = (
        db.query(models.Business)
        .filter(models.Business.business_id == biz.business_id)
        .first()
    )
    assert queried_by_business_id is not None
    assert queried_by_business_id.id == biz.id


def test_user_business_relationship(db):
    """Verify bidirectional relationship between User and Business."""
    user = models.User(
        name="Rel Owner",
        email="rel_owner@example.com",
        password="secretpassword",
        role="business",
    )
    db.add(user)
    db.commit()

    biz = models.Business(
        owner=user,
        name="Rel Store",
        business_type="Retail",
        category="Books",
        address_line1="12 College St",
        city="Kolkata",
        state="West Bengal",
        pincode="700073",
        phone="9876543214",
        email="books@example.com",
        registration_number="REG104",
    )
    db.add(biz)
    db.commit()
    db.refresh(user)
    db.refresh(biz)

    assert biz in user.businesses
    assert biz.owner == user
    assert biz.user == user
