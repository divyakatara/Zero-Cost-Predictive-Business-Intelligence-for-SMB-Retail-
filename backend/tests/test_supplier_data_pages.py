"""Supplier portal pages (#37): inventory and analytics are built only from the
supplier's own products, and a supplier can't read another supplier's data."""
from datetime import date

import pytest
from fastapi import HTTPException

import models
from routes.supplier import get_own_supplier, supplier_analytics, supplier_inventory

SUPPLIER_1 = {"role": "supplier", "sub": "s1@test.local"}


@pytest.fixture
def catalog(db, suppliers):
    db.add(models.User(name="S1", email="s1@test.local", password="x", role="supplier", supplier_code="supplier_1"))
    db.add_all([
        models.Product(name="A", product_code="item_a", supplier_code="supplier_1", supplier_stock=50, reorder_level=100),
        models.Product(name="B", product_code="item_b", supplier_code="supplier_1", supplier_stock=500, reorder_level=100),
        models.Product(name="C", product_code="item_c", supplier_code="supplier_2", supplier_stock=500, reorder_level=100),
    ])
    sales = [
        ("item_a", date(2024, 12, 2), "store_1", 3, 300.0),   # Monday
        ("item_a", date(2024, 12, 3), "store_2", 1, 100.0),   # Tuesday
        ("item_b", date(2024, 11, 4), "store_1", 2, 50.0),    # Monday
        ("item_c", date(2024, 12, 2), "store_1", 9, 9000.0),  # other supplier's product
    ]
    db.add_all([
        models.Sale(product_code=code, sale_date=d, date=d, branch_id=branch, quantity=units, quantity_sold=units, revenue=revenue)
        for code, d, branch, units, revenue in sales
    ])
    db.commit()


def test_supplier_can_only_read_own_code(db, catalog):
    assert get_own_supplier(db, "supplier_1", SUPPLIER_1).supplier_code == "supplier_1"
    with pytest.raises(HTTPException) as other:
        get_own_supplier(db, "supplier_2", SUPPLIER_1)
    assert other.value.status_code == 403
    with pytest.raises(HTTPException) as business:
        get_own_supplier(db, "supplier_1", {"role": "business", "sub": "b@test.local"})
    assert business.value.status_code == 403
    assert get_own_supplier(db, "supplier_2", {"role": "admin", "sub": "admin"}).supplier_code == "supplier_2"


def test_inventory_lists_only_own_products(db, catalog):
    result = supplier_inventory("supplier_1", db=db, current_user=SUPPLIER_1)

    assert [item["id"] for item in result["items"]] == ["item_a", "item_b"]
    assert {item["id"]: item["status"] for item in result["items"]} == {"item_a": "critical", "item_b": "ok"}


def test_analytics_all_time_counts_only_own_sales(db, catalog):
    result = supplier_analytics("supplier_1", period="all", db=db, current_user=SUPPLIER_1)

    kpis = {k["label"]: k["value"] for k in result["kpis"]}
    assert kpis["Total Orders"] == "3"
    assert kpis["Revenue Generated"] == "₹450"
    assert kpis["Active Listings"] == "2"
    assert result["productData"] == [{"name": "item_a", "value": 4}, {"name": "item_b", "value": 2}]
    weekdays = {d["name"]: d["value"] for d in result["orderTrendData"]}
    assert weekdays["Mon"] == 2 and weekdays["Tue"] == 1
    assert [p["name"] for p in result["revenueTrend"]] == ["Nov", "Dec"]
    # Buyers are "<retailer> · <branch>"; these sales have no owning business.
    assert [b["name"] for b in result["buyers"]] == ["Unknown retailer · store_1", "Unknown retailer · store_2"]


def test_analytics_month_window_uses_latest_month(db, catalog):
    result = supplier_analytics("supplier_1", period="month", db=db, current_user=SUPPLIER_1)

    kpis = {k["label"]: k["value"] for k in result["kpis"]}
    assert kpis["Total Orders"] == "2"  # the November sale is outside December
    assert "December 2024" in result["headerNote"]


def _business(db, owner_email, name, status="approved", contact_email=None):
    owner = models.User(name=name, email=owner_email, password="x", role="business")
    db.add(owner)
    db.commit()
    business = models.Business(
        owner_user_id=owner.id, name=name, business_type="Retail", category="Grocery",
        address_line1="1 St", city="Pune", state="MH", pincode="411001", phone="99", email=contact_email or owner_email,
        registration_number="R1", status=status,
    )
    db.add(business)
    db.commit()
    return business


def test_marketplace_splits_clients_from_other_approved_businesses(db, catalog, suppliers):
    from routes.supplier import supplier_marketplace

    _business(db, "alpha@shop.com", "Alpha Mart", contact_email="orders@alpha.com")
    _business(db, "beta@shop.com", "Beta Stores")
    _business(db, "gamma@shop.com", "Gamma Pending", status="pending")
    supplier_1 = suppliers[0]
    db.add_all([
        models.PurchaseOrder(supplier_id=supplier_1.id, status="created", requested_by="orders@alpha.com", product_code="item_a", quantity=10),
        models.PurchaseOrder(supplier_id=supplier_1.id, status="awaiting_approval", requested_by="ALPHA@shop.com", product_code="item_a", quantity=5),
        models.PurchaseOrder(supplier_id=supplier_1.id, status="rejected", requested_by="beta@shop.com", product_code="item_a", quantity=7),
        models.PurchaseOrder(supplier_id=suppliers[1].id, status="created", requested_by="beta@shop.com", product_code="item_c", quantity=3),
    ])
    db.commit()

    result = supplier_marketplace("supplier_1", db=db, current_user=SUPPLIER_1)

    assert [c["name"] for c in result["clients"]] == ["Alpha Mart"]
    alpha = result["clients"][0]
    assert (alpha["ordersPlaced"], alpha["ordersAwaiting"], alpha["unitsOrdered"]) == (1, 1, 10)
    # Rejected orders and orders with other suppliers don't make a client; pending businesses aren't listed.
    assert [b["name"] for b in result["otherBusinesses"]] == ["Beta Stores"]
