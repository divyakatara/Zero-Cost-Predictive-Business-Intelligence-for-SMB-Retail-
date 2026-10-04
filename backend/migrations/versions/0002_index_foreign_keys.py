"""index foreign keys products.supplier_id and retail_sales.product_id

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-04 22:23:00.080325
"""
from alembic import op
import sqlalchemy as sa


revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade():
    # Joins on these FKs (products -> suppliers, sales -> products) were
    # sequential scans. if_not_exists: a pre-Alembic database whose tables were
    # created from newer models may already have them.
    op.create_index(op.f('ix_products_supplier_id'), 'products', ['supplier_id'], unique=False, if_not_exists=True)
    op.create_index(op.f('ix_retail_sales_product_id'), 'retail_sales', ['product_id'], unique=False, if_not_exists=True)


def downgrade():
    op.drop_index(op.f('ix_retail_sales_product_id'), table_name='retail_sales')
    op.drop_index(op.f('ix_products_supplier_id'), table_name='products')
