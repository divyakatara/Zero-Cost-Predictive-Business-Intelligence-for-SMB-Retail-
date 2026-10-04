import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from csv_loader import load_csv_tables, verify_loaded_data
import models
from database import SessionLocal, engine

from routes import (
    agent,
    auth,
    anomaly,
    business,
    business_pages,
    chat,
    dashboard,
    data,
    inventory,
    sales,
    supplier,
)

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
            text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS on_time_delivery_rate FLOAT")
        )
        connection.execute(
            text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS quality_score FLOAT")
        )
        connection.execute(
            text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS reliability_score FLOAT")
        )
        connection.execute(
            text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS average_cost FLOAT")
        )
        connection.execute(
            text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS weighted_score FLOAT")
        )
        connection.execute(
            text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS rank INTEGER")
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

        # Agentic AI procurement tables: denormalized display fields, plus
        # loosening product_id/supplier_id so a purchase-order/agent-action
        # audit record can never block a product from being deleted (see
        # models.py PurchaseOrder/AgentAction docstrings).
        connection.execute(
            text("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS product_code VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS product_name VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS supplier_name VARCHAR")
        )
        connection.execute(
            text("ALTER TABLE purchase_orders ALTER COLUMN product_id DROP NOT NULL")
        )
        connection.execute(
            text("ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_product_id_fkey")
        )
        connection.execute(
            text(
                "ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_product_id_fkey "
                "FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL"
            )
        )
        connection.execute(
            text("ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_supplier_id_fkey")
        )
        connection.execute(
            text(
                "ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_supplier_id_fkey "
                "FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL"
            )
        )
        connection.execute(
            text("ALTER TABLE agent_actions DROP CONSTRAINT IF EXISTS agent_actions_purchase_order_id_fkey")
        )
        connection.execute(
            text(
                "ALTER TABLE agent_actions ADD CONSTRAINT agent_actions_purchase_order_id_fkey "
                "FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL"
            )
        )
        connection.execute(
            text("ALTER TABLE agent_actions DROP CONSTRAINT IF EXISTS agent_actions_product_id_fkey")
        )
        connection.execute(
            text(
                "ALTER TABLE agent_actions ADD CONSTRAINT agent_actions_product_id_fkey "
                "FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL"
            )
        )

        # One awaiting-approval draft per product (TASK-52). Older parallel
        # drafts left by the race this index closes are cancelled first,
        # keeping the newest one (the draft the app already shows), and each
        # cancellation is logged in the agent audit trail.
        duplicate_ids = [
            row.id
            for row in connection.execute(
                text(
                    """
                    SELECT id FROM (
                        SELECT id, ROW_NUMBER() OVER (
                            PARTITION BY product_id ORDER BY created_at DESC, id DESC
                        ) AS newest_first
                        FROM purchase_orders
                        WHERE status = 'awaiting_approval' AND product_id IS NOT NULL
                    ) ranked
                    WHERE newest_first > 1
                    """
                )
            )
        ]
        for duplicate_id in duplicate_ids:
            connection.execute(
                text(
                    "UPDATE purchase_orders SET status = 'cancelled', "
                    "decision_reason = 'Duplicate draft closed automatically; a newer draft for this product is awaiting approval.', "
                    "updated_at = NOW() WHERE id = :id"
                ),
                {"id": duplicate_id},
            )
            connection.execute(
                text(
                    "INSERT INTO agent_actions (purchase_order_id, product_id, action_type, status, message, actor, created_at) "
                    "SELECT id, product_id, 'cancelled', 'success', "
                    "'Draft #' || id || ' cancelled as a duplicate of a newer awaiting draft.', 'system', NOW() "
                    "FROM purchase_orders WHERE id = :id"
                ),
                {"id": duplicate_id},
            )
        connection.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ux_purchase_orders_one_awaiting_per_product "
                "ON purchase_orders (product_id) WHERE status = 'awaiting_approval'"
            )
        )

        # Backfill the denormalized snapshot fields for any purchase_orders rows
        # created before this migration existed (safe/idempotent: only fills
        # rows that are still NULL, never overwrites).
        connection.execute(
            text(
                """
                UPDATE purchase_orders po
                SET product_code = p.product_code,
                    product_name = COALESCE(p.product_code, p.name)
                FROM products p
                WHERE po.product_id = p.id AND po.product_code IS NULL
                """
            )
        )
        connection.execute(
            text(
                """
                UPDATE purchase_orders po
                SET supplier_name = COALESCE(s.supplier_name, s.name)
                FROM suppliers s
                WHERE po.supplier_id = s.id AND po.supplier_name IS NULL
                """
            )
        )


# Keep the existing database updated with small schema changes.
run_simple_migrations()

with engine.begin() as connection:
            connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS businesses (
                    id SERIAL PRIMARY KEY,
                    owner_user_id INTEGER NOT NULL REFERENCES users(id),
                    name VARCHAR NOT NULL,
                    business_type VARCHAR NOT NULL,
                    category VARCHAR NOT NULL,
                    year_established INTEGER,
                    employee_count INTEGER,
                    description TEXT,
                    address_line1 VARCHAR NOT NULL,
                    address_line2 VARCHAR,
                    city VARCHAR NOT NULL,
                    state VARCHAR NOT NULL,
                    pincode VARCHAR NOT NULL,
                    country VARCHAR NOT NULL DEFAULT 'India',
                    phone VARCHAR NOT NULL,
                    email VARCHAR NOT NULL,
                    website VARCHAR,
                    registration_number VARCHAR NOT NULL,
                    gstin VARCHAR,
                    pan VARCHAR,
                    gst_certificate_name VARCHAR,
                    status VARCHAR NOT NULL DEFAULT 'pending',
                    submitted_at TIMESTAMP NOT NULL,
                    reviewed_at TIMESTAMP,
                    rejection_reason TEXT
                )
                """
            )
        )
            connection.execute(
                text("ALTER TABLE businesses ADD COLUMN IF NOT EXISTS gst_certificate_type VARCHAR")
            )
            connection.execute(
                text("ALTER TABLE businesses ADD COLUMN IF NOT EXISTS gst_certificate_data BYTEA")
            )

app = FastAPI(title="Smart ERP Backend")

# Only the frontend may call the API from a browser. FRONTEND_ORIGINS in
# backend/.env (comma-separated) overrides the local Vite dev server default.
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Public routes: login and registration must be available before authentication.
app.include_router(auth.router)
# Protect application API routers with a verified Bearer JWT.
protected_routers = [
    anomaly.router,
    business.router,
    business_pages.router,
    dashboard.router,
    sales.router,
    inventory.router,
    supplier.router,
    data.router,
    chat.router,
    agent.router,
]
for protected_router in protected_routers:
    app.include_router(
        protected_router,
        dependencies=[Depends(auth.require_valid_token)],
    )


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
