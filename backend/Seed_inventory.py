"""
One-time script to seed the Inventory table with real stock/reorder data.

Run this from inside the backend/ folder, with venv activated:
    python seed_inventory.py

It reads inventory_seed.csv (product_id, stock, reorder_level -- summed
across both branches, since the Inventory table has one row per product,
not per branch) and inserts/updates rows in the Inventory table by
matching product_id (e.g. "item_1") to the product's real integer id
via Product.product_code.
"""
import csv
from pathlib import Path

from database import SessionLocal
import models

CSV_PATH = Path(__file__).resolve().parent / "data" / "inventory_seed.csv"


def main():
    db = SessionLocal()
    try:
        # Build a lookup: product_code (e.g. "item_1") -> Product.id (integer PK)
        product_lookup = {
            p.product_code: p.id
            for p in db.query(models.Product).all()
            if p.product_code
        }

        if not product_lookup:
            print("No products found in the database. Load products.csv first.")
            return

        existing = {
            inv.product_id: inv
            for inv in db.query(models.Inventory).all()
        }

        inserted, updated, skipped = 0, 0, 0

        with CSV_PATH.open("r", newline="", encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                product_code = row["product_id"].strip()
                product_id = product_lookup.get(product_code)

                if product_id is None:
                    print(f"  Skipping {product_code}: not found in products table")
                    skipped += 1
                    continue

                stock = int(row["stock"])
                reorder_level = int(row["reorder_level"])

                if product_id in existing:
                    existing[product_id].stock = stock
                    existing[product_id].reorder_level = reorder_level
                    updated += 1
                else:
                    db.add(models.Inventory(
                        product_id=product_id,
                        stock=stock,
                        reorder_level=reorder_level,
                    ))
                    inserted += 1

        db.commit()
        print(f"Done. Inserted: {inserted}, Updated: {updated}, Skipped: {skipped}")

    finally:
        db.close()


if __name__ == "__main__":
    main()