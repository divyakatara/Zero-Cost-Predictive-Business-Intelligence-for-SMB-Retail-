"""TASK-20 (#21): every ML endpoint takes the same public identifier, product_code."""
from datetime import date, timedelta

import pytest
from fastapi import HTTPException

import models
from ml.anomaly import AnomalyResult
from routes import anomaly, inventory
from routes.inventory import predict_demand


@pytest.fixture
def product(db):
    product = models.Product(name="Rice", product_code="item_1", supplier_stock=30, reorder_level=50)
    db.add(product)
    db.flush()
    start = date(2023, 1, 1)
    for i in range(30):
        day = start + timedelta(days=i)
        db.add(models.Sale(
            product_id=product.id, product_code="item_1", quantity=40 + i % 5, quantity_sold=40 + i % 5,
            date=day, sale_date=day, weekday=day.weekday(), month=day.month,
            is_weekend=day.weekday() >= 5, promo=False,
        ))
    db.commit()
    return product


@pytest.fixture
def anomalies(monkeypatch):
    """Stand-in for a trained Isolation Forest result (records shaped like ml.anomaly's)."""
    records = [
        {"transaction_id": "t1", "product_id": "item_1", "product_code": "item_1", "branch_id": "store_1"},
        {"transaction_id": "t2", "product_id": "item_2", "product_code": "item_2", "branch_id": "store_1"},
    ]
    result = AnomalyResult(
        summary={"total_anomalies": len(records), "total_rows": 100},
        anomalies=records, all_results=records, model_path="",
    )
    monkeypatch.setattr(anomaly, "_LAST_RESULT", result)
    return records


def _anomalies(**filters):
    params = {"limit": 50, "product_code": None, "product_id": None, "branch_id": None, "refresh": False}
    return anomaly.get_anomalies(**{**params, **filters})


def test_product_code_round_trips_between_prediction_and_anomalies(db, product, anomalies, tmp_path, monkeypatch):
    monkeypatch.setattr(inventory, "DEMAND_CACHE_DIR", tmp_path)
    prediction = predict_demand("item_1", db=db)
    assert prediction["product_code"] == "item_1"
    assert prediction["current_stock"] == 30  # the product's stock, as shown on the Inventory page

    matches = _anomalies(product_code=prediction["product_code"])["results"]

    assert [a["transaction_id"] for a in matches] == ["t1"]
    assert all(a["product_code"] == prediction["product_code"] for a in matches)


def test_product_id_query_param_still_works_as_an_alias(anomalies):
    assert _anomalies(product_id="item_2")["results"] == [anomalies[1]]


def test_unknown_product_code_returns_404(db):
    with pytest.raises(HTTPException) as exc:
        predict_demand("item_404", db=db)

    assert exc.value.status_code == 404
