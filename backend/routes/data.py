import io
from typing import List, Optional

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from csv_loader import load_excel_tables
import models
import schemas
from database import get_db

router = APIRouter(prefix="/api/data", tags=["Data Connection"])


def supplier_to_dataset_row(supplier: models.Supplier) -> dict:
    return {
        "supplier_id": supplier.supplier_code,
        "supplier_name": supplier.supplier_name or supplier.name,
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


@router.get("/status")
def get_data_status(db: Session = Depends(get_db)):
    """Return data connection status and current database row counts."""
    sales_count = db.query(models.Sale).count()
    products_count = db.query(models.Product).count()
    suppliers_count = db.query(models.Supplier).count()
    is_connected = sales_count > 0 and products_count > 0

    return {
        "connected": is_connected,
        "sales_count": sales_count,
        "products_count": products_count,
        "suppliers_count": suppliers_count,
        "dataset_name": "Capstone_ERP_Cleaned_Final (1).xlsx" if is_connected else "None",
    }


@router.post("/load-demo")
def load_demo_dataset(db: Session = Depends(get_db)):
    """Load the demo ERP workbook dataset (Capstone_ERP_Cleaned_Final (1).xlsx)."""
    try:
        # Force reload demo workbook
        db.query(models.Sale).delete()
        db.query(models.Product).delete()
        db.query(models.Supplier).delete()
        db.commit()

        load_excel_tables(db)

        sales_count = db.query(models.Sale).count()
        products_count = db.query(models.Product).count()
        suppliers_count = db.query(models.Supplier).count()

        return {
            "message": "Demo dataset loaded successfully",
            "sales_count": sales_count,
            "products_count": products_count,
            "suppliers_count": suppliers_count,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to load demo dataset: {exc}")


@router.post("/clear")
def clear_business_data(db: Session = Depends(get_db)):
    """Clear all business data (sales, products, suppliers) to test No Data Connected state."""
    try:
        db.query(models.Sale).delete()
        db.query(models.Product).delete()
        db.query(models.Supplier).delete()
        db.commit()
        return {"message": "All business data cleared successfully", "connected": False}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to clear data: {exc}")


@router.post("/import")
async def import_user_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload and validate user Excel/CSV dataset before importing into database."""
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
        sales_df = df_dict.get("retail_sales") or df_dict.get("Transactions") or list(df_dict.values())[0]
        cols = [str(c).strip().lower() for c in sales_df.columns]

        required_columns = ["sale_date", "product_id"]
        missing = [req for req in required_columns if req not in cols]

        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Column validation failed for '{filename}'. Missing required columns: {missing}. Expected columns like: sale_date, product_id, quantity_sold, sales_amount.",
            )

        # Clear old records and populate imported records
        db.query(models.Sale).delete()
        db.query(models.Product).delete()
        db.query(models.Supplier).delete()
        db.commit()

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

        # Load suppliers if present
        if "suppliers" in df_dict:
            supp_df = df_dict["suppliers"]
            for _, r in supp_df.iterrows():
                s_code = str(r.get("supplier_id", "supp")).strip()
                db.add(
                    models.Supplier(
                        supplier_code=s_code,
                        supplier_name=str(r.get("supplier_name", s_code)).strip(),
                        name=str(r.get("supplier_name", s_code)).strip(),
                        location=str(r.get("location", "")).strip() if pd.notna(r.get("location")) else None,
                        rating=float(r.get("rating", 4.0)) if pd.notna(r.get("rating")) else 4.0,
                        lead_time=int(r.get("lead_time_days", 3)) if pd.notna(r.get("lead_time_days")) else 3,
                    )
                )
            db.commit()

        # Load sales records
        prod_map = {p.product_code: p.id for p in db.query(models.Product).all()}
        sales_records = []
        for _, r in sales_df.iterrows():
            s_date = pd.to_datetime(r.get("sale_date")).date() if pd.notna(r.get("sale_date")) else None
            p_code = str(r.get("product_id", "")).strip() if pd.notna(r.get("product_id")) else "item_1"
            qty = int(float(r.get("quantity_sold") or r.get("quantity") or 1))
            rev = float(r.get("sales_amount") or r.get("revenue") or r.get("price", 0) * qty)
            profit = float(r.get("profit") or (rev * 0.3))

            sales_records.append(
                models.Sale(
                    product_id=prod_map.get(p_code),
                    quantity=qty,
                    quantity_sold=qty,
                    date=s_date,
                    sale_date=s_date,
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
