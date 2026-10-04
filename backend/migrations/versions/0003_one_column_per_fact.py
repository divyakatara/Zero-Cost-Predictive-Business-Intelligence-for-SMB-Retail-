"""one column per fact

TASK-50: several tables stored the same fact twice under different names,
and different insert paths filled different copies (POST /sales filled only
quantity/date). Each fact now has one column:

- retail_sales: quantity -> quantity_sold, date -> sale_date (now NOT NULL)
- suppliers:    supplier_name -> name
- products:     supplier_name / location / contact_number were copies of the
                supplier's details; they are read from the supplier (by
                supplier_code) instead

Values are copied into the kept column before the duplicate is dropped, so no
data is lost. downgrade() restores the columns and copies the values back.

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-04
"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    # Keep whichever copy has a value; the duplicate is dropped afterwards.
    op.execute("UPDATE retail_sales SET quantity_sold = COALESCE(quantity_sold, quantity), sale_date = COALESCE(sale_date, date)")
    op.execute("UPDATE suppliers SET name = COALESCE(NULLIF(supplier_name, ''), name)")

    with op.batch_alter_table("retail_sales") as batch:
        batch.alter_column("sale_date", existing_type=sa.Date(), nullable=False)
        batch.alter_column("quantity_sold", existing_type=sa.Integer(), nullable=False)
        batch.drop_column("quantity")
        batch.drop_column("date")
    with op.batch_alter_table("suppliers") as batch:
        batch.drop_column("supplier_name")
    with op.batch_alter_table("products") as batch:
        batch.drop_column("supplier_name")
        batch.drop_column("location")
        batch.drop_column("contact_number")


def downgrade():
    with op.batch_alter_table("products") as batch:
        batch.add_column(sa.Column("contact_number", sa.VARCHAR(), nullable=True))
        batch.add_column(sa.Column("location", sa.VARCHAR(), nullable=True))
        batch.add_column(sa.Column("supplier_name", sa.VARCHAR(), nullable=True))
    with op.batch_alter_table("suppliers") as batch:
        batch.add_column(sa.Column("supplier_name", sa.VARCHAR(), nullable=True))
    with op.batch_alter_table("retail_sales") as batch:
        batch.add_column(sa.Column("date", sa.DATE(), nullable=True))
        batch.add_column(sa.Column("quantity", sa.INTEGER(), nullable=True))
        batch.alter_column("quantity_sold", existing_type=sa.Integer(), nullable=True)
        batch.alter_column("sale_date", existing_type=sa.Date(), nullable=True)

    op.execute("UPDATE retail_sales SET quantity = quantity_sold, date = sale_date")
    op.execute("UPDATE suppliers SET supplier_name = name")
    op.execute(
        "UPDATE products SET supplier_name = s.name, location = s.location, contact_number = s.contact_number "
        "FROM suppliers s WHERE products.supplier_code = s.supplier_code"
    )
    with op.batch_alter_table("retail_sales") as batch:
        batch.alter_column("quantity", existing_type=sa.INTEGER(), nullable=False)
        batch.alter_column("date", existing_type=sa.DATE(), nullable=False)
