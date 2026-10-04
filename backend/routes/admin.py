import base64
import hashlib
import hmac
import json
import os
import time
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

import models
from database import get_db
from .business import serialize_business


router = APIRouter(prefix="/admin", tags=["Admin"])


AUTH_SECRET = os.getenv(
    "ADMIN_AUTH_SECRET",
    "local-development-admin-secret-change-me",
)


class RejectBusinessRequest(BaseModel):
    reason: str


def _encode_token(payload: dict) -> str:
    """Create a signed authentication token."""
    payload_bytes = json.dumps(
        payload,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")

    payload_part = base64.urlsafe_b64encode(payload_bytes).decode("utf-8").rstrip("=")

    signature = hmac.new(
        AUTH_SECRET.encode("utf-8"),
        payload_part.encode("utf-8"),
        hashlib.sha256,
    ).digest()

    signature_part = base64.urlsafe_b64encode(signature).decode("utf-8").rstrip("=")

    return f"{payload_part}.{signature_part}"


def create_auth_token(user: models.User) -> str:
    """Create a short-lived token for a logged-in user."""
    payload = {
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "exp": int(time.time()) + 60 * 60 * 8,
    }

    return _encode_token(payload)


def _decode_token(token: str) -> dict:
    """Verify and decode a signed authentication token."""
    try:
        payload_part, signature_part = token.split(".", 1)

        expected_signature = hmac.new(
            AUTH_SECRET.encode("utf-8"),
            payload_part.encode("utf-8"),
            hashlib.sha256,
        ).digest()

        provided_signature = base64.urlsafe_b64decode(
            signature_part + "=" * (-len(signature_part) % 4)
        )

        if not hmac.compare_digest(expected_signature, provided_signature):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            )

        payload_bytes = base64.urlsafe_b64decode(
            payload_part + "=" * (-len(payload_part) % 4)
        )

        payload = json.loads(payload_bytes.decode("utf-8"))

        if int(payload.get("exp", 0)) < int(time.time()):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token expired",
            )

        return payload

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )


def require_admin(
    authorization: str | None = Header(default=None),
) -> dict:
    """Require a valid authenticated admin token."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    scheme, _, token = authorization.partition(" ")

    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication header",
        )

    payload = _decode_token(token)

    if str(payload.get("role", "")).strip().lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return payload


@router.get("/businesses")
def get_businesses(
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Return all registered businesses for admin review."""
    businesses = (
        db.query(models.Business)
        .order_by(models.Business.submitted_at.desc())
        .all()
    )

    return [serialize_business(business) for business in businesses]


@router.post("/businesses/{business_id}/approve")
def approve_business(
    business_id: int,
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Approve a business registration."""
    business = (
        db.query(models.Business)
        .filter(models.Business.id == business_id)
        .first()
    )

    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found",
        )

    business.status = "approved"
    business.reviewed_at = datetime.utcnow()
    business.rejection_reason = None

    db.commit()
    db.refresh(business)

    return serialize_business(business)


@router.post("/businesses/{business_id}/reject")
def reject_business(
    business_id: int,
    reason: str,
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Reject a business registration with a required reason."""
    reason = reason.strip()
    if not reason:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Rejection reason is required",
        )

    business = (
        db.query(models.Business)
        .filter(models.Business.id == business_id)
        .first()
    )

    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found",
        )

    business.status = "rejected"
    business.reviewed_at = datetime.utcnow()
    business.rejection_reason = reason

    db.commit()
    db.refresh(business)

    return serialize_business(business)


@router.post("/businesses/{business_id}/revoke")
def revoke_business(
    business_id: int,
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Revoke a previous business approval."""
    business = (
        db.query(models.Business)
        .filter(models.Business.id == business_id)
        .first()
    )

    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found",
        )

    business.status = "pending"
    business.reviewed_at = datetime.utcnow()
    business.rejection_reason = "Approval revoked by Admin."

    db.commit()
    db.refresh(business)

    return serialize_business(business)