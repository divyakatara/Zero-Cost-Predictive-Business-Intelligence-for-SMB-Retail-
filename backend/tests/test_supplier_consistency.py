"""TASK-33 (#34): the agent picks suppliers using the marketplace's own ranking."""
import models
from routes.business_pages import suppliers_overview
from services.supplier_selection import ranked_suppliers, recommend_suppliers


def _supplier(db, code, rank, weighted_score):
    supplier = models.Supplier(name=code, supplier_code=code, rank=rank, weighted_score=weighted_score)
    db.add(supplier)
    db.commit()
    return supplier


def _marketplace_order(db):
    page = suppliers_overview(business=None, db=db)
    return [card["name"] for card in page["mySuppliers"] + page["recommended"]]


def _seed(db):
    # rank and weighted_score deliberately disagree for the top two, so a
    # second ordering (e.g. by weighted_score) would pick a different supplier.
    _supplier(db, "sup_a", rank=1, weighted_score=70.0)
    _supplier(db, "sup_b", rank=2, weighted_score=90.0)
    _supplier(db, "sup_c", rank=3, weighted_score=60.0)
    _supplier(db, "sup_d", rank=None, weighted_score=80.0)


def test_marketplace_uses_the_shared_ranking(db):
    _seed(db)

    assert _marketplace_order(db) == [s.supplier_code for s in ranked_suppliers(db)] == ["sup_a", "sup_b", "sup_c", "sup_d"]


def test_agent_picks_the_marketplace_top_supplier_for_an_unassigned_product(db):
    _seed(db)
    product = models.Product(name="Rice", product_code="item_1")
    db.add(product)
    db.commit()

    selection = recommend_suppliers(db, product)

    assert selection["recommended"]["supplier_code"] == _marketplace_order(db)[0] == "sup_a"
    assert [s["supplier_code"] for s in selection["alternatives"]] == _marketplace_order(db)[1:]


def test_agent_keeps_the_assigned_supplier_and_ranks_alternatives_like_the_marketplace(db):
    _seed(db)
    product = models.Product(name="Rice", product_code="item_1", supplier_code="sup_c")
    db.add(product)
    db.commit()

    selection = recommend_suppliers(db, product)

    # The assigned supplier is the only one that carries this product today.
    assert selection["recommended"]["supplier_code"] == "sup_c"
    assert selection["recommended"]["is_assigned_supplier"] is True
    assert [s["supplier_code"] for s in selection["alternatives"]] == [
        code for code in _marketplace_order(db) if code != "sup_c"
    ]
