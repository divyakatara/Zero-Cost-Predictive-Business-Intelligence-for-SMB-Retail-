from __future__ import annotations

import csv
from datetime import datetime
from pathlib import Path

import pandas as pd
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

import models


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
EXCEL_PATH = DATA_DIR / "Capstone_ERP_Cleaned_Final (1).xlsx"
SALES_BATCH_SIZE = 5000
SUPPLIER_SEED_PASSWORD = "supplier123"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _clean_str(value):
    if value is None or pd.isna(value):
        return None
    cleaned = str(value).strip()
    return cleaned or None


def _as_int(value):
    if value in (None, "") or pd.isna(value):
        return None
    return int(float(value))


def _as_float(value):
    if value in (None, "") or pd.isna(value):
        return None
    return float(value)


def _as_bool(value):
    if value in (None, "") or pd.isna(value):
        return None
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "y"}


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


def load_excel_tables(db: Session) -> None:
    if not EXCEL_PATH.exists():
        print(f"Excel workbook not found at {EXCEL_PATH}, skipping Excel sync.", flush=True)
        return

    # Check if database counts match Excel workbook (3650 sales, 10 products, 5 suppliers)
    sale_count = db.query(models.Sale).count()
    prod_count = db.query(models.Product).count()
    supp_count = db.query(models.Supplier).count()

    if sale_count == 3650 and prod_count == 10 and supp_count == 5:
        # Check if inventory table is populated or suppliers rank is missing
        supp_has_rank = db.query(models.Supplier).filter(models.Supplier.rank.isnot(None)).count()
        if db.query(models.Inventory).count() == 0 or supp_has_rank == 0:
            pass # proceed to full load
        else:
            print("Database already matches Excel workbook Capstone_ERP_Cleaned_Final (1).xlsx (3650 sales, 10 products, 5 suppliers).", flush=True)
            return



    print(f"Syncing database with Excel workbook {EXCEL_PATH.name}...", flush=True)

    # Purge existing seed data to enforce exact Excel workbook dataset
    db.query(models.Sale).delete()
    db.query(models.Inventory).delete()
    db.query(models.Product).delete()
    db.query(models.Supplier).delete()
    db.commit()


    xl = pd.ExcelFile(EXCEL_PATH)

    # 1. Load Suppliers and compute Weighted Scoring using the exact algorithm
    df_sup = xl.parse("suppliers")
    df_prod = xl.parse("products")

    # Calculate average product cost for each supplier
    supplier_cost = (
        df_prod
        .groupby("supplier_id")["cost_price"]
        .mean()
        .reset_index()
    )
    supplier_cost.rename(columns={"cost_price": "average_cost"}, inplace=True)

    # Combine supplier and product information
    supplier_data = df_sup.merge(supplier_cost, on="supplier_id", how="left")

    # Numeric conversion & missing value handling
    numeric_columns = ["average_cost", "quality_score", "lead_time_days", "reliability_score"]
    for column in numeric_columns:
        if column in supplier_data.columns:
            supplier_data[column] = pd.to_numeric(supplier_data[column], errors="coerce")
            if supplier_data[column].isna().sum() > 0:
                supplier_data[column] = supplier_data[column].fillna(supplier_data[column].median())

    def lower_is_better(column):
        minimum = column.min()
        maximum = column.max()
        if maximum == minimum:
            return pd.Series(100, index=column.index)
        return ((maximum - column) / (maximum - minimum)) * 100

    def higher_is_better(column):
        minimum = column.min()
        maximum = column.max()
        if maximum == minimum:
            return pd.Series(100, index=column.index)
        return ((column - minimum) / (maximum - minimum)) * 100

    supplier_data["cost_score"] = lower_is_better(supplier_data["average_cost"])
    supplier_data["quality_score_normalized"] = higher_is_better(supplier_data["quality_score"])
    supplier_data["delivery_score"] = lower_is_better(supplier_data["lead_time_days"])
    supplier_data["reliability_score_normalized"] = higher_is_better(supplier_data["reliability_score"])

    cost_weight = 0.30
    quality_weight = 0.30
    delivery_weight = 0.20
    reliability_weight = 0.20

    supplier_data["weighted_score"] = (
        supplier_data["cost_score"] * cost_weight
        + supplier_data["quality_score_normalized"] * quality_weight
        + supplier_data["delivery_score"] * delivery_weight
        + supplier_data["reliability_score_normalized"] * reliability_weight
    )

    supplier_data["rank"] = (
        supplier_data["weighted_score"]
        .rank(ascending=False, method="min")
        .astype(int)
    )

    supplier_mappings = []
    for _, r in supplier_data.iterrows():
        code = _clean_str(r.get("supplier_id"))
        s_name = _clean_str(r.get("supplier_name"))
        rel_score = _as_float(r.get("reliability_score")) or 90.0
        risk_score = max(1, min(5, int((100 - rel_score) / 4)))
        supplier_mappings.append(
            {
                "supplier_code": code,
                "supplier_name": s_name,
                "name": s_name or code or "Supplier",
                "location": _clean_str(r.get("location")),
                "rating": _as_float(r.get("rating")),
                "lead_time": _as_int(r.get("lead_time_days")),
                "contact_number": _clean_str(r.get("contact_number")),
                "supply_risk_score": risk_score,
                "on_time_delivery_rate": _as_float(r.get("on_time_delivery_rate")),
                "quality_score": _as_float(r.get("quality_score")),
                "reliability_score": rel_score,
                "average_cost": _as_float(r.get("average_cost")),
                "weighted_score": _as_float(r.get("weighted_score")),
                "rank": _as_int(r.get("rank")),
            }
        )
    if supplier_mappings:
        db.bulk_insert_mappings(models.Supplier, supplier_mappings)
        db.commit()


    # 2. Load Products
    df_prod = xl.parse("products")
    product_mappings = []
    for _, r in df_prod.iterrows():
        p_code = _clean_str(r.get("product_id"))
        p_name = _clean_str(r.get("product_name"))
        product_mappings.append(
            {
                "product_code": p_code,
                "name": p_name or p_code or "Product",
                "category": _clean_str(r.get("category")),
                "price": _as_float(r.get("price")),
                "cost_price": _as_float(r.get("cost_price")),
                "supplier_code": _clean_str(r.get("supplier_id")),
            }
        )
    if product_mappings:
        db.bulk_insert_mappings(models.Product, product_mappings)
        db.commit()

    # 3. Update stock levels from supplier_stock sheet
    if "supplier_stock" in xl.sheet_names:
        df_stock = xl.parse("supplier_stock")
        prod_map = {p.product_code: p for p in db.query(models.Product).all()}
        supp_map = {s.supplier_code: s for s in db.query(models.Supplier).all()}
        for _, r in df_stock.iterrows():
            p_code = _clean_str(r.get("product_id"))
            s_code = _clean_str(r.get("supplier_id"))
            stock = _as_int(r.get("supplier_stock"))
            reorder = _as_int(r.get("reorder_level"))
            status = _clean_str(r.get("stock_status"))
            util = _as_int(r.get("stock_utilization_rate"))
            risk = _as_int(r.get("supply_risk_score"))

            if p_code and p_code in prod_map:
                prod = prod_map[p_code]
                prod.supplier_stock = stock
                prod.reorder_level = reorder
                prod.stock_status = status
                prod.stock_utilization_rate = util
                if risk is not None:
                    prod.supply_risk_score = risk

            if s_code and s_code in supp_map:
                supp = supp_map[s_code]
                if stock is not None:
                    supp.supplier_stock = stock
                if reorder is not None:
                    supp.reorder_level = reorder
                if status:
                    supp.stock_status = status
                if risk is not None:
                    supp.supply_risk_score = risk
        db.commit()

    # 4. Load Sales (Transactions)
    df_tx = xl.parse("Transactions") if "Transactions" in xl.sheet_names else xl.parse("retail_sales")
    prod_id_map = {p.product_code: p.id for p in db.query(models.Product).all()}
    sales_mappings = []

    for _, r in df_tx.iterrows():
        s_date = pd.to_datetime(r.get("sale_date")).date() if pd.notna(r.get("sale_date")) else None
        p_code = _clean_str(r.get("product_id"))
        qty = _as_int(r.get("quantity_sold")) or 0
        rev = _as_float(r.get("sales_amount") or r.get("revenue"))
        cost = _as_float(r.get("cost_price"))
        tot_cost = _as_float(r.get("total_cost"))
        profit = _as_float(r.get("profit"))

        sales_mappings.append(
            {
                "product_id": prod_id_map.get(p_code),
                "quantity": qty,
                "date": s_date or datetime.utcnow().date(),
                "sale_date": s_date,
                "branch_id": _clean_str(r.get("branch_id")),
                "product_code": p_code,
                "quantity_sold": qty,
                "price": _as_float(r.get("price")),
                "promo": _as_bool(r.get("promo")),
                "weekday": _as_int(r.get("weekday")),
                "month": _as_int(r.get("month")),
                "revenue": rev,
                "cost_price": cost,
                "total_cost": tot_cost,
                "profit": profit,
                "lag_1": _as_int(r.get("lag_1")),
                "lag_7": _as_int(r.get("lag_7")),
                "is_weekend": _as_bool(r.get("is_weekend")),
            }
        )

    if sales_mappings:
        db.bulk_insert_mappings(models.Sale, sales_mappings)
        db.commit()

    # 5. Load inventory_seed.csv.xlsx into models.Inventory
    seed_inv_path = DATA_DIR / "inventory_seed.csv.xlsx"
    if seed_inv_path.exists():
        db.query(models.Inventory).delete()
        db.commit()
        xl_seed = pd.ExcelFile(seed_inv_path)
        df_seed = xl_seed.parse("inventory_seed")
        prod_code_map = {p.product_code: p.id for p in db.query(models.Product).all()}
        inv_rows = []
        for _, r in df_seed.iterrows():
            p_code = _clean_str(r.get("product_id"))
            p_id = prod_code_map.get(p_code)
            if p_id:
                inv_rows.append(
                    models.Inventory(
                        product_id=p_id,
                        stock=_as_int(r.get("stock")),
                        reorder_level=_as_int(r.get("reorder_level")),
                    )
                )
        if inv_rows:
            db.bulk_save_objects(inv_rows)
            db.commit()
            print(f"Loaded {len(inv_rows)} inventory seed records into database.", flush=True)

    print(f"Excel sync complete. Loaded {len(sales_mappings)} sales rows, {len(product_mappings)} products, {len(supplier_mappings)} suppliers.", flush=True)



def load_csv_tables(db: Session) -> None:
    load_excel_tables(db)
    sync_supplier_users(db)


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
