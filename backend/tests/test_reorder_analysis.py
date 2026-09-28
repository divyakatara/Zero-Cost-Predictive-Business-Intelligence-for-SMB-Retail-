"""TASK-32 (#33): the reorder-need analysis endpoint handles both the
low-stock and the well-stocked case."""
from datetime import date, timedelta

import pytest
from fastapi import HTTPException

import models
from routes import agent

LATEST_SALE = date(2023, 12, 31)


def _product(db, code, stock, reorder_level, daily_sales=10, lead_time=4):
    supplier = models.Supplier(name=f"Supplier for {code}", supplier_code=f"sup_{code}", lead_time=lead_time)
    product = models.Product(
        name=code, product_code=code, supplier=supplier,
        supplier_stock=stock, reorder_level=reorder_level,
    )
    db.add(product)
    # 31 days of steady sales ending on LATEST_SALE.
    for i in range(31):
        day = LATEST_SALE - timedelta(days=i)
        db.add(models.Sale(product_code=code, quantity=daily_sales, quantity_sold=daily_sales, date=day, sale_date=day))
    db.commit()
    return product


def test_low_stock_product_gets_a_reorder_recommendation(db):
    product = _product(db, "item_low", stock=20, reorder_level=100, daily_sales=10, lead_time=4)

    body = agent.get_replenishment(product.id, db)

    assert body["needs_reorder"] is True
    assert body["stock_status"] == "critical"
    assert body["method"] == "sales_trend"
    # 310 units over the 30-day window -> 10.33/day; coverage = 4 lead + 3 buffer = 7 days
    # -> target 72.3 units, minus 20 in stock -> 53 units.
    assert body["avg_daily_sales"] == pytest.approx(10.33)
    assert body["recommended_quantity"] == 53
    assert body["reasoning"]  # explainable: every recommendation carries its reasoning


def test_well_stocked_product_needs_no_reorder(db):
    product = _product(db, "item_ok", stock=5000, reorder_level=100)

    body = agent.get_replenishment(product.id, db)

    assert body["needs_reorder"] is False
    assert body["stock_status"] == "ok"
    assert body["recommended_quantity"] == 0
    assert "not flagged for replenishment" in body["reasoning"][0]


def test_well_stocked_product_cannot_be_drafted(db):
    product = _product(db, "item_ok", stock=5000, reorder_level=100)

    with pytest.raises(HTTPException) as exc:
        agent.create_draft(agent.CreateDraftRequest(product_id=product.id), db)

    assert exc.value.status_code >= 400
    assert db.query(models.PurchaseOrder).count() == 0


def test_unknown_product_returns_404(db):
    with pytest.raises(HTTPException) as exc:
        agent.get_replenishment(9999, db)

    assert exc.value.status_code == 404
