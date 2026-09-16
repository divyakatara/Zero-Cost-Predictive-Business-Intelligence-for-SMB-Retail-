from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    """Stores users who can log in to the ERP system."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    gstin = Column(String, nullable=True)
    supplier_code = Column(String, nullable=True, index=True)


class Supplier(Base):
    """Stores supplier data used for supplier ranking and CSV ingestion."""

    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=True)
    rating = Column(Float, nullable=True)
    lead_time = Column(Integer, nullable=True)

    supplier_code = Column(String, unique=True, index=True, nullable=True)
    supplier_name = Column(String, nullable=True)
    contact_number = Column(String, nullable=True)
    product_code = Column(String, nullable=True)
    branch_id = Column(String, nullable=True)
    supplier_stock = Column(Integer, nullable=True)
    reorder_level = Column(Integer, nullable=True)
    stock_status = Column(String, nullable=True)
    stock_utilization_rate = Column(Integer, nullable=True)
    supply_risk_score = Column(Integer, nullable=True)

    on_time_delivery_rate = Column(Float, nullable=True)
    quality_score = Column(Float, nullable=True)
    reliability_score = Column(Float, nullable=True)
    average_cost = Column(Float, nullable=True)
    weighted_score = Column(Float, nullable=True)
    rank = Column(Integer, nullable=True)

    products = relationship("Product", back_populates="supplier")



class Product(Base):
    """Stores product data used by the app and CSV ingestion."""

    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    price = Column(Float, nullable=True)
    cost_price = Column(Float, nullable=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)

    product_code = Column(String, unique=True, index=True, nullable=True)
    supplier_code = Column(String, nullable=True)
    supplier_name = Column(String, nullable=True)
    location = Column(String, nullable=True)
    contact_number = Column(String, nullable=True)
    branch_id = Column(String, nullable=True)
    supplier_stock = Column(Integer, nullable=True)
    reorder_level = Column(Integer, nullable=True)
    stock_status = Column(String, nullable=True)
    stock_utilization_rate = Column(Integer, nullable=True)
    supply_risk_score = Column(Integer, nullable=True)

    supplier = relationship("Supplier", back_populates="products")
    sales = relationship("Sale", back_populates="product")
    inventory = relationship("Inventory", back_populates="product", uselist=False)


class Sale(Base):
    """Stores retail sales history and imported CSV data."""

    __tablename__ = "retail_sales"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    quantity = Column(Integer, nullable=False)
    date = Column(Date, nullable=False)

    sale_date = Column(Date, nullable=True)
    branch_id = Column(String, nullable=True)
    product_code = Column(String, nullable=True)
    quantity_sold = Column(Integer, nullable=True)
    price = Column(Float, nullable=True)
    promo = Column(Boolean, nullable=True)
    weekday = Column(Integer, nullable=True)
    month = Column(Integer, nullable=True)
    revenue = Column(Float, nullable=True)
    cost_price = Column(Float, nullable=True)
    total_cost = Column(Float, nullable=True)
    profit = Column(Float, nullable=True)
    lag_1 = Column(Integer, nullable=True)
    lag_7 = Column(Integer, nullable=True)
    is_weekend = Column(Boolean, nullable=True)

    product = relationship("Product", back_populates="sales")


class Inventory(Base):
    """Stores stock levels and reorder limits for stockout prediction."""

    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), unique=True, nullable=False)
    stock = Column(Integer, nullable=False)
    reorder_level = Column(Integer, nullable=False)

    product = relationship("Product", back_populates="inventory")


class PurchaseOrder(Base):
    """A simulated/internal purchase order produced by the Agentic AI procurement
    workflow. Never represents a real external order — see status/is_simulated.

    Status lifecycle (also doubles as the approval record — see AgentAction for
    the "why no separate Approval table" note):
        draft -> awaiting_approval -> approved -> created
                                    -> rejected
        (any state) -> failed   (an unexpected backend error while processing)
        awaiting_approval -> cancelled  (user withdraws before deciding)
    """

    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True, index=True)

    # Denormalized snapshot taken at creation time, independent of product_id/
    # supplier_id: a purchase order is a historical record and must keep
    # displaying correctly even if the referenced product/supplier is later
    # deleted (e.g. by the existing /api/data/clear or /api/data/import
    # reset endpoints). product_id/supplier_id are ON DELETE SET NULL for the
    # same reason — this audit trail must never be the thing that blocks a
    # product from being deleted.
    product_code = Column(String, nullable=True)
    product_name = Column(String, nullable=True)
    supplier_name = Column(String, nullable=True)

    status = Column(String, nullable=False, default="draft", index=True)
    is_simulated = Column(Boolean, nullable=False, default=True)

    recommended_quantity = Column(Integer, nullable=True)
    quantity = Column(Integer, nullable=True)

    current_stock = Column(Integer, nullable=True)
    reorder_level = Column(Integer, nullable=True)
    avg_daily_sales = Column(Float, nullable=True)
    lead_time_days = Column(Integer, nullable=True)

    supplier_score = Column(Float, nullable=True)
    supplier_rank = Column(Integer, nullable=True)

    reasoning = Column(Text, nullable=True)  # JSON-encoded list of deterministic reasoning facts
    explanation = Column(Text, nullable=True)  # natural-language explanation (Gemini or deterministic fallback)
    supplier_message = Column(Text, nullable=True)  # editable draft message to the supplier

    requested_by = Column(String, nullable=True)  # free-text identity captured from the frontend (no enforced auth yet)
    decided_by = Column(String, nullable=True)
    decision_reason = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = relationship("Product")
    supplier = relationship("Supplier")
    actions = relationship("AgentAction", back_populates="purchase_order", order_by="AgentAction.created_at")


class AgentAction(Base):
    """Append-only log of every step the procurement agent takes, including
    the human's approve/reject decision. This is the audit trail: rather than
    a separate Approval table, the decision is one more logged action tied to
    a PurchaseOrder, since this MVP only ever needs one decision per order.
    """

    __tablename__ = "agent_actions"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id", ondelete="SET NULL"), nullable=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)

    action_type = Column(String, nullable=False)
    # replenishment_analysis | supplier_recommendation | draft_created |
    # approved | rejected | order_created | error

    status = Column(String, nullable=False)  # success | failed | skipped
    message = Column(Text, nullable=True)
    details = Column(Text, nullable=True)  # JSON-encoded metadata
    actor = Column(String, nullable=True)  # "agent" or a user-supplied identity string
    error_detail = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    purchase_order = relationship("PurchaseOrder", back_populates="actions")
    product = relationship("Product")
