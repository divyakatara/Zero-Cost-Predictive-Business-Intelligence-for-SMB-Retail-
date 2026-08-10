from __future__ import annotations

import csv
from datetime import datetime
from pathlib import Path

from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

import models


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
SALES_BATCH_SIZE = 5000
SUPPLIER_SEED_PASSWORD = "supplier123"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _clean_str(value):
    if value is None:
        return None
    cleaned = str(value).strip()
    return cleaned or None


def _as_int(value):
    if value in (None, ""):
        return None
    return int(float(value))


def _as_float(value):
    if value in (None, ""):
        return None
    return float(value)


def _as_bool(value):
    if value in (None, ""):
        return None
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "y"}


def _as_date(value):
    if value in (None, ""):
        return None
    for fmt in ("%m/%d/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Unsupported date format: {value}")


def _state_code_for_location(location: str | None) -> str:
    state_codes = {
        "Ahmedabad": "24",
        "Bangalore": "29",
        "Bhubaneswar": "21",
        "Chennai": "33",
        "Coimbatore": "33",
        "Delhi": "07",
        "Hyderabad": "36",
        "Indore": "23",
        "Jaipur": "08",
        "Kochi": "32",
        "Kolkata": "19",
        "Lucknow": "09",
        "Mumbai": "27",
        "Nagpur": "27",
        "Pune": "27",
    }
    return state_codes.get((location or "").strip(), "29")


def _dummy_supplier_gstin(supplier: models.Supplier, index: int) -> str:
    state_code = _state_code_for_location(supplier.location)
    pan_block = f"AABCS{1000 + index:04d}"
    entity_code = "1"
    checksum = str((index % 9) + 1)
    return f"{state_code}{pan_block}{entity_code}Z{checksum}"


def load_csv_tables(db: Session) -> None:
    print("Loading suppliers from CSV...", flush=True)
    load_suppliers(db)
    print("Syncing supplier login users...", flush=True)
    sync_supplier_users(db)
    print("Loading products from CSV...", flush=True)
    load_products(db)
    print("Loading retail sales from CSV...", flush=True)
    load_sales(db)


def verify_loaded_data(db: Session) -> dict[str, int]:
    return {
        "suppliers": db.query(models.Supplier).count(),
        "products": db.query(models.Product).count(),
        "retail_sales": db.query(models.Sale).count(),
    }


def sync_supplier_users(db: Session) -> None:
    suppliers = (
        db.query(models.Supplier)
        .filter(models.Supplier.supplier_code.isnot(None))
        .order_by(models.Supplier.id.asc())
        .all()
    )
    if not suppliers:
        return

    existing_users = db.query(models.User).all()
    users_by_supplier_code = {
        user.supplier_code: user
        for user in existing_users
        if user.supplier_code
    }
    users_by_email = {
        (user.email or "").lower(): user
        for user in existing_users
        if user.email
    }

    new_rows = []
    for index, supplier in enumerate(suppliers, start=1):
        email = f"{supplier.supplier_code}@smarterp.local"
        existing_user = users_by_supplier_code.get(supplier.supplier_code) or users_by_email.get(email.lower())
        if existing_user:
            existing_user.name = supplier.supplier_name or supplier.name or existing_user.name
            existing_user.role = "supplier"
            existing_user.gstin = existing_user.gstin or _dummy_supplier_gstin(supplier, index)
            existing_user.supplier_code = supplier.supplier_code
            continue

        new_rows.append(
            {
                "name": supplier.supplier_name or supplier.name or supplier.supplier_code,
                "email": email,
                "password": pwd_context.hash(SUPPLIER_SEED_PASSWORD),
                "role": "supplier",
                "gstin": _dummy_supplier_gstin(supplier, index),
                "supplier_code": supplier.supplier_code,
            }
        )

    if new_rows:
        db.bulk_insert_mappings(models.User, new_rows)
    db.commit()


def load_suppliers(db: Session) -> None:
    path = DATA_DIR / "suppliers.csv"
    if not path.exists():
        path = DATA_DIR / "supplier.csv"
    if not path.exists():
        return

    existing_suppliers = {
        supplier.supplier_code: supplier
        for supplier in db.query(models.Supplier).all()
        if supplier.supplier_code
    }
    new_rows = []

    with path.open("r", newline="", encoding="utf-8-sig") as file:
        rows = csv.DictReader(file)
        for row in rows:
            supplier_code = _clean_str(row.get("supplier_id"))
            supplier_name = _clean_str(row.get("supplier_name"))
            supplier_payload = {
                "name": supplier_name or supplier_code or "Unknown",
                "location": _clean_str(row.get("location")),
                "rating": _as_float(row.get("rating")),
                "lead_time": _as_int(row.get("lead_time_days")),
                "supplier_code": supplier_code,
                "supplier_name": supplier_name,
                "contact_number": _clean_str(row.get("contact_number")),
                "product_code": _clean_str(row.get("product_id")),
                "branch_id": _clean_str(row.get("branch_id")),
                "supplier_stock": _as_int(row.get("supplier_stock")),
                "reorder_level": _as_int(row.get("reorder_level")),
                "stock_status": _clean_str(row.get("stock_status")),
                "stock_utilization_rate": _as_int(row.get("stock_utilization_rate")),
                "supply_risk_score": _as_int(row.get("supplier_risk_score") or row.get("supply_risk_score")),
            }

            existing_supplier = existing_suppliers.get(supplier_code)
            if existing_supplier:
                for field, value in supplier_payload.items():
                    setattr(existing_supplier, field, value)
                continue

            new_rows.append(supplier_payload)
            if supplier_code:
                existing_suppliers[supplier_code] = True

    if new_rows:
        db.bulk_insert_mappings(models.Supplier, new_rows)
    db.commit()


def load_products(db: Session) -> None:
    path = DATA_DIR / "products.csv"
    if not path.exists():
        return

    existing_codes = {
        code
        for code in db.scalars(select(models.Product.product_code)).all()
        if code
    }
    new_rows = []

    with path.open("r", newline="", encoding="utf-8-sig") as file:
        rows = csv.DictReader(file)
        for row in rows:
            product_code = row.get("product_id", "").strip() or None
            if product_code and product_code in existing_codes:
                continue

            new_rows.append(
                {
                    "name": (row.get("supplier_name") or product_code or "Unknown").strip(),
                    "category": row.get("location") or None,
                    "price": _as_float(row.get("supplier_stock")),
                    "cost_price": _as_float(row.get("reorder_level")),
                    "supplier_code": row.get("supplier_id") or None,
                    "supplier_name": row.get("supplier_name") or None,
                    "product_code": product_code,
                    "location": row.get("location") or None,
                    "contact_number": row.get("contact_number") or None,
                    "branch_id": row.get("branch_id") or None,
                    "supplier_stock": _as_int(row.get("supplier_stock")),
                    "reorder_level": _as_int(row.get("reorder_level")),
                    "stock_status": row.get("stock_status") or None,
                    "stock_utilization_rate": _as_int(row.get("stock_utilization_rate")),
                    "supply_risk_score": _as_int(row.get("supply_risk_score")),
                }
            )
            if product_code:
                existing_codes.add(product_code)

    if new_rows:
        db.bulk_insert_mappings(models.Product, new_rows)
        db.commit()


def load_sales(db: Session) -> None:
    path = DATA_DIR / "retail_sales.csv"
    if not path.exists():
        return

    product_lookup = dict(
        db.execute(select(models.Product.product_code, models.Product.id)).all()
    )
    existing_keys = set(
        db.execute(
            select(models.Sale.sale_date, models.Sale.product_code, models.Sale.branch_id)
        ).all()
    )
    rows_to_insert = []
    inserted = 0

    with path.open("r", newline="", encoding="utf-8-sig") as file:
        rows = csv.DictReader(file)
        for row in rows:
            sale_date = _as_date(row.get("sale_date"))
            product_code = row.get("product_id", "").strip() or None
            branch_id = row.get("branch_id") or None
            sale_key = (sale_date, product_code, branch_id)

            if sale_key in existing_keys:
                continue

            rows_to_insert.append(
                {
                    "product_id": product_lookup.get(product_code),
                    "quantity": _as_int(row.get("quantity_sold")) or 0,
                    "date": sale_date or datetime.utcnow().date(),
                    "sale_date": sale_date,
                    "branch_id": branch_id,
                    "product_code": product_code,
                    "quantity_sold": _as_int(row.get("quantity_sold")),
                    "price": _as_float(row.get("price")),
                    "promo": _as_bool(row.get("promo")),
                    "weekday": _as_int(row.get("weekday")),
                    "month": _as_int(row.get("month")),
                    "revenue": _as_float(row.get("revenue")),
                    "cost_price": _as_float(row.get("cost_price")),
                    "total_cost": _as_float(row.get("total_cost")),
                    "profit": _as_float(row.get("profit")),
                    "lag_1": _as_int(row.get("lag_1")),
                    "lag_7": _as_int(row.get("lag_7")),
                    "is_weekend": _as_bool(row.get("is_weekend")),
                }
            )
            existing_keys.add(sale_key)

            if len(rows_to_insert) >= SALES_BATCH_SIZE:
                db.bulk_insert_mappings(models.Sale, rows_to_insert)
                db.commit()
                inserted += len(rows_to_insert)
                print(f"Loaded {inserted} sales rows...", flush=True)
                rows_to_insert.clear()

    if rows_to_insert:
        db.bulk_insert_mappings(models.Sale, rows_to_insert)
        db.commit()
        inserted += len(rows_to_insert)
        print(f"Loaded {inserted} sales rows.", flush=True)
