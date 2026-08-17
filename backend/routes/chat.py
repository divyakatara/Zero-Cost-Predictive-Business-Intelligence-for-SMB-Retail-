"""POST /api/chat — Gemini-powered ERP assistant.

Retrieves a concise snapshot of live ERP data from the database and feeds it
as context into Google Gemini so the model can answer user questions about
sales, inventory, suppliers, anomalies, and reorder recommendations.
"""

import os

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

import models
from database import get_db

# Load GEMINI_API_KEY from backend/.env (or the process environment).
load_dotenv()

_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if _GEMINI_API_KEY and _GEMINI_API_KEY != "your_key_here":
    genai.configure(api_key=_GEMINI_API_KEY)

router = APIRouter(prefix="/api", tags=["Chat"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


# ---------------------------------------------------------------------------
# Database context helpers
# ---------------------------------------------------------------------------


def _get_erp_context(db: Session) -> str:
    """Build a concise ERP context string from live database data."""
    lines: list[str] = []

    # --- Sales summary ---
    total_revenue = (
        db.query(func.coalesce(func.sum(models.Sale.revenue), 0.0)).scalar() or 0.0
    )
    total_orders = db.query(func.count(models.Sale.id)).scalar() or 0
    total_profit = (
        db.query(func.coalesce(func.sum(models.Sale.profit), 0.0)).scalar() or 0.0
    )
    avg_order_value = total_revenue / total_orders if total_orders else 0.0
    latest_sale_date = db.query(func.max(models.Sale.sale_date)).scalar()

    lines.append("=== SALES SUMMARY ===")
    lines.append(f"Total Revenue: ₹{total_revenue:,.2f}")
    lines.append(f"Total Profit: ₹{total_profit:,.2f}")
    lines.append(f"Total Orders: {total_orders:,}")
    lines.append(f"Average Order Value: ₹{avg_order_value:,.2f}")
    lines.append(f"Latest Sale Date: {latest_sale_date or 'N/A'}")

    # --- Monthly revenue trend (last 6 months) ---
    monthly_rows = (
        db.query(
            func.date_trunc("month", models.Sale.sale_date).label("month_start"),
            func.coalesce(func.sum(models.Sale.revenue), 0.0).label("revenue"),
        )
        .filter(models.Sale.sale_date.isnot(None))
        .group_by("month_start")
        .order_by(desc("month_start"))
        .limit(6)
        .all()
    )
    if monthly_rows:
        lines.append("\n=== MONTHLY REVENUE (last 6 months) ===")
        for row in reversed(monthly_rows):
            lines.append(
                f"  {row.month_start.strftime('%b %Y')}: ₹{float(row.revenue or 0):,.2f}"
            )
        # Detect revenue drop
        if len(monthly_rows) >= 2:
            latest_rev = float(monthly_rows[0].revenue or 0)
            prev_rev = float(monthly_rows[1].revenue or 0)
            if prev_rev > 0 and latest_rev < prev_rev:
                drop_pct = (prev_rev - latest_rev) / prev_rev * 100
                lines.append(
                    f"  ⚠ ANOMALY: Revenue dropped {drop_pct:.1f}% vs previous month."
                )

    # --- Top 5 products by revenue ---
    top_product_rows = (
        db.query(
            models.Sale.product_code,
            func.coalesce(func.sum(models.Sale.revenue), 0.0).label("revenue"),
            func.coalesce(func.sum(models.Sale.quantity_sold), 0).label("units"),
            func.coalesce(func.sum(models.Sale.profit), 0.0).label("profit"),
        )
        .filter(models.Sale.product_code.isnot(None))
        .group_by(models.Sale.product_code)
        .order_by(desc("revenue"))
        .limit(5)
        .all()
    )
    if top_product_rows:
        lines.append("\n=== TOP 5 PRODUCTS BY REVENUE ===")
        for rank, row in enumerate(top_product_rows, start=1):
            lines.append(
                f"  {rank}. {row.product_code} — Revenue: ₹{float(row.revenue or 0):,.2f},"
                f" Units Sold: {int(row.units or 0)},"
                f" Profit: ₹{float(row.profit or 0):,.2f}"
            )

    # --- Inventory overview ---
    products = db.query(models.Product).all()
    critical = []
    low_stock = []
    reorder_recommendations = []

    for product in products:
        stock = product.supplier_stock or 0
        reorder = product.reorder_level or 0
        raw_status = (product.stock_status or "").lower()

        if raw_status in {"critical", "low", "ok"}:
            status = raw_status if raw_status != "ok" else "ok"
        elif stock <= reorder:
            status = "critical"
        elif stock <= reorder * 1.25:
            status = "low"
        else:
            status = "ok"

        code = product.product_code or product.name
        if status == "critical":
            critical.append(
                f"  - {code}: stock={stock}, reorder_level={reorder} [CRITICAL]"
            )
            reorder_recommendations.append(
                f"  - Reorder {code} immediately (stock={stock} ≤ reorder_level={reorder})"
            )
        elif status == "low":
            low_stock.append(
                f"  - {code}: stock={stock}, reorder_level={reorder} [LOW]"
            )
            reorder_recommendations.append(
                f"  - Monitor {code} closely (stock={stock}, approaching reorder_level={reorder})"
            )

    lines.append(f"\n=== INVENTORY OVERVIEW ===")
    lines.append(f"Total Products: {len(products)}")
    lines.append(f"Critical (at/below reorder level): {len(critical)}")
    lines.append(f"Low Stock (within 25% of reorder level): {len(low_stock)}")
    lines.append(f"Healthy Stock: {len(products) - len(critical) - len(low_stock)}")

    if critical:
        lines.append("\n--- Critical Stock Items ---")
        lines.extend(critical[:10])  # cap at 10 to avoid token bloat

    if low_stock:
        lines.append("\n--- Low Stock Items ---")
        lines.extend(low_stock[:10])

    # --- Reorder recommendations ---
    if reorder_recommendations:
        lines.append("\n=== REORDER RECOMMENDATIONS ===")
        lines.extend(reorder_recommendations[:10])

    # --- Supplier performance ---
    suppliers = db.query(models.Supplier).all()
    risky_suppliers = [s for s in suppliers if (s.supply_risk_score or 0) >= 3]

    lines.append(f"\n=== SUPPLIER PERFORMANCE ===")
    lines.append(f"Total Suppliers: {len(suppliers)}")
    lines.append(f"High-Risk Suppliers (score ≥ 3): {len(risky_suppliers)}")

    if suppliers:
        lines.append("\n--- Top Suppliers (by rating) ---")
        top_suppliers = sorted(
            suppliers, key=lambda s: float(s.rating or 0), reverse=True
        )[:5]
        for supplier in top_suppliers:
            lines.append(
                f"  - {supplier.supplier_name or supplier.name}"
                f" | Rating: {float(supplier.rating or 0):.1f}/5"
                f" | Lead Time: {supplier.lead_time or 0} days"
                f" | Risk Score: {supplier.supply_risk_score or 0}"
                f" | Stock: {supplier.supplier_stock or 0}"
            )

    if risky_suppliers:
        lines.append("\n--- High-Risk Suppliers ---")
        for supplier in risky_suppliers[:5]:
            lines.append(
                f"  - ⚠ {supplier.supplier_name or supplier.name}"
                f" (risk={supplier.supply_risk_score}, lead_time={supplier.lead_time} days)"
            )

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# System prompt template
# ---------------------------------------------------------------------------


_SYSTEM_PROMPT = """You are an intelligent ERP assistant for a small-to-medium retail business.
You have access to the following real-time ERP data snapshot extracted from the live database.
Use ONLY this data to answer the user's question. Do not fabricate numbers.
Be concise, friendly, and actionable. Format currency in Indian Rupees (₹).
Do NOT use asterisks (*) or markdown bold (**) in your output. Use plain text and simple bullet points (• or -) if listing items.
If the user asks something outside the ERP domain, politely redirect them.

--- LIVE ERP DATA ---
{context}
--- END OF ERP DATA ---
"""


def _clean_reply(text: str) -> str:
    """Strip markdown asterisks and convert star bullets to plain bullet points."""
    lines = []
    for line in text.split("\n"):
        # Replace leading bullet stars with bullet points
        cleaned_line = line.strip()
        if cleaned_line.startswith("* "):
            line = line.replace("* ", "• ", 1)
        # Remove any markdown bold or remaining asterisks
        line = line.replace("**", "").replace("*", "")
        lines.append(line)
    return "\n".join(lines).strip()



# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """Receive a user message, enrich it with live ERP context, and ask Gemini."""

    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or api_key == "your_key_here":
        raise HTTPException(
            status_code=503,
            detail=(
                "GEMINI_API_KEY is not configured. "
                "Please set it in backend/.env and restart the server."
            ),
        )

    # Re-configure in case the key was set after import time.
    genai.configure(api_key=api_key)

    try:
        context = _get_erp_context(db)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve ERP data: {exc}",
        )

    system_prompt = _SYSTEM_PROMPT.format(context=context)

    # Candidate model names to try in order of preference
    model_candidates = [
        "gemini-2.0-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-1.5-pro-latest",
        "gemini-pro",
    ]

    # Try listing available models from Gemini API first
    try:
        available_models = [
            m.name.replace("models/", "")
            for m in genai.list_models()
            if "generateContent" in getattr(m, "supported_generation_methods", [])
        ]
        # Put matching available models at the top of candidate list
        for m_name in reversed(available_models):
            if m_name not in model_candidates and "gemini" in m_name.lower():
                model_candidates.insert(0, m_name)
            elif m_name in model_candidates:
                model_candidates.remove(m_name)
                model_candidates.insert(0, m_name)
    except Exception:
        pass  # If list_models fails, continue with hardcoded candidates

    last_exception = None
    for model_name in model_candidates:
        try:
            try:
                gemini_model = genai.GenerativeModel(
                    model_name=model_name,
                    system_instruction=system_prompt,
                )
                response = gemini_model.generate_content(request.message)
            except Exception:
                # Some older model versions don't accept system_instruction
                gemini_model = genai.GenerativeModel(model_name=model_name)
                full_prompt = f"{system_prompt}\n\nUser Question: {request.message}"
                response = gemini_model.generate_content(full_prompt)

            if response and hasattr(response, "text") and response.text:
                return ChatResponse(reply=_clean_reply(response.text))
        except Exception as exc:
            last_exception = exc
            continue

    raise HTTPException(
        status_code=502,
        detail=f"Gemini API error: {last_exception}",
    )

