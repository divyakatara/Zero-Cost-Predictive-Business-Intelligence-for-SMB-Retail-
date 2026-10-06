"""AI Insights shows only counts taken from the data: no invented confidence
or urgency figures, and low-stock products are part of the restock advice."""
from datetime import date

import models
from routes.business_pages import insights_overview


def test_insights_counts_come_from_the_data(db, suppliers):
    suppliers[2].supply_risk_score = 4
    db.add_all([
        models.Product(name="A", product_code="item_a", supplier_stock=50, reorder_level=100),   # critical
        models.Product(name="B", product_code="item_b", supplier_stock=110, reorder_level=100),  # low
        models.Product(name="C", product_code="item_c", supplier_stock=900, reorder_level=100),  # ok
        models.Sale(product_code="item_c", sale_date=date(2024, 1, 1), quantity_sold=5, revenue=500.0),
        models.Sale(product_code="item_a", sale_date=date(2024, 1, 1), quantity_sold=1, revenue=100.0),
    ])
    db.commit()

    result = insights_overview(db=db)

    kpis = {k["label"]: k["value"] for k in result["kpis"]}
    assert kpis == {"Action Items": "3", "Products to Restock": "2", "Suppliers to Review": "1"}
    restock, sales, supplier = result["primarySuggestions"]
    assert restock["title"] == "Restock item_a, item_b" and restock["priority"] == "High"
    assert sales["title"] == "Promote item_c" and "83.3% of total" in sales["impact"]
    assert supplier["title"] == "Review Supplier 3"
    assert set(result) == {"headerNote", "kpis", "primarySuggestions"}  # no confidence table or score
