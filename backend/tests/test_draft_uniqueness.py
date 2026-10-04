"""TASK-52 (#52): two simultaneous draft requests for one product can never
leave two awaiting-approval drafts; the second request gets the first's draft."""
import threading

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

import models
from database import Base
from services import agent_orchestrator, gemini_helper, replenishment


@pytest.fixture
def file_db(tmp_path, monkeypatch):
    """A file-backed SQLite database so each thread gets its own connection."""
    engine = create_engine(f"sqlite:///{tmp_path / 'race.db'}", connect_args={"check_same_thread": False, "timeout": 30})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    setup = Session()
    setup.add(models.Supplier(name="Supplier 1", supplier_code="supplier_1", supplier_name="Supplier 1", rank=1, rating=4.5, lead_time=3))
    setup.add(models.Product(name="Rice", product_code="item_1", supplier_code="supplier_1", supplier_stock=10, reorder_level=100))
    setup.commit()
    product_id = setup.query(models.Product).one().id
    setup.close()
    monkeypatch.setattr(gemini_helper, "generate_text", lambda prompt, fallback: (fallback, False))
    yield Session, product_id
    engine.dispose()


def test_concurrent_requests_create_exactly_one_awaiting_draft(file_db, monkeypatch):
    Session, product_id = file_db
    # Hold both requests right after their "is there already a draft?" check,
    # so both decide to insert: the exact race the unique index must close.
    barrier = threading.Barrier(2, timeout=10)
    real_analyze = replenishment.analyze_product

    def analyze_after_both_checked(db, product):
        barrier.wait()
        return real_analyze(db, product)

    monkeypatch.setattr(replenishment, "analyze_product", analyze_after_both_checked)

    results, errors = [], []

    def request(user):
        db = Session()
        try:
            results.append(agent_orchestrator.create_draft(db, product_id, requested_by=user).id)
        except Exception as exc:  # surfaced by the assertion below
            errors.append(exc)
        finally:
            db.close()

    threads = [threading.Thread(target=request, args=(f"user{i}@shop.com",)) for i in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert errors == []
    assert len(results) == 2 and results[0] == results[1]
    check = Session()
    awaiting = check.query(models.PurchaseOrder).filter_by(product_id=product_id, status="awaiting_approval").count()
    check.close()
    assert awaiting == 1


def test_database_rejects_a_second_awaiting_draft(db):
    product = models.Product(name="Rice", product_code="item_1")
    db.add(product)
    db.commit()
    db.add(models.PurchaseOrder(product_id=product.id, status="awaiting_approval"))
    db.commit()

    db.add(models.PurchaseOrder(product_id=product.id, status="awaiting_approval"))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

    # Finished drafts don't count: history can hold many per product.
    db.add_all([models.PurchaseOrder(product_id=product.id, status=s) for s in ("created", "rejected", "cancelled")])
    db.commit()
