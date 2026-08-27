from sqlalchemy import Boolean, Column, Date, Float, ForeignKey, Integer, String
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
