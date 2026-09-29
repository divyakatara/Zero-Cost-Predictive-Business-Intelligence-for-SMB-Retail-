import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db


router = APIRouter(prefix="/business", tags=["Business"])


def serialize_business(business: models.Business):
    return {
        "id": business.id,
        "owner_user_id": business.owner_user_id,

        "businessName": business.name,
        "businessType": business.business_type,
        "category": business.category,

        "yearEstablished": business.year_established,
        "employeeCount": business.employee_count,
        "description": business.description,

        "addressLine1": business.address_line1,
        "addressLine2": business.address_line2,
        "city": business.city,
        "state": business.state,
        "pincode": business.pincode,
        "country": business.country,

        "phone": business.phone,
        "email": business.email,
        "website": business.website,

        "registrationNumber": business.registration_number,
        "gstin": business.gstin,
        "pan": business.pan,
        "gstCertificateName": business.gst_certificate_name,

        "status": business.status,
        "submittedAt": business.submitted_at,
        "reviewedAt": business.reviewed_at,
        "rejectionReason": business.rejection_reason,
    }


def validate_registration(data: schemas.BusinessRegisterCreate):
    required_fields = {
        "businessName": data.businessName,
        "businessType": data.businessType,
        "category": data.category,
        "addressLine1": data.addressLine1,
        "city": data.city,
        "state": data.state,
        "pincode": data.pincode,
        "phone": data.phone,
        "email": data.email,
        "registrationNumber": data.registrationNumber,
        "user_email": data.user_email,
    }

    missing = [
        field
        for field, value in required_fields.items()
        if not str(value or "").strip()
    ]

    if missing:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Required fields are missing.",
                "fields": missing,
            },
        )

    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", data.email):
        raise HTTPException(
            status_code=400,
            detail="Invalid business email address.",
        )

    if not re.match(r"^\d{4,8}$", data.pincode):
        raise HTTPException(
            status_code=400,
            detail="Invalid postal code.",
        )


@router.post(
    "/register",
    response_model=schemas.BusinessResponse,
)
def register_business(
    data: schemas.BusinessRegisterCreate,
    db: Session = Depends(get_db),
):
    """
    Create or resubmit a business registration.

    The current project does not yet have JWT/session authentication,
    so the existing application identity is supplied as user_email.
    """

    validate_registration(data)

    owner = (
        db.query(models.User)
        .filter(models.User.email == data.user_email)
        .first()
    )

    if not owner:
        raise HTTPException(
            status_code=401,
            detail="Business owner account not found.",
        )

    existing = (
        db.query(models.Business)
        .filter(models.Business.owner_user_id == owner.id)
        .first()
    )

    if existing:
        if existing.status != "rejected":
            raise HTTPException(
                status_code=400,
                detail="A business registration already exists for this user.",
            )

        existing.name = data.businessName
        existing.business_type = data.businessType
        existing.category = data.category
        existing.year_established = data.yearEstablished
        existing.employee_count = data.employeeCount
        existing.description = data.description

        existing.address_line1 = data.addressLine1
        existing.address_line2 = data.addressLine2
        existing.city = data.city
        existing.state = data.state
        existing.pincode = data.pincode
        existing.country = data.country

        existing.phone = data.phone
        existing.email = data.email
        existing.website = data.website

        existing.registration_number = data.registrationNumber
        existing.gstin = data.gstin
        existing.pan = data.pan
        existing.gst_certificate_name = data.gstCertificateName

        existing.status = "pending"
        existing.submitted_at = datetime.utcnow()
        existing.reviewed_at = None
        existing.rejection_reason = None

        db.commit()
        db.refresh(existing)

        return serialize_business(existing)

    business = models.Business(
        owner_user_id=owner.id,

        name=data.businessName,
        business_type=data.businessType,
        category=data.category,

        year_established=data.yearEstablished,
        employee_count=data.employeeCount,
        description=data.description,

        address_line1=data.addressLine1,
        address_line2=data.addressLine2,
        city=data.city,
        state=data.state,
        pincode=data.pincode,
        country=data.country,

        phone=data.phone,
        email=data.email,
        website=data.website,

        registration_number=data.registrationNumber,
        gstin=data.gstin,
        pan=data.pan,
        gst_certificate_name=data.gstCertificateName,

        status="pending",
        submitted_at=datetime.utcnow(),
    )

    db.add(business)
    db.commit()
    db.refresh(business)

    return serialize_business(business)


@router.get(
    "/by-email",
    response_model=schemas.BusinessResponse,
)
def get_business_by_email(
    email: str,
    db: Session = Depends(get_db),
):
    owner = (
        db.query(models.User)
        .filter(models.User.email == email)
        .first()
    )

    if not owner:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    business = (
        db.query(models.Business)
        .filter(models.Business.owner_user_id == owner.id)
        .first()
    )

    if not business:
        raise HTTPException(
            status_code=404,
            detail="Business registration not found.",
        )

    return serialize_business(business)