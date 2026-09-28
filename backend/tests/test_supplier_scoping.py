"""TASK-27 (#28): supplier recommendations are personalized per business."""
import models
from routes.business_pages import suppliers_overview


def _order(db, supplier, requested_by, status="created"):
    db.add(models.PurchaseOrder(supplier_id=supplier.id, supplier_name=supplier.supplier_name, status=status, requested_by=requested_by))
    db.commit()


def _names(cards):
    return [card["name"] for card in cards]


def test_businesses_with_different_history_see_different_suppliers(db, suppliers):
    s1, s2, s3 = suppliers
    _order(db, s3, "alpha@shop.com")
    _order(db, s3, "alpha@shop.com")
    _order(db, s2, "beta@shop.com")

    alpha = suppliers_overview(business="alpha@shop.com", db=db)
    beta = suppliers_overview(business="beta@shop.com", db=db)

    assert _names(alpha["mySuppliers"]) == ["Supplier 3"]
    assert _names(beta["mySuppliers"]) == ["Supplier 2"]
    # A supplier already in "My Suppliers" is not also recommended.
    assert "Supplier 3" not in _names(alpha["recommended"])
    assert "Supplier 2" not in _names(beta["recommended"])


def test_my_suppliers_ordered_by_how_often_the_business_used_them(db, suppliers):
    s1, s2, s3 = suppliers
    _order(db, s1, "alpha@shop.com")
    _order(db, s3, "alpha@shop.com")
    _order(db, s3, "alpha@shop.com")

    result = suppliers_overview(business="ALPHA@shop.com", db=db)  # identity match is case-insensitive

    assert _names(result["mySuppliers"]) == ["Supplier 3", "Supplier 1"]


def test_other_businesses_and_non_created_orders_are_ignored(db, suppliers):
    s1, s2, s3 = suppliers
    _order(db, s3, "beta@shop.com")
    _order(db, s2, "alpha@shop.com", status="rejected")
    _order(db, s2, "alpha@shop.com", status="awaiting_approval")

    result = suppliers_overview(business="alpha@shop.com", db=db)

    # No created orders of its own → falls back to the top-ranked default.
    assert _names(result["mySuppliers"]) == ["Supplier 1", "Supplier 2", "Supplier 3"]


def test_no_business_keeps_the_global_ranking(db, suppliers):
    _order(db, suppliers[2], "alpha@shop.com")

    result = suppliers_overview(business=None, db=db)

    assert _names(result["mySuppliers"]) == ["Supplier 1", "Supplier 2", "Supplier 3"]
