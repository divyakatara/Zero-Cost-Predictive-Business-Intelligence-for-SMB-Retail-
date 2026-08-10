from fastapi import APIRouter, Depends, HTTPException
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(prefix="/auth", tags=["Auth"])

# passlib handles password hashing and password checking.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str):
    """Convert a plain password into a secure hash before saving."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str):
    """Compare a login password with the saved password hash."""
    return pwd_context.verify(plain_password, hashed_password)


def password_is_hashed(saved_password: str):
    """bcrypt hashes usually start with $2a$, $2b$, or $2y$."""
    return saved_password.startswith(("$2a$", "$2b$", "$2y$"))


def is_gstin_required(role: str):
    """GSTIN is required only for business and supplier accounts."""
    return role.lower() in ["business", "supplier"]


def serialize_user(user: models.User):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "gstin": user.gstin,
        "supplier_id": user.supplier_code,
    }


@router.post("/register", response_model=schemas.UserRegisterResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Create a new user account."""
    if is_gstin_required(user.role) and not user.gstin:
        raise HTTPException(
            status_code=400,
            detail="GSTIN is required for business and supplier users",
        )

    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    supplier_code = None
    if user.role.lower() == "supplier" and user.supplier_id:
        supplier_record = (
            db.query(models.Supplier)
            .filter(models.Supplier.supplier_code == user.supplier_id)
            .first()
        )
        if not supplier_record:
            raise HTTPException(status_code=400, detail="Supplier ID not found")
        supplier_code = supplier_record.supplier_code

    new_user = models.User(
        name=user.name,
        email=user.email,
        password=hash_password(user.password),
        role=user.role,
        gstin=user.gstin,
        supplier_code=supplier_code,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User registered successfully", "user": serialize_user(new_user)}


@router.post("/login")
def login_user(user: schemas.UserLogin, db: Session = Depends(get_db)):
    """Check user email and password using the saved password hash."""
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if password_is_hashed(db_user.password):
        password_matches = verify_password(user.password, db_user.password)
    else:
        # Upgrade old plain-text passwords from earlier development testing.
        password_matches = db_user.password == user.password
        if password_matches:
            db_user.password = hash_password(user.password)
            db.commit()

    if not password_matches:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "message": "Login successful",
        "user": serialize_user(db_user),
    }
