import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from routes.auth import get_current_user, require_admin
from services import tenancy


router = APIRouter(prefix="/business", tags=["Business"])


def serialize_business(business: models.Business):
    return {
        "id": business.id,
        "owner_user_id": business.owner_user_id,
        # The owner's login email; the business contact email can differ.
        "userEmail": business.owner.email if business.owner else None,

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
        "hasGstCertificateFile": business.gst_certificate_type is not None,

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
        if not data.gstCertificateName:
            existing.gst_certificate_type = None
            existing.gst_certificate_data = None

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


# ── Admin review ─────────────────────────────────────────────────────────────
# An admin decision is stored on the business row itself, so the owner sees it
# from any browser on their next status check.

class RejectBusinessRequest(BaseModel):
    reason: Optional[str] = None


def _get_business_or_404(db: Session, business_id: int) -> models.Business:
    business = db.query(models.Business).filter(models.Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business registration not found.")
    return business


def _set_review(db: Session, business: models.Business, status: str, reason: Optional[str]):
    business.status = status
    business.reviewed_at = datetime.utcnow()
    business.rejection_reason = reason
    db.commit()
    db.refresh(business)
    return serialize_business(business)


@router.get("/admin/all")
def list_businesses_for_admin(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    query = (
        db.query(models.Business)
        .filter(models.Business.is_demo.is_(False))
        .order_by(models.Business.submitted_at.desc())
    )
    if status:
        query = query.filter(models.Business.status == status)
    return [serialize_business(business) for business in query.all()]


@router.post("/{business_id}/approve")
def approve_business(
    business_id: int,
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    business = _get_business_or_404(db, business_id)
    if business.status not in ("pending", "rejected"):
        raise HTTPException(status_code=409, detail=f"Cannot approve a business that is {business.status}.")
    approved = _set_review(db, business, "approved", None)
    # A newly approved business starts with its own copy of the demo dataset,
    # so its dashboards work straight away; it can clear or replace it later.
    if not tenancy.business_has_data(db, business.id):
        tenancy.copy_demo_data(db, business.id)
    return approved


@router.post("/{business_id}/reject")
def reject_business(
    business_id: int,
    payload: RejectBusinessRequest,
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    business = _get_business_or_404(db, business_id)
    if business.status != "pending":
        raise HTTPException(status_code=409, detail=f"Cannot reject a business that is {business.status}.")
    reason = (payload.reason or "").strip() or "Details could not be verified."
    return _set_review(db, business, "rejected", reason)


@router.post("/{business_id}/revoke")
def revoke_business(
    business_id: int,
    db: Session = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    business = _get_business_or_404(db, business_id)
    if business.status != "approved":
        raise HTTPException(status_code=409, detail=f"Cannot revoke a business that is {business.status}.")
    return _set_review(db, business, "pending", "Approval revoked by Admin.")



# ── GST certificate file ─────────────────────────────────────────────────────

GST_CERTIFICATE_TYPES = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
}
GST_CERTIFICATE_MAX_BYTES = 5 * 1024 * 1024


def _is_owner(business: models.Business, current_user: dict) -> bool:
    return bool(business.owner) and business.owner.email.lower() == str(current_user.get("sub", "")).lower()


@router.post("/{business_id}/gst-certificate")
async def upload_gst_certificate(
    business_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    business = _get_business_or_404(db, business_id)
    if not _is_owner(business, current_user):
        raise HTTPException(status_code=403, detail="Only the business owner can upload its GST certificate.")

    filename = file.filename or ""
    extension = filename[filename.rfind("."):].lower() if "." in filename else ""
    content_type = GST_CERTIFICATE_TYPES.get(extension)
    if content_type is None:
        raise HTTPException(status_code=400, detail="GST certificate must be a PDF, JPG, or PNG file.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(contents) > GST_CERTIFICATE_MAX_BYTES:
        raise HTTPException(status_code=400, detail="GST certificate must be 5 MB or smaller.")

    business.gst_certificate_name = filename
    business.gst_certificate_type = content_type
    business.gst_certificate_data = contents
    db.commit()
    db.refresh(business)
    return serialize_business(business)


@router.get("/{business_id}/gst-certificate")
def download_gst_certificate(
    business_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    business = _get_business_or_404(db, business_id)
    if current_user.get("role") != "admin" and not _is_owner(business, current_user):
        raise HTTPException(status_code=403, detail="Not allowed to view this GST certificate.")
    if business.gst_certificate_type is None:
        raise HTTPException(status_code=404, detail="No GST certificate file has been uploaded.")

    safe_name = (business.gst_certificate_name or "gst-certificate").replace('"', "")
    return Response(
        content=business.gst_certificate_data,
        media_type=business.gst_certificate_type,
        headers={"Content-Disposition": f'inline; filename="{safe_name}"'},
    )
