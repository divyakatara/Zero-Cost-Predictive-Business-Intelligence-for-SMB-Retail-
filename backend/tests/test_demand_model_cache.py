"""TASK-18 (#19): the Decision Tree is trained once per product and reused
until that product's sales change, instead of retraining on every request."""
from datetime import date, timedelta

import pytest

import models
from routes import inventory


@pytest.fixture
def product(db, tmp_path, monkeypatch):
    monkeypatch.setattr(inventory, "DEMAND_CACHE_DIR", tmp_path)
    product = models.Product(name="Rice", product_code="item_1", supplier_stock=30, reorder_level=50)
    db.add(product)
    db.flush()
    for i in range(30):
        _add_sale(db, product, date(2023, 1, 1) + timedelta(days=i), 40 + i % 5)
    db.commit()
    return product


def _add_sale(db, product, day, units):
    db.add(models.Sale(
        product_id=product.id, product_code=product.product_code, quantity_sold=units,
        sale_date=day, weekday=day.weekday(), month=day.month, is_weekend=day.weekday() >= 5, promo=False,
    ))


def test_repeated_calls_reuse_the_cached_tree(db, product, tmp_path):
    first = inventory.predict_demand("item_1", db=db)
    cache_file = tmp_path / "decision_tree_b0_item_1.joblib"
    mtime = cache_file.stat().st_mtime_ns

    second = inventory.predict_demand("item_1", db=db)
    third = inventory.predict_demand("item_1", db=db)

    assert first["model_cached"] is False
    assert second["model_cached"] is True and third["model_cached"] is True
    assert first["predicted_demand"] == second["predicted_demand"] == third["predicted_demand"]
    assert cache_file.stat().st_mtime_ns == mtime  # not rewritten: no retraining happened


def test_new_sales_data_triggers_a_retrain(db, product):
    inventory.predict_demand("item_1", db=db)
    _add_sale(db, product, date(2023, 1, 31), 90)
    db.commit()

    assert inventory.predict_demand("item_1", db=db)["model_cached"] is False


def test_refresh_forces_a_retrain(db, product):
    inventory.predict_demand("item_1", db=db)

    assert inventory.predict_demand("item_1", refresh=True, db=db)["model_cached"] is False


def test_suggested_order_covers_demand_and_reorder_level(db, product):
    result = inventory.predict_demand("item_1", db=db)

    assert result["suggested_order"] == max(0, result["predicted_demand"] + 50 - 30)
    assert result["needs_reorder"] is True  # stock 30 is below the reorder level of 50


def test_batch_endpoint_reports_products_without_enough_history(db, product):
    db.add(models.Product(name="New", product_code="item_new"))
    db.commit()

    items = {item["product_code"]: item for item in inventory.predict_all(db=db)["items"]}

    assert "predicted_demand" in items["item_1"]
    assert "Not enough sales history" in items["item_new"]["error"]
