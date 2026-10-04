"""Per-business data isolation (TASK-12/13/15).

Every request from a business user runs in a database session whose
``info["business_id"]`` is set (see ``scope_to_business``). Two session
events then make isolation automatic instead of relying on each query to
remember a filter:

* ``do_orm_execute`` adds ``business_id = <caller>`` to every ORM SELECT,
  UPDATE and DELETE that touches a tenant table, including aggregates,
  counts and joins;
* ``before_flush`` stamps ``business_id`` on new tenant rows.

Sessions without a business (startup tasks, the admin, supplier accounts)
are unscoped. Suppliers are deliberately not a tenant table: they are a
platform-wide marketplace and supplier accounts link to a global
supplier_code, so the supplier portal reads demand across all businesses.

Bulk inserts (``bulk_insert_mappings``/``bulk_save_objects``) skip flush
events, so callers set ``business_id`` explicitly there.
"""

import secrets
from datetime import datetime
from typing import Optional

from fastapi import Depends, HTTPException
from sqlalchemy import event
from sqlalchemy.orm import Session, with_loader_criteria

import models
from database import get_db
from routes.auth import get_current_user, hash_password

TENANT_MODELS = (
    models.Product,
    models.Sale,
    models.Inventory,
    models.PurchaseOrder,
    models.AgentAction,
    models.ImportLog,
)

DEMO_OWNER_EMAIL = "demo-store@smarterp.local"
DEMO_BUSINESS_NAME = "Smart ERP Demo Store"


@event.listens_for(Session, "do_orm_execute")
def _scope_queries(state):
    business_id = state.session.info.get("business_id")
    if business_id is None or not (state.is_select or state.is_update or state.is_delete):
        return
    state.statement = state.statement.options(
        *(
            with_loader_criteria(model, lambda cls: cls.business_id == business_id, include_aliases=True)
            for model in TENANT_MODELS
        )
    )


@event.listens_for(Session, "before_flush")
def _stamp_new_rows(session, flush_context, instances):
    business_id = session.info.get("business_id")
    if business_id is None:
        return
    for obj in session.new:
        if isinstance(obj, TENANT_MODELS) and obj.business_id is None:
            obj.business_id = business_id


def business_for_user(db: Session, current_user: dict) -> Optional["models.Business"]:
    user = db.query(models.User).filter(models.User.email == current_user.get("sub")).first()
    if user is None:
        return None
    return db.query(models.Business).filter(models.Business.owner_user_id == user.id).first()


def scope_to_business(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Router dependency for the business data APIs. Binds the request's
    session (the same one the endpoint receives) to the caller's business.

    business -> scoped to its own approved business (403 if none/pending)
    admin    -> unscoped, platform-wide figures
    supplier -> 403: the supplier portal has its own supplier-scoped API
    """
    role = current_user.get("role")
    if role == "admin":
        return current_user
    if role != "business":
        raise HTTPException(status_code=403, detail="This data is only available to business accounts.")
    business = business_for_user(db, current_user)
    if business is None or business.status != "approved":
        raise HTTPException(status_code=403, detail="Your business must be approved before you can use its data.")
    db.info["business_id"] = business.id
    return current_user


def get_demo_business(db: Session) -> Optional["models.Business"]:
    return db.query(models.Business).filter(models.Business.is_demo.is_(True)).first()


def ensure_demo_business(db: Session) -> "models.Business":
    """The system-owned business that holds the canonical demo dataset."""
    demo = get_demo_business(db)
    if demo is not None:
        return demo
    owner = db.query(models.User).filter(models.User.email == DEMO_OWNER_EMAIL).first()
    if owner is None:
        # Nobody logs in as the demo store; the password is random and never shown.
        owner = models.User(
            name=DEMO_BUSINESS_NAME, email=DEMO_OWNER_EMAIL,
            password=hash_password(secrets.token_urlsafe(24)), role="business",
        )
        db.add(owner)
        db.flush()
    demo = models.Business(
        owner_user_id=owner.id, name=DEMO_BUSINESS_NAME, business_type="Retail", category="General",
        description="System-owned business holding the shared demo dataset.",
        address_line1="-", city="Bengaluru", state="Karnataka", pincode="560001", country="India",
        phone="-", email=DEMO_OWNER_EMAIL, registration_number="DEMO",
        status="approved", is_demo=True, submitted_at=datetime.utcnow(), reviewed_at=datetime.utcnow(),
    )
    db.add(demo)
    db.commit()
    db.refresh(demo)
    return demo


def _columns(model, row, skip=("id", "business_id")):
    return {c.key: getattr(row, c.key) for c in model.__table__.columns if c.key not in skip}


def clear_business_data(db: Session, business_id: int) -> None:
    """Delete one business's sales, inventory and products (orders keep their
    snapshot fields; their product link is set to NULL by the FK)."""
    for model in (models.Sale, models.Inventory, models.Product):
        db.query(model).filter(model.business_id == business_id).delete(synchronize_session=False)
    db.commit()


def copy_demo_data(db: Session, business_id: int) -> dict:
    """Give a business its own copy of the demo dataset (products, inventory,
    sales), replacing whatever it had. Runs unscoped and sets business_id
    explicitly, since bulk inserts bypass the flush hook."""
    demo = get_demo_business(db)
    if demo is None or demo.id == business_id:
        return {"products": 0, "sales": 0}
    saved_scope = db.info.pop("business_id", None)
    try:
        clear_business_data(db, business_id)
        demo_products = db.query(models.Product).filter(models.Product.business_id == demo.id).all()
        id_map = {}
        for product in demo_products:
            # supplier_id is left empty: suppliers are platform-wide and are
            # resolved by supplier_code, so a copy never blocks a supplier reload.
            copy = models.Product(
                **_columns(models.Product, product, skip=("id", "business_id", "supplier_id")),
                business_id=business_id,
            )
            db.add(copy)
            db.flush()
            id_map[product.id] = copy.id

        inventory = db.query(models.Inventory).filter(models.Inventory.business_id == demo.id).all()
        db.bulk_insert_mappings(models.Inventory, [
            {**_columns(models.Inventory, row), "product_id": id_map[row.product_id], "business_id": business_id}
            for row in inventory if row.product_id in id_map
        ])

        sales = db.query(models.Sale).filter(models.Sale.business_id == demo.id).all()
        db.bulk_insert_mappings(models.Sale, [
            {**_columns(models.Sale, row), "product_id": id_map.get(row.product_id), "business_id": business_id}
            for row in sales
        ])
        db.commit()
        return {"products": len(id_map), "sales": len(sales)}
    finally:
        if saved_scope is not None:
            db.info["business_id"] = saved_scope


def business_has_data(db: Session, business_id: int) -> bool:
    return (
        db.query(models.Product.id).filter(models.Product.business_id == business_id).first() is not None
    )
