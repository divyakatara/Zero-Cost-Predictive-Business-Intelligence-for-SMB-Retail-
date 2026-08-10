from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from csv_loader import load_csv_tables, verify_loaded_data
import models
from database import SessionLocal, engine
from routes import auth, business_pages, dashboard, data, inventory, sales, supplier

# Create database tables when the app starts.
models.Base.metadata.create_all(bind=engine)


def run_simple_migrations():
    """Add new columns to existing tables without using a migration tool yet."""
    with engine.begin() as connection:
        connection.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS gstin VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS supplier_code VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_code VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_name VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_number VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS product_code VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS branch_id VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_stock INTEGER")
        )
        connection.execute(
            text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS reorder_level INTEGER")
        )
        connection.execute(
            text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS stock_status VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS stock_utilization_rate INTEGER")
        )
        connection.execute(
            text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supply_risk_score INTEGER")
        )
        connection.execute(
            text("ALTER TABLE products ADD COLUMN IF NOT EXISTS product_code VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_code VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_name VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE products ADD COLUMN IF NOT EXISTS location VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE products ADD COLUMN IF NOT EXISTS contact_number VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE products ADD COLUMN IF NOT EXISTS branch_id VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_stock INTEGER")
        )
        connection.execute(
            text("ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_level INTEGER")
        )
        connection.execute(
            text("ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_status VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_utilization_rate INTEGER")
        )
        connection.execute(
            text("ALTER TABLE products ADD COLUMN IF NOT EXISTS supply_risk_score INTEGER")
        )
        connection.execute(
            text("ALTER TABLE retail_sales ADD COLUMN IF NOT EXISTS sale_date DATE")
        )
        connection.execute(
            text("ALTER TABLE retail_sales ADD COLUMN IF NOT EXISTS branch_id VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE retail_sales ADD COLUMN IF NOT EXISTS product_code VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE retail_sales ADD COLUMN IF NOT EXISTS quantity_sold INTEGER")
        )
        connection.execute(
            text("ALTER TABLE retail_sales ADD COLUMN IF NOT EXISTS price FLOAT")
        )
        connection.execute(
            text("ALTER TABLE retail_sales ADD COLUMN IF NOT EXISTS promo BOOLEAN")
        )
        connection.execute(
            text("ALTER TABLE retail_sales ADD COLUMN IF NOT EXISTS weekday INTEGER")
        )
        connection.execute(
            text("ALTER TABLE retail_sales ADD COLUMN IF NOT EXISTS month INTEGER")
        )
        connection.execute(
            text("ALTER TABLE retail_sales ADD COLUMN IF NOT EXISTS revenue FLOAT")
        )
        connection.execute(
            text("ALTER TABLE retail_sales ADD COLUMN IF NOT EXISTS cost_price FLOAT")
        )
        connection.execute(
            text("ALTER TABLE retail_sales ADD COLUMN IF NOT EXISTS total_cost FLOAT")
        )
        connection.execute(
            text("ALTER TABLE retail_sales ADD COLUMN IF NOT EXISTS profit FLOAT")
        )
        connection.execute(
            text("ALTER TABLE retail_sales ADD COLUMN IF NOT EXISTS lag_1 INTEGER")
        )
        connection.execute(
            text("ALTER TABLE retail_sales ADD COLUMN IF NOT EXISTS lag_7 INTEGER")
        )
        connection.execute(
            text("ALTER TABLE retail_sales ADD COLUMN IF NOT EXISTS is_weekend BOOLEAN")
        )


# Keep the existing database updated with small schema changes.
run_simple_migrations()

app = FastAPI(title="Smart ERP Backend")

# Allow frontend requests during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all route files.
app.include_router(auth.router)
app.include_router(business_pages.router)
app.include_router(dashboard.router)
app.include_router(sales.router)
app.include_router(inventory.router)
app.include_router(supplier.router)
app.include_router(data.router)


@app.on_event("startup")
def load_seed_csv_data():
    """Import CSV data into PostgreSQL on startup if it has not been loaded yet."""
    db = SessionLocal()
    try:
        print("Starting CSV sync...", flush=True)
        load_csv_tables(db)
        counts = verify_loaded_data(db)
        print(f"Database row counts after CSV sync: {counts}", flush=True)
        if any(counts[name] == 0 for name in ("suppliers", "products", "retail_sales")):
            raise RuntimeError(f"CSV load incomplete: {counts}")
    finally:
        db.close()


@app.get("/")
def root():
    """Simple health check route."""
    return {"message": "Smart ERP backend is running"}
