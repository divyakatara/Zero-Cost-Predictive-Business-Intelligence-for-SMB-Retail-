"""TASK-01 (#2) / TASK-04 (#5): no credentials or signing secrets in source,
and seeded supplier accounts never share a password."""
from pathlib import Path

import models
from csv_loader import pwd_context, sync_supplier_users
from routes import auth

BACKEND = Path(__file__).resolve().parents[1]


def test_no_literal_database_password_or_jwt_default_in_source():
    database_py = (BACKEND / "database.py").read_text(encoding="utf8")
    auth_py = (BACKEND / "routes" / "auth.py").read_text(encoding="utf8")

    assert "postgresql://" not in database_py
    assert "dev-only-change-this-secret" not in auth_py
    assert "admin123" not in auth_py
    assert auth.JWT_SECRET_KEY  # always set: from .env or a random per-process key


def test_seeded_suppliers_get_distinct_random_passwords(db, suppliers):
    sync_supplier_users(db)

    users = db.query(models.User).filter(models.User.role == "supplier").all()
    assert len(users) == 3
    assert len({user.password for user in users}) == 3
    for weak in ("password", "supplier123", "Supplier@123", "admin123"):
        assert not any(pwd_context.verify(weak, user.password) for user in users)


def test_admin_login_disabled_when_not_configured(monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    monkeypatch.delenv("ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("ADMIN_PASSWORD", raising=False)
    app = FastAPI()
    app.include_router(auth.router)

    response = TestClient(app).post("/auth/admin-login", json={"email": "admin@smarterp.com", "password": "admin123"})

    assert response.status_code == 503
