from datetime import date
from typing import Optional

from pydantic import BaseModel


# User schemas
class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str
    gstin: Optional[str] = None
    supplier_id: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    gstin: Optional[str] = None
    supplier_id: Optional[str] = None

    class Config:
        from_attributes = True


class UserRegisterResponse(BaseModel):
    message: str
    user: UserResponse


# Product schemas are ready for future product APIs and ML data use.
class ProductCreate(BaseModel):
    name: str
    category: Optional[str] = None
    price: Optional[float] = None
    cost_price: Optional[float] = None
    supplier_id: Optional[int] = None
    product_code: Optional[str] = None
    supplier_code: Optional[str] = None
    supplier_name: Optional[str] = None
    location: Optional[str] = None
    contact_number: Optional[str] = None
    branch_id: Optional[str] = None
    supplier_stock: Optional[int] = None
    reorder_level: Optional[int] = None
    stock_status: Optional[str] = None
    stock_utilization_rate: Optional[int] = None
    supply_risk_score: Optional[int] = None


class ProductResponse(ProductCreate):
    id: int

    class Config:
        from_attributes = True


# Sales schemas
class SaleCreate(BaseModel):
    product_id: int
    quantity: int
    date: date
    sale_date: Optional[date] = None
    branch_id: Optional[str] = None
    product_code: Optional[str] = None
    quantity_sold: Optional[int] = None
    price: Optional[float] = None
    promo: Optional[bool] = None
    weekday: Optional[int] = None
    month: Optional[int] = None
    revenue: Optional[float] = None
    cost_price: Optional[float] = None
    total_cost: Optional[float] = None
    profit: Optional[float] = None
    lag_1: Optional[int] = None
    lag_7: Optional[int] = None
    is_weekend: Optional[bool] = None


class SaleResponse(SaleCreate):
    id: int

    class Config:
        from_attributes = True


# Inventory schemas
class InventoryCreate(BaseModel):
    product_id: int
    stock: int
    reorder_level: int


class InventoryResponse(InventoryCreate):
    id: int

    class Config:
        from_attributes = True


# Supplier schemas
class SupplierCreate(BaseModel):
    name: str
    location: Optional[str] = None
    rating: Optional[float] = None
    lead_time: Optional[int] = None
    supplier_code: Optional[str] = None
    supplier_name: Optional[str] = None
    contact_number: Optional[str] = None
    product_code: Optional[str] = None
    branch_id: Optional[str] = None
    supplier_stock: Optional[int] = None
    reorder_level: Optional[int] = None
    stock_status: Optional[str] = None
    stock_utilization_rate: Optional[int] = None
    supply_risk_score: Optional[int] = None


class SupplierResponse(SupplierCreate):
    id: int

    class Config:
        from_attributes = True


class SupplierDatasetResponse(BaseModel):
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    location: Optional[str] = None
    rating: Optional[float] = None
    lead_time_days: Optional[int] = None
    contact_number: Optional[str] = None
    product_id: Optional[str] = None
    branch_id: Optional[str] = None
    supplier_stock: Optional[int] = None
    reorder_level: Optional[int] = None
    stock_status: Optional[str] = None
    stock_utilization_rate: Optional[int] = None
    supplier_risk_score: Optional[int] = None
