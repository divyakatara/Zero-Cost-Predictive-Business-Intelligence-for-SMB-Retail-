import os
import sys

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Make backend modules (models, routes, services) importable from tests.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import models  # noqa: E402
from database import Base  # noqa: E402


@pytest.fixture
def db():
    """A fresh in-memory SQLite database per test, so tests never touch PostgreSQL."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture
def suppliers(db):
    """Three ranked suppliers: supplier_1 is the best-ranked."""
    rows = [
        models.Supplier(name=f"Supplier {i}", supplier_code=f"supplier_{i}", supplier_name=f"Supplier {i}", rank=i, rating=5 - i)
        for i in (1, 2, 3)
    ]
    db.add_all(rows)
    db.commit()
    return rows
