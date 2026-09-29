import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(prefix="/auth", tags=["Auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-only-change-this-secret")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60


def create_access_token(user_data: dict) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_data["email"]).strip().lower(),
        "user_id": user_data.get("id"),
        "role": str(user_data["role"]).strip().lower(),
        "name": user_data.get("name"),
        "iat": now,
        "exp": now + timedelta(minutes=JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
            options={"require": ["exp", "iat", "sub", "role"]},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return decode_access_token(credentials.credentials)


def require_valid_token(current_user: dict = Depends(get_current_user)) -> dict:
    return current_user


def issue_login_response(user_data: dict, message: str) -> dict:
    return {
        "message": message,
        "user": user_data,
        "access_token": create_access_token(user_data),
        "token_type": "bearer",
        "expires_in": JWT_EXPIRE_MINUTES * 60,
    }


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def password_is_hashed(saved_password: str) -> bool:
    return saved_password.startswith(("$2a$", "$2b$", "$2y$"))


def is_gstin_required(role: str) -> bool:
    return role.lower() in ["business", "supplier"]


def serialize_user(user: models.User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.lower(),
        "gstin": user.gstin,
        "supplier_id": user.supplier_code,
    }


@router.post("/register", response_model=schemas.UserRegisterResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    role = user.role.strip().lower()
    if role not in {"business", "supplier"}:
        raise HTTPException(status_code=400, detail="Only business and supplier accounts can register")
    if is_gstin_required(role) and not user.gstin:
        raise HTTPException(status_code=400, detail="GSTIN is required for business and supplier users")

    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    supplier_code = None
    if role == "supplier" and user.supplier_id:
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
        email=user.email.strip().lower(),
        password=hash_password(user.password),
        role=role,
        gstin=user.gstin,
        supplier_code=supplier_code,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User registered successfully", "user": serialize_user(new_user)}


@router.post("/login")
def login_user(
    user: schemas.UserLogin,
    role: str | None = None,
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.email == user.email.strip().lower()).first()
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if password_is_hashed(db_user.password):
        password_matches = verify_password(user.password, db_user.password)
    else:
        # Upgrade older development accounts that stored plaintext passwords.
        password_matches = db_user.password == user.password
        if password_matches:
            db_user.password = hash_password(user.password)
            db.commit()
            db.refresh(db_user)

    if not password_matches:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if role and db_user.role.strip().lower() != role.strip().lower():
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return issue_login_response(serialize_user(db_user), "Login successful")


@router.post("/admin-login")
def admin_login(user: schemas.UserLogin):
    admin_email = os.getenv("ADMIN_EMAIL", "admin@smarterp.com").strip().lower()
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
    if user.email.strip().lower() != admin_email or user.password != admin_password:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    user_data = {"id": 0, "name": "System Administrator", "email": admin_email, "role": "admin"}
    return issue_login_response(user_data, "Admin login successful")


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    # Return the same shape as the login response so a restored session keeps
    # fields like supplier_id (the supplier pages load their data by it).
    db_user = db.query(models.User).filter(models.User.email == current_user["sub"]).first()
    if db_user:
        return serialize_user(db_user)
    return {
        "id": current_user.get("user_id"),
        "name": current_user.get("name"),
        "email": current_user["sub"],
        "role": current_user["role"],
    }
