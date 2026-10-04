"""TASK-43 (#43): smoke tests for both ML endpoints against the seeded
demo workbook, so a broken model fails loudly before a demo."""
import pytest

import models
from ml import anomaly as anomaly_module
from routes import inventory

EXPECTED_ROWS = 3650
EXPECTED_ANOMALIES = 73  # 2% contamination of the 3,650 seeded transactions


@pytest.fixture(scope="module")
def transactions():
    return anomaly_module.load_transactions()


def test_isolation_forest_on_seeded_dataset(tmp_path, monkeypatch):
    # Train into a temp dir so the committed model file is never rewritten.
    monkeypatch.setattr(anomaly_module, "_CACHE_DIR", tmp_path)

    result = anomaly_module.train_and_score(refresh_cache=True)

    assert result.summary["total_rows"] == EXPECTED_ROWS
    assert result.summary["total_anomalies"] == EXPECTED_ANOMALIES
    assert len(result.anomalies) == EXPECTED_ANOMALIES
    first = result.anomalies[0]
    for key in ("transaction_id", "product_id", "branch_id", "anomaly_score", "is_anomaly", "explanation"):
        assert key in first, key
    assert first["is_anomaly"] is True and first["explanation"]
    # Most anomalous first.
    scores = [a["anomaly_score"] for a in result.anomalies]
    assert scores == sorted(scores)


def test_committed_isolation_forest_model_still_matches():
    result = anomaly_module.train_and_score(refresh_cache=False)

    assert result.summary["total_anomalies"] == EXPECTED_ANOMALIES


def test_decision_tree_on_seeded_product(db, transactions, tmp_path, monkeypatch):
    monkeypatch.setattr(inventory, "DEMAND_CACHE_DIR", tmp_path)
    rows = transactions[transactions["product_id"] == "item_1"]
    product = models.Product(name="item_1", product_code="item_1", supplier_stock=500, reorder_level=100)
    db.add(product)
    db.flush()
    db.add_all([
        models.Sale(
            product_id=product.id, product_code="item_1", quantity=int(r.quantity_sold), quantity_sold=int(r.quantity_sold),
            date=r.sale_date.date(), sale_date=r.sale_date.date(), weekday=int(r.weekday), month=int(r.month),
            is_weekend=bool(r.is_weekend), promo=bool(r.promo),
        )
        for r in rows.itertuples()
    ])
    db.commit()

    result = inventory.predict_demand("item_1", db=db)

    assert set(result) >= {"product_code", "predicted_demand", "current_stock", "reorder_level", "needs_reorder", "suggested_order", "records_used"}
    assert isinstance(result["predicted_demand"], int) and result["predicted_demand"] >= 0
    assert result["records_used"] == len(rows) - 7  # first 7 days lack a lag_7
    # Demand for a single product is tens of units a day in this dataset.
    assert 0 < result["predicted_demand"] < 500
