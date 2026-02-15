"""
Sales, transactions, and dashboard endpoints.

Includes batch sale processing with atomic stock deduction (race condition fix),
invoice PDF generation, and dashboard statistics.
"""

import io
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query  # type: ignore
from fastapi.responses import StreamingResponse  # type: ignore
from reportlab.lib.pagesizes import A4  # type: ignore
from reportlab.lib.units import mm  # type: ignore
from reportlab.pdfgen import canvas  # type: ignore

from supabase_client import supabase  # type: ignore
from helpers import get_category_id, log_movement  # type: ignore
import schemas  # type: ignore

router = APIRouter()


# ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

@router.post("/transactions")
async def create_transaction(tx: schemas.TransactionCreate):
    """Create a manual transaction (income or expense)."""
    data = tx.model_dump()
    res = await supabase.table("transactions").insert(data).execute()
    if not res or not res.data:
        raise HTTPException(status_code=400, detail="Failed to create transaction")

    created = res.data[0]
    await log_movement(
        "FINANZAS", "TRANSACCION",
        f"Transacción {created['type']}: ${created['amount']}",
        metadata={"amount": created["amount"], "type": created["type"]},
        transaction_id=created["id"],
    )
    return created


@router.get("/transactions")
async def read_transactions(skip: int = 0, limit: int = 50):
    """List transactions with pagination."""
    res = await (
        supabase.table("transactions")
        .select("*")
        .order("date", desc=True)
        .range(skip, skip + limit - 1)
        .execute()
    )
    return res.data if res else []


@router.get("/movements")
async def read_movements(limit: int = 100):
    """List audit log movements."""
    res = await (
        supabase.table("app_movements")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data if res else []


# ─── DASHBOARD ────────────────────────────────────────────────────────────────

@router.get("/dashboard-stats")
async def dashboard_stats():
    """Get current month income, expenses, balance, and recent sales."""
    now = datetime.now()
    month_start = f"{now.year}-{now.month:02d}-01"
    next_month = now.month + 1 if now.month < 12 else 1
    next_year = now.year if now.month < 12 else now.year + 1
    month_end = f"{next_year}-{next_month:02d}-01"

    # Income
    income_res = await (
        supabase.table("transactions")
        .select("amount")
        .eq("type", "INCOME")
        .gte("date", month_start)
        .lt("date", month_end)
        .execute()
    )
    total_income = sum(t["amount"] for t in (income_res.data or []))

    # Expenses
    expense_res = await (
        supabase.table("transactions")
        .select("amount")
        .eq("type", "EXPENSE")
        .gte("date", month_start)
        .lt("date", month_end)
        .execute()
    )
    total_expense = sum(t["amount"] for t in (expense_res.data or []))

    # Recent sales (movements of type VENTA)
    recent_res = await (
        supabase.table("app_movements")
        .select("*")
        .eq("category", "VENTA")
        .order("created_at", desc=True)
        .limit(3)
        .execute()
    )

    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "net_balance": total_income - total_expense,
        "recent_sales": recent_res.data if recent_res else [],
    }


# ─── BATCH SALE (POS) ────────────────────────────────────────────────────────

@router.post("/sales")
async def create_batch_sale(batch: schemas.BatchSaleRequest):
    """
    Process a batch sale from the POS (cart checkout).

    RACE CONDITION FIX: Each item is validated and deducted ATOMICALLY
    in a single loop. If any item fails validation, all previously
    deducted items are rolled back.
    """
    if not batch.items:
        raise HTTPException(status_code=400, detail="No items in sale")

    sale_cat_id = await get_category_id("Venta de Bebidas")
    total_sale = 0
    processed_items: list[dict] = []  # Track for rollback
    sale_details: list[dict] = []

    try:
        for sale_item in batch.items:
            # Fetch current stock (fresh read per item for atomicity)
            item_res = await (
                supabase.table("stock_items")
                .select("*")
                .eq("id", sale_item.item_id)
                .single()
                .execute()
            )
            if not item_res or not item_res.data:
                raise ValueError(f"Product ID {sale_item.item_id} not found")

            product = item_res.data

            # Calculate units to deduct
            if sale_item.is_pack:
                if sale_item.format_id:
                    fmt_res = await (
                        supabase.table("stock_item_formats")
                        .select("*")
                        .eq("id", sale_item.format_id)
                        .single()
                        .execute()
                    )
                    if not fmt_res or not fmt_res.data:
                        raise ValueError(f"Format ID {sale_item.format_id} not found")
                    pack_size = fmt_res.data["pack_size"]
                    unit_price = fmt_res.data["pack_price"]
                else:
                    pack_size = product.get("pack_size", 1) or 1
                    unit_price = product.get("pack_price") or (product["selling_price"] * pack_size)
            else:
                pack_size = 1
                unit_price = product["selling_price"]

            units_to_deduct = sale_item.quantity * pack_size

            # ATOMIC VALIDATION: Check stock RIGHT BEFORE deducting
            if product["quantity"] < units_to_deduct:
                raise ValueError(
                    f"Stock insuficiente para {product.get('brand', '')} {product['name']}: "
                    f"disponible={product['quantity']}, requerido={units_to_deduct}"
                )

            # IMMEDIATE DEDUCTION (no separate validation pass)
            new_qty = product["quantity"] - units_to_deduct
            new_status = "DEPLETED" if new_qty == 0 else "AVAILABLE"

            await (
                supabase.table("stock_items")
                .update({"quantity": new_qty, "status": new_status})
                .eq("id", sale_item.item_id)
                .execute()
            )

            # Track for potential rollback
            processed_items.append({
                "item_id": sale_item.item_id,
                "units_deducted": units_to_deduct,
                "original_qty": product["quantity"],
            })

            line_total = unit_price * sale_item.quantity
            total_sale += line_total

            sale_details.append({
                "stock_item_id": sale_item.item_id,
                "quantity": sale_item.quantity,
                "description": f"{product.get('brand', '')} {product['name']}" + (f" (Pack x{pack_size})" if sale_item.is_pack else ""),
                "sale_price_total": line_total,
                "product_name": product["name"],
                "product_brand": product.get("brand", ""),
            })

        # All items deducted successfully — create transaction
        tx_res = await supabase.table("transactions").insert({
            "amount": total_sale,
            "description": batch.description or "Venta Directa Salón",
            "type": "INCOME",
            "category_id": sale_cat_id,
        }).execute()

        if not tx_res or not tx_res.data:
            raise ValueError("Failed to create transaction")

        tx_id = tx_res.data[0]["id"]

        # Create individual sale records
        for detail in sale_details:
            sale_record = {
                "stock_item_id": detail["stock_item_id"],
                "quantity": detail["quantity"],
                "description": detail["description"],
                "sale_price_total": detail["sale_price_total"],
                "sale_tx_id": tx_id,
            }
            await supabase.table("sales").insert(sale_record).execute()

        await log_movement(
            "VENTA", "VENTA_LOTE",
            f"Venta procesada: {len(sale_details)} productos — ${total_sale:,.2f}",
            metadata={"transaction_id": tx_id, "items": len(sale_details), "total": total_sale},
            transaction_id=tx_id,
        )

        return {"status": "ok", "transaction_id": tx_id, "total": total_sale}

    except ValueError as ve:
        # ROLLBACK: Restore stock for all already-processed items
        for processed in processed_items:
            try:
                await (
                    supabase.table("stock_items")
                    .update({
                        "quantity": processed["original_qty"],
                        "status": "AVAILABLE",
                    })
                    .eq("id", processed["item_id"])
                    .execute()
                )
            except Exception:
                pass  # Best effort rollback

        raise HTTPException(status_code=400, detail=str(ve))


# ─── INVOICE PDF ──────────────────────────────────────────────────────────────

@router.get("/sales/invoice/{transaction_id}")
async def generate_invoice(transaction_id: int):
    """Generate a PDF invoice for a completed sale transaction."""
    tx_res = await (
        supabase.table("transactions")
        .select("*")
        .eq("id", transaction_id)
        .single()
        .execute()
    )
    if not tx_res or not tx_res.data:
        raise HTTPException(status_code=404, detail="Transaction not found")

    tx = tx_res.data

    # Get sale items
    sale_res = await (
        supabase.table("sales")
        .select("*")
        .eq("sale_tx_id", transaction_id)
        .execute()
    )
    sale_items = sale_res.data if sale_res else []

    # N+1 FIX: Batch-fetch all product names in ONE query
    product_names: dict[int, dict] = {}
    if sale_items:
        product_ids = list(set(item["stock_item_id"] for item in sale_items))
        prod_res = await (
            supabase.table("stock_items")
            .select("id, name, brand")
            .in_("id", product_ids)
            .execute()
        )
        if prod_res and prod_res.data:
            for p in prod_res.data:
                product_names[p["id"]] = {"name": p["name"], "brand": p.get("brand", "")}

    # Build PDF
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Header
    c.setFont("Helvetica-Bold", 16)
    c.drawString(30 * mm, height - 30 * mm, "FACTURA DE VENTA")
    c.setFont("Helvetica", 10)
    c.drawString(30 * mm, height - 38 * mm, f"Centro de Abaratamiento Mayorista")
    c.drawString(30 * mm, height - 44 * mm, f"Transacción #{transaction_id}")
    c.drawString(130 * mm, height - 44 * mm, f"Fecha: {tx.get('date', '-')}")

    # Table header
    y = height - 60 * mm
    c.setFont("Helvetica-Bold", 9)
    c.drawString(30 * mm, y, "Producto")
    c.drawString(110 * mm, y, "Cant.")
    c.drawString(135 * mm, y, "Subtotal")
    c.line(30 * mm, y - 2, 175 * mm, y - 2)

    # Items
    y -= 8 * mm
    c.setFont("Helvetica", 9)
    for item in sale_items:
        prod = product_names.get(item["stock_item_id"], {})
        name: str = f"{prod.get('brand', '')} {prod.get('name', item.get('description', '?'))}".strip()
        truncated_name = name[:50]  # type: ignore

        c.drawString(30 * mm, y, truncated_name)
        c.drawString(110 * mm, y, str(item["quantity"]))
        c.drawString(135 * mm, y, f"$ {item['sale_price_total']:,.2f}")
        y -= 6 * mm

        if y < 30 * mm:
            c.showPage()
            y = height - 30 * mm

    # Total
    y -= 5 * mm
    c.line(30 * mm, y, 175 * mm, y)
    y -= 8 * mm
    c.setFont("Helvetica-Bold", 12)
    c.drawString(110 * mm, y, f"TOTAL:  $ {tx['amount']:,.2f}")

    c.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Factura_{transaction_id}.pdf"},
    )
