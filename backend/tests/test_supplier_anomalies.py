"""TASK-24 (#25): suppliers only see anomalies for their own products."""
import pytest
from fastapi import HTTPException

import models
from ml.anomaly import AnomalyResult
from routes import anomaly


@pytest.fixture
def anomalies(monkeypatch):
    """Stand-in for a trained Isolation Forest result (records shaped like ml.anomaly's)."""
    records = [
        {"transaction_id": "t1", "product_id": "item_1", "anomaly_score": -0.08},
        {"transaction_id": "t2", "product_id": "item_1", "anomaly_score": -0.01},
        {"transaction_id": "t3", "product_id": "item_2", "anomaly_score": -0.05},
        {"transaction_id": "t4", "product_id": "item_9", "anomaly_score": -0.09},
    ]
    result = AnomalyResult(summary={}, anomalies=records, all_results=records, model_path="")
    monkeypatch.setattr(anomaly, "_LAST_RESULT", result)


@pytest.fixture
def catalog(db):
    db.add_all([
        models.Supplier(name="A", supplier_code="sup_a"),
        models.Supplier(name="B", supplier_code="sup_b"),
        models.Product(name="1", product_code="item_1", supplier_code="sup_a"),
        models.Product(name="2", product_code="item_2", supplier_code="sup_a"),
        models.Product(name="3", product_code="item_3", supplier_code="sup_a"),
        models.Product(name="9", product_code="item_9", supplier_code="sup_b"),
    ])
    db.commit()


def _fetch(db, code):
    return anomaly.get_supplier_anomalies(code, limit=200, refresh=False, db=db)


def test_supplier_sees_only_its_own_products_anomalies(db, catalog, anomalies):
    result = _fetch(db, "sup_a")

    assert [a["transaction_id"] for a in result["results"]] == ["t1", "t2", "t3"]
    assert result["product_codes"] == ["item_1", "item_2", "item_3"]
    assert result["anomalies_per_product"] == {"item_1": 2, "item_2": 1, "item_3": 0}
    assert (result["total_anomalies"], result["high_risk"], result["moderate_risk"]) == (3, 2, 1)


def test_other_supplier_is_isolated(db, catalog, anomalies):
    result = _fetch(db, "sup_b")

    assert [a["transaction_id"] for a in result["results"]] == ["t4"]


def test_unknown_supplier_returns_404(db, catalog, anomalies):
    with pytest.raises(HTTPException) as exc:
        _fetch(db, "sup_missing")

    assert exc.value.status_code == 404
