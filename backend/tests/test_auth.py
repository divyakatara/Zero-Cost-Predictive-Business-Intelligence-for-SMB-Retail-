
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models
from database import Base, get_db
from routes import auth


@pytest.fixture
def client(monkeypatch):
    # Use an isolated in-memory database for testing.
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
    )

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app = FastAPI()
    app.include_router(auth.router)

    # A sample protected route for testing token validation.
    @app.get("/protected-test")
    def protected_test(
        current_user: dict = Depends(auth.require_valid_token),
    ):
        return {"email": current_user["sub"], "role": current_user["role"]}

    app.dependency_overrides[get_db] = override_get_db

    monkeypatch.setenv("JWT_SECRET_KEY", "test-only-secret-for-auth-tests")
    monkeypatch.setenv("ADMIN_EMAIL", "admin@test.com")
    monkeypatch.setenv("ADMIN_PASSWORD", "TestAdmin123!")

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


def register_user(client, role):
    response = client.post(
        "/auth/register",
        json={
            "name": f"Test {role.title()}",
            "email": f"{role}@test.com",
            "password": "TestUser123!",
            "role": role,
            "gstin": "29ABCDE1234F1Z5",
        },
    )
    assert response.status_code == 200, response.text


def test_admin_login_returns_token(client):
    response = client.post(
        "/auth/admin-login",
        json={
            "email": "admin@test.com",
            "password": "TestAdmin123!",
        },
    )

    assert response.status_code == 200
    assert response.json()["access_token"]
    assert response.json()["token_type"] == "bearer"


def test_wrong_admin_password_is_rejected(client):
    response = client.post(
        "/auth/admin-login",
        json={
            "email": "admin@test.com",
            "password": "WrongPassword!",
        },
    )

    assert response.status_code == 401


@pytest.mark.parametrize("role", ["business", "supplier"])
def test_user_login_returns_token(client, role):
    register_user(client, role)

    response = client.post(
        f"/auth/login?role={role}",
        json={
            "email": f"{role}@test.com",
            "password": "TestUser123!",
        },
    )

    assert response.status_code == 200
    assert response.json()["access_token"]
    assert response.json()["token_type"] == "bearer"


def test_invalid_email_is_rejected(client):
    response = client.post(
        "/auth/login",
        json={
            "email": "unknown@test.com",
            "password": "AnyPassword123!",
        },
    )

    assert response.status_code == 401


def test_wrong_user_password_is_rejected(client):
    register_user(client, "business")

    response = client.post(
        "/auth/login?role=business",
        json={
            "email": "business@test.com",
            "password": "WrongPassword!",
        },
    )

    assert response.status_code == 401


def test_protected_route_rejects_missing_token(client):
    response = client.get("/protected-test")

    assert response.status_code == 401


def test_protected_route_rejects_invalid_token(client):
    response = client.get(
        "/protected-test",
        headers={"Authorization": "Bearer invalid-token"},
    )

    assert response.status_code == 401


def test_protected_route_accepts_valid_token(client):
    login_response = client.post(
        "/auth/admin-login",
        json={
            "email": "admin@test.com",
            "password": "TestAdmin123!",
        },
    )

    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    response = client.get(
        "/protected-test",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["role"] == "admin"


def test_auth_me_accepts_valid_token(client):
    login_response = client.post(
        "/auth/admin-login",
        json={
            "email": "admin@test.com",
            "password": "TestAdmin123!",
        },
    )

    token = login_response.json()["access_token"]

    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["email"] == "admin@test.com"
