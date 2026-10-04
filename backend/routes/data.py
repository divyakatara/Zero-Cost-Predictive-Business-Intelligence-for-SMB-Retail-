import io
from typing import List

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from routes.auth import get_current_user
from services import tenancy

router = APIRouter(prefix="/api/data", tags=["Data Connection"])


def supplier_to_dataset_row(supplier: models.Supplier) -> dict:
    return {
        "supplier_id": supplier.supplier_code,
        "supplier_name": supplier.name,
        "location": supplier.location,
        "rating": supplier.rating,
        "lead_time_days": supplier.lead_time,
        "contact_number": supplier.contact_number,
        "product_id": supplier.product_code,
        "branch_id": supplier.branch_id,
        "supplier_stock": supplier.supplier_stock,
        "reorder_level": supplier.reorder_level,
        "stock_status": supplier.stock_status,
        "stock_utilization_rate": supplier.stock_utilization_rate,
        "supplier_risk_score": supplier.supply_risk_score,
    }


def _own_business_id(db: Session) -> int:
    """The caller's business. Write endpoints refuse unscoped callers (the
    admin), so nothing here can ever touch every business's data at once."""
    business_id = db.info.get("business_id")
    if business_id is None:
        raise HTTPException(status_code=403, detail="Only a business account can change its own data.")
    return business_id


@router.get("/status")
def get_data_status(db: Session = Depends(get_db)):
    """Data connection status and row counts: the caller's business, or the
    whole platform for the admin."""
    sales_count = db.query(models.Sale).count()
    products_count = db.query(models.Product).count()
    suppliers_count = db.query(models.Supplier).count()
    is_connected = sales_count > 0 and products_count > 0

    latest_import = (
        db.query(models.ImportLog).order_by(models.ImportLog.imported_at.desc()).first()
        if db.info.get("business_id") is not None
        else None
    )
    if not is_connected:
        dataset_name = "None"
    elif latest_import is not None:
        dataset_name = latest_import.filename
    else:
        dataset_name = "Capstone_ERP_Cleaned_Final (1).xlsx (demo dataset)"

    return {
        "connected": is_connected,
        "sales_count": sales_count,
        "products_count": products_count,
        "suppliers_count": suppliers_count,
        "dataset_name": dataset_name,
    }


@router.post("/load-demo")
def load_demo_dataset(db: Session = Depends(get_db)):
    """Replace the caller's data with a fresh copy of the demo dataset."""
    business_id = _own_business_id(db)
    try:
        copied = tenancy.copy_demo_data(db, business_id)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to load demo dataset: {exc}")
    return {
        "message": "Demo dataset loaded successfully",
        "sales_count": copied["sales"],
        "products_count": copied["products"],
        "suppliers_count": db.query(models.Supplier).count(),
    }


@router.post("/clear")
def clear_business_data(db: Session = Depends(get_db)):
    """Clear the caller's sales, products and inventory (other businesses and
    the shared supplier marketplace are untouched)."""
    business_id = _own_business_id(db)
    try:
        tenancy.clear_business_data(db, business_id)
        return {"message": "All business data cleared successfully", "connected": False}
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to clear data: {exc}")


@router.get("/history")
def import_history(db: Session = Depends(get_db)):
    """Past imports of the caller's business, newest first."""
    _own_business_id(db)
    logs = db.query(models.ImportLog).order_by(models.ImportLog.imported_at.desc()).all()
    return [
        {
            "id": log.id,
            "filename": log.filename,
            "row_count": log.row_count,
            "products_count": log.products_count,
            "imported_by": log.imported_by,
            "imported_at": log.imported_at.isoformat() if log.imported_at else None,
        }
        for log in logs
    ]


@router.post("/import")
async def import_user_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Validate an Excel/CSV dataset and replace the caller's data with it.
    Only the caller's rows are deleted; suppliers are a shared marketplace, so
    a suppliers sheet in the file is not imported."""
    business_id = _own_business_id(db)
    filename = file.filename or "dataset"
    contents = await file.read()

    if not filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload an Excel (.xlsx/.xls) or CSV (.csv) file.",
        )

    try:
        if filename.endswith(".csv"):
            df_dict = {"retail_sales": pd.read_csv(io.BytesIO(contents))}
        else:
            xl = pd.ExcelFile(io.BytesIO(contents))
            df_dict = {sheet: xl.parse(sheet) for sheet in xl.sheet_names}

        # Check required sheets/columns
        # Target required columns for sales/transactions: sale_date, product_id, quantity_sold (or quantity), sales_amount (or price/revenue)
        # (A DataFrame can't be used with `or`: pandas refuses to give it a truth value.)
        sales_df = next(
            (df_dict[name] for name in ("retail_sales", "Transactions") if name in df_dict),
            list(df_dict.values())[0],
        )
        sales_df.columns = [str(c).strip().lower() for c in sales_df.columns]
        cols = [str(c).strip().lower() for c in sales_df.columns]

        required_columns = ["sale_date", "product_id"]
        missing = [req for req in required_columns if req not in cols]

        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Column validation failed for '{filename}'. Missing required columns: {missing}. Expected columns like: sale_date, product_id, quantity_sold, sales_amount.",
            )

        # Replace this business's records only.
        tenancy.clear_business_data(db, business_id)

        # Load products if present
        if "products" in df_dict:
            prod_df = df_dict["products"]
            for _, r in prod_df.iterrows():
                p_code = str(r.get("product_id", "item")).strip()
                db.add(
                    models.Product(
                        product_code=p_code,
                        name=str(r.get("product_name", p_code)).strip(),
                        category=str(r.get("category", "General")).strip() if pd.notna(r.get("category")) else "General",
                        price=float(r.get("price", 0.0)) if pd.notna(r.get("price")) else 0.0,
                        cost_price=float(r.get("cost_price", 0.0)) if pd.notna(r.get("cost_price")) else 0.0,
                        supplier_code=str(r.get("supplier_id", "")).strip() if pd.notna(r.get("supplier_id")) else None,
                    )
                )
            db.commit()

        # Products that appear only in the sales sheet still need a product row.
        known_codes = {code for (code,) in db.query(models.Product.product_code).all()}
        for code in sorted({str(c).strip() for c in sales_df["product_id"].dropna()} - known_codes):
            db.add(models.Product(product_code=code, name=code, category="General"))
        db.commit()

        # Load sales records
        prod_map = {p.product_code: p.id for p in db.query(models.Product).all()}
        sales_records = []
        for _, r in sales_df.iterrows():
            s_date = pd.to_datetime(r.get("sale_date")).date() if pd.notna(r.get("sale_date")) else None
            if s_date is None:
                continue  # a sale without a date can't be placed on any chart
            p_code = str(r.get("product_id", "")).strip() if pd.notna(r.get("product_id")) else "item_1"
            qty = int(float(r.get("quantity_sold") or r.get("quantity") or 1))
            rev = float(r.get("sales_amount") or r.get("revenue") or r.get("price", 0) * qty)
            profit = float(r.get("profit") or (rev * 0.3))

            sales_records.append(
                models.Sale(
                    business_id=business_id,  # bulk save skips the tenancy flush hook
                    product_id=prod_map.get(p_code),
                    quantity_sold=qty,
                    sale_date=s_date,
                    # Calendar features the Decision Tree trains on, as the
                    # workbook loader and POST /sales fill them.
                    weekday=s_date.weekday(),
                    month=s_date.month,
                    is_weekend=s_date.weekday() >= 5,
                    promo=bool(r.get("promo")) if pd.notna(r.get("promo")) else False,
                    branch_id=str(r.get("branch_id", "store_1")).strip() if pd.notna(r.get("branch_id")) else "store_1",
                    product_code=p_code,
                    price=float(r.get("price", 0.0)) if pd.notna(r.get("price")) else 0.0,
                    revenue=rev,
                    cost_price=float(r.get("cost_price", 0.0)) if pd.notna(r.get("cost_price")) else 0.0,
                    total_cost=float(r.get("total_cost", 0.0)) if pd.notna(r.get("total_cost")) else 0.0,
                    profit=profit,
                    lag_7=int(float(r.get("lag_7", 0))) if pd.notna(r.get("lag_7")) else 0,
                )
            )

        if sales_records:
            db.bulk_save_objects(sales_records)
        db.add(models.ImportLog(
            business_id=business_id,
            filename=filename,
            row_count=len(sales_records),
            products_count=db.query(models.Product).count(),
            imported_by=current_user.get("sub"),
        ))
        db.commit()

        return {
            "message": f"Successfully validated and imported '{filename}'. Loaded {len(sales_records)} sales rows.",
            "filename": filename,
            "sales_count": len(sales_records),
            "products_count": db.query(models.Product).count(),
            "suppliers_count": db.query(models.Supplier).count(),
        }

    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Error parsing dataset file '{filename}': {exc}",
        )


@router.get("/products", response_model=List[schemas.ProductResponse])
def get_products(db: Session = Depends(get_db)):
    return db.query(models.Product).all()


@router.get("/suppliers", response_model=List[schemas.SupplierDatasetResponse])
def get_suppliers(db: Session = Depends(get_db)):
    suppliers = (
        db.query(models.Supplier)
        .filter(models.Supplier.supplier_code.isnot(None))
        .order_by(models.Supplier.id.asc())
        .all()
    )
    return [supplier_to_dataset_row(supplier) for supplier in suppliers]
