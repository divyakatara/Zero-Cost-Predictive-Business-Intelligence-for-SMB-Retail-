"""baseline schema

The schema as of the switch to Alembic (TASK-49): every table and index in
models.py at that point, including multi-tenancy. Databases created before
Alembic are brought to this point by main.upgrade_legacy_database_to_baseline
and stamped; new databases are created from it.

Revision ID: 0001
Revises: 
Create Date: 2026-10-04 22:22:40.352535
"""
from alembic import op
import sqlalchemy as sa


revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('password', sa.String(), nullable=False),
    sa.Column('role', sa.String(), nullable=False),
    sa.Column('gstin', sa.String(), nullable=True),
    sa.Column('supplier_code', sa.String(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_supplier_code'), 'users', ['supplier_code'], unique=False)
    op.create_table('businesses',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('owner_user_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('business_type', sa.String(), nullable=False),
    sa.Column('category', sa.String(), nullable=False),
    sa.Column('year_established', sa.Integer(), nullable=True),
    sa.Column('employee_count', sa.Integer(), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('address_line1', sa.String(), nullable=False),
    sa.Column('address_line2', sa.String(), nullable=True),
    sa.Column('city', sa.String(), nullable=False),
    sa.Column('state', sa.String(), nullable=False),
    sa.Column('pincode', sa.String(), nullable=False),
    sa.Column('country', sa.String(), nullable=False),
    sa.Column('phone', sa.String(), nullable=False),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('website', sa.String(), nullable=True),
    sa.Column('registration_number', sa.String(), nullable=False),
    sa.Column('gstin', sa.String(), nullable=True),
    sa.Column('pan', sa.String(), nullable=True),
    sa.Column('gst_certificate_name', sa.String(), nullable=True),
    sa.Column('gst_certificate_type', sa.String(), nullable=True),
    sa.Column('gst_certificate_data', sa.LargeBinary(), nullable=True),
    sa.Column('status', sa.String(), server_default='pending', nullable=False),
    sa.Column('is_demo', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.Column('submitted_at', sa.DateTime(), nullable=False),
    sa.Column('reviewed_at', sa.DateTime(), nullable=True),
    sa.Column('rejection_reason', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(['owner_user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_businesses_id'), 'businesses', ['id'], unique=False)
    op.create_index(op.f('ix_businesses_owner_user_id'), 'businesses', ['owner_user_id'], unique=False)
    op.create_index(op.f('ix_businesses_status'), 'businesses', ['status'], unique=False)
    op.create_table('import_logs',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('business_id', sa.Integer(), nullable=True),
    sa.Column('filename', sa.String(), nullable=False),
    sa.Column('row_count', sa.Integer(), nullable=False),
    sa.Column('products_count', sa.Integer(), nullable=True),
    sa.Column('imported_by', sa.String(), nullable=True),
    sa.Column('imported_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_import_logs_business_id'), 'import_logs', ['business_id'], unique=False)
    op.create_index(op.f('ix_import_logs_id'), 'import_logs', ['id'], unique=False)
    op.create_table('suppliers',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('business_id', sa.Integer(), nullable=True),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('location', sa.String(), nullable=True),
    sa.Column('rating', sa.Float(), nullable=True),
    sa.Column('lead_time', sa.Integer(), nullable=True),
    sa.Column('supplier_code', sa.String(), nullable=True),
    sa.Column('supplier_name', sa.String(), nullable=True),
    sa.Column('contact_number', sa.String(), nullable=True),
    sa.Column('product_code', sa.String(), nullable=True),
    sa.Column('branch_id', sa.String(), nullable=True),
    sa.Column('supplier_stock', sa.Integer(), nullable=True),
    sa.Column('reorder_level', sa.Integer(), nullable=True),
    sa.Column('stock_status', sa.String(), nullable=True),
    sa.Column('stock_utilization_rate', sa.Integer(), nullable=True),
    sa.Column('supply_risk_score', sa.Integer(), nullable=True),
    sa.Column('on_time_delivery_rate', sa.Float(), nullable=True),
    sa.Column('quality_score', sa.Float(), nullable=True),
    sa.Column('reliability_score', sa.Float(), nullable=True),
    sa.Column('average_cost', sa.Float(), nullable=True),
    sa.Column('weighted_score', sa.Float(), nullable=True),
    sa.Column('rank', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_suppliers_business_id'), 'suppliers', ['business_id'], unique=False)
    op.create_index(op.f('ix_suppliers_id'), 'suppliers', ['id'], unique=False)
    op.create_index(op.f('ix_suppliers_supplier_code'), 'suppliers', ['supplier_code'], unique=True)
    op.create_table('products',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('business_id', sa.Integer(), nullable=True),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('category', sa.String(), nullable=True),
    sa.Column('price', sa.Float(), nullable=True),
    sa.Column('cost_price', sa.Float(), nullable=True),
    sa.Column('supplier_id', sa.Integer(), nullable=True),
    sa.Column('product_code', sa.String(), nullable=True),
    sa.Column('supplier_code', sa.String(), nullable=True),
    sa.Column('supplier_name', sa.String(), nullable=True),
    sa.Column('location', sa.String(), nullable=True),
    sa.Column('contact_number', sa.String(), nullable=True),
    sa.Column('branch_id', sa.String(), nullable=True),
    sa.Column('supplier_stock', sa.Integer(), nullable=True),
    sa.Column('reorder_level', sa.Integer(), nullable=True),
    sa.Column('stock_status', sa.String(), nullable=True),
    sa.Column('stock_utilization_rate', sa.Integer(), nullable=True),
    sa.Column('supply_risk_score', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_products_business_id'), 'products', ['business_id'], unique=False)
    op.create_index(op.f('ix_products_id'), 'products', ['id'], unique=False)
    op.create_index(op.f('ix_products_product_code'), 'products', ['product_code'], unique=False)
    op.create_index('ux_products_business_product_code', 'products', ['business_id', 'product_code'], unique=True)
    op.create_table('inventory',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('business_id', sa.Integer(), nullable=True),
    sa.Column('product_id', sa.Integer(), nullable=False),
    sa.Column('stock', sa.Integer(), nullable=False),
    sa.Column('reorder_level', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('product_id')
    )
    op.create_index(op.f('ix_inventory_business_id'), 'inventory', ['business_id'], unique=False)
    op.create_index(op.f('ix_inventory_id'), 'inventory', ['id'], unique=False)
    op.create_table('purchase_orders',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('business_id', sa.Integer(), nullable=True),
    sa.Column('product_id', sa.Integer(), nullable=True),
    sa.Column('supplier_id', sa.Integer(), nullable=True),
    sa.Column('product_code', sa.String(), nullable=True),
    sa.Column('product_name', sa.String(), nullable=True),
    sa.Column('supplier_name', sa.String(), nullable=True),
    sa.Column('status', sa.String(), nullable=False),
    sa.Column('is_simulated', sa.Boolean(), nullable=False),
    sa.Column('recommended_quantity', sa.Integer(), nullable=True),
    sa.Column('quantity', sa.Integer(), nullable=True),
    sa.Column('current_stock', sa.Integer(), nullable=True),
    sa.Column('reorder_level', sa.Integer(), nullable=True),
    sa.Column('avg_daily_sales', sa.Float(), nullable=True),
    sa.Column('lead_time_days', sa.Integer(), nullable=True),
    sa.Column('supplier_score', sa.Float(), nullable=True),
    sa.Column('supplier_rank', sa.Integer(), nullable=True),
    sa.Column('reasoning', sa.Text(), nullable=True),
    sa.Column('explanation', sa.Text(), nullable=True),
    sa.Column('supplier_message', sa.Text(), nullable=True),
    sa.Column('requested_by', sa.String(), nullable=True),
    sa.Column('decided_by', sa.String(), nullable=True),
    sa.Column('decision_reason', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_purchase_orders_business_id'), 'purchase_orders', ['business_id'], unique=False)
    op.create_index(op.f('ix_purchase_orders_id'), 'purchase_orders', ['id'], unique=False)
    op.create_index(op.f('ix_purchase_orders_product_id'), 'purchase_orders', ['product_id'], unique=False)
    op.create_index(op.f('ix_purchase_orders_status'), 'purchase_orders', ['status'], unique=False)
    op.create_index(op.f('ix_purchase_orders_supplier_id'), 'purchase_orders', ['supplier_id'], unique=False)
    op.create_index('ux_purchase_orders_one_awaiting_per_product', 'purchase_orders', ['product_id'], unique=True, postgresql_where=sa.text("status = 'awaiting_approval'"), sqlite_where=sa.text("status = 'awaiting_approval'"))
    op.create_table('retail_sales',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('business_id', sa.Integer(), nullable=True),
    sa.Column('product_id', sa.Integer(), nullable=True),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('date', sa.Date(), nullable=False),
    sa.Column('sale_date', sa.Date(), nullable=True),
    sa.Column('branch_id', sa.String(), nullable=True),
    sa.Column('product_code', sa.String(), nullable=True),
    sa.Column('quantity_sold', sa.Integer(), nullable=True),
    sa.Column('price', sa.Float(), nullable=True),
    sa.Column('promo', sa.Boolean(), nullable=True),
    sa.Column('weekday', sa.Integer(), nullable=True),
    sa.Column('month', sa.Integer(), nullable=True),
    sa.Column('revenue', sa.Float(), nullable=True),
    sa.Column('cost_price', sa.Float(), nullable=True),
    sa.Column('total_cost', sa.Float(), nullable=True),
    sa.Column('profit', sa.Float(), nullable=True),
    sa.Column('lag_1', sa.Integer(), nullable=True),
    sa.Column('lag_7', sa.Integer(), nullable=True),
    sa.Column('is_weekend', sa.Boolean(), nullable=True),
    sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_retail_sales_business_id'), 'retail_sales', ['business_id'], unique=False)
    op.create_index(op.f('ix_retail_sales_id'), 'retail_sales', ['id'], unique=False)
    op.create_table('agent_actions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('business_id', sa.Integer(), nullable=True),
    sa.Column('purchase_order_id', sa.Integer(), nullable=True),
    sa.Column('product_id', sa.Integer(), nullable=True),
    sa.Column('action_type', sa.String(), nullable=False),
    sa.Column('status', sa.String(), nullable=False),
    sa.Column('message', sa.Text(), nullable=True),
    sa.Column('details', sa.Text(), nullable=True),
    sa.Column('actor', sa.String(), nullable=True),
    sa.Column('error_detail', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['business_id'], ['businesses.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['purchase_order_id'], ['purchase_orders.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_agent_actions_business_id'), 'agent_actions', ['business_id'], unique=False)
    op.create_index(op.f('ix_agent_actions_created_at'), 'agent_actions', ['created_at'], unique=False)
    op.create_index(op.f('ix_agent_actions_id'), 'agent_actions', ['id'], unique=False)
    op.create_index(op.f('ix_agent_actions_product_id'), 'agent_actions', ['product_id'], unique=False)
    op.create_index(op.f('ix_agent_actions_purchase_order_id'), 'agent_actions', ['purchase_order_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_agent_actions_purchase_order_id'), table_name='agent_actions')
    op.drop_index(op.f('ix_agent_actions_product_id'), table_name='agent_actions')
    op.drop_index(op.f('ix_agent_actions_id'), table_name='agent_actions')
    op.drop_index(op.f('ix_agent_actions_created_at'), table_name='agent_actions')
    op.drop_index(op.f('ix_agent_actions_business_id'), table_name='agent_actions')
    op.drop_table('agent_actions')
    op.drop_index(op.f('ix_retail_sales_id'), table_name='retail_sales')
    op.drop_index(op.f('ix_retail_sales_business_id'), table_name='retail_sales')
    op.drop_table('retail_sales')
    op.drop_index('ux_purchase_orders_one_awaiting_per_product', table_name='purchase_orders', postgresql_where=sa.text("status = 'awaiting_approval'"), sqlite_where=sa.text("status = 'awaiting_approval'"))
    op.drop_index(op.f('ix_purchase_orders_supplier_id'), table_name='purchase_orders')
    op.drop_index(op.f('ix_purchase_orders_status'), table_name='purchase_orders')
    op.drop_index(op.f('ix_purchase_orders_product_id'), table_name='purchase_orders')
    op.drop_index(op.f('ix_purchase_orders_id'), table_name='purchase_orders')
    op.drop_index(op.f('ix_purchase_orders_business_id'), table_name='purchase_orders')
    op.drop_table('purchase_orders')
    op.drop_index(op.f('ix_inventory_id'), table_name='inventory')
    op.drop_index(op.f('ix_inventory_business_id'), table_name='inventory')
    op.drop_table('inventory')
    op.drop_index('ux_products_business_product_code', table_name='products')
    op.drop_index(op.f('ix_products_product_code'), table_name='products')
    op.drop_index(op.f('ix_products_id'), table_name='products')
    op.drop_index(op.f('ix_products_business_id'), table_name='products')
    op.drop_table('products')
    op.drop_index(op.f('ix_suppliers_supplier_code'), table_name='suppliers')
    op.drop_index(op.f('ix_suppliers_id'), table_name='suppliers')
    op.drop_index(op.f('ix_suppliers_business_id'), table_name='suppliers')
    op.drop_table('suppliers')
    op.drop_index(op.f('ix_import_logs_id'), table_name='import_logs')
    op.drop_index(op.f('ix_import_logs_business_id'), table_name='import_logs')
    op.drop_table('import_logs')
    op.drop_index(op.f('ix_businesses_status'), table_name='businesses')
    op.drop_index(op.f('ix_businesses_owner_user_id'), table_name='businesses')
    op.drop_index(op.f('ix_businesses_id'), table_name='businesses')
    op.drop_table('businesses')
    op.drop_index(op.f('ix_users_supplier_code'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
