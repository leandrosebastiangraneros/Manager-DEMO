"""Sales, transactions, movements, and dashboard stats endpoints."""
from typing import List
from datetime import datetime
import logging
import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from supabase_client import supabase
from helpers import log_movement
import schemas

logger = logging.getLogger(__name__)

router = APIRouter(tags=["sales"])


# --- TRANSACTIONS ---
@router.post("/transactions", response_model=schemas.Transaction)
def create_transaction(transaction: schemas.TransactionCreate):
    data = transaction.model_dump()
    data["date"] = datetime.now().isoformat()
    res = supabase.table("transactions").insert(data).execute()
    return res.data[0]


@router.get("/transactions", response_model=List[schemas.Transaction])
def read_transactions(skip: int = 0, limit: int = 100):
    res = (
        supabase.table("transactions")
        .select("*")
        .order("date", desc=True)
        .range(skip, skip + limit - 1)
        .execute()
    )
    return res.data or []


@router.get("/movements", response_model=List[schemas.AppMovement])
def read_movements(limit: int = 100):
    res = (
        supabase.table("app_movements")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []


@router.get("/dashboard-stats")
def get_dashboard_stats():
    now = datetime.now()
    first_day = datetime(now.year, now.month, 1).isoformat()

    res = (
        supabase.table("transactions")
        .select("amount, type, date")
        .gte("date", first_day)
        .execute()
    )
    transactions = res.data or []

    income = sum(t["amount"] for t in transactions if t["type"] == "INCOME")
    expenses = sum(t["amount"] for t in transactions if t["type"] == "EXPENSE")

    res_movements = (
        supabase.table("app_movements")
        .select("*")
        .eq("category", "VENTA")
        .order("created_at", desc=True)
        .limit(3)
        .execute()
    )
    recent_sales = res_movements.data or []

    return {
        "income": income,
        "expenses": expenses,
        "balance": income - expenses,
        "month": now.strftime("%B"),
        "recent_sales": recent_sales,
        "chart_data": [],
    }


# --- BATCH SALES ---
@router.post("/sales")
def create_batch_sale(batch: schemas.BatchSaleRequest):
    cat_id = None
    try:
        cat_res = (
            supabase.table("categories")
            .select("id")
            .eq("name", "Venta de Bebidas")
            .single()
            .execute()
        )
        if cat_res.data:
            cat_id = cat_res.data["id"]
    except Exception as e:
        logger.warning(f"Could not fetch sales category: {e}")

    total_sale_amount = 0.0
    processed_items = []


    # Validate stock availability for all items first
    for s_item in batch.items:
        res = supabase.table("stock_items").select("quantity, name, pack_size, selling_price, pack_price").eq("id", s_item.item_id).single().execute()
        product = res.data
        if not product:
            raise HTTPException(status_code=404, detail=f"Producto {s_item.item_id} no encontrado")
        
        # Calculate deduction
        current_stock = product["quantity"]
        p_size = 1
        if s_item.is_pack:
            if s_item.format_id:
                f_res = supabase.table("stock_item_formats").select("pack_size").eq("id", s_item.format_id).single().execute()
                if f_res.data:
                    p_size = f_res.data["pack_size"]
            else:
                p_size = product.get("pack_size") or 1
        
        deduct_qty = s_item.quantity * p_size
        
        if deduct_qty > current_stock:
             raise HTTPException(
                status_code=400, 
                detail=f"Stock insuficiente para {product['name']}. Solicitado: {deduct_qty} unid. (en packs/unid), Disponible: {current_stock}"
            )

    # Proceed with processing
    for s_item in batch.items:
        res = (
            supabase.table("stock_items")
            .select("*")
            .eq("id", s_item.item_id)
            .single()
            .execute()
        )
        product = res.data
        
        # Recalculate values for processing (formatting params etc)
        if s_item.is_pack:
            format_data = None
            if s_item.format_id:
                f_res = (
                    supabase.table("stock_item_formats")
                    .select("*")
                    .eq("id", s_item.format_id)
                    .single()
                    .execute()
                )
                format_data = f_res.data
            
            if format_data:
                price = format_data["pack_price"]
                p_size = format_data["pack_size"]
            else:
                price = product.get("pack_price") or (
                    (product.get("selling_price") or 0)
                    * (product.get("pack_size") or 1)
                )
                p_size = product.get("pack_size") or 1

            deduct_qty = s_item.quantity * p_size
        else:
            price = product.get("selling_price") or 0
            deduct_qty = s_item.quantity

        item_total = price * s_item.quantity
        total_sale_amount += item_total
        processed_items.append(
            {
                "product": product,
                "quantity": s_item.quantity,
                "deduct_qty": deduct_qty,
                "total": item_total,
                "is_pack": s_item.is_pack,
            }
        )

    # Create Income Transaction
    tx_data = {
        "date": datetime.now().isoformat(),
        "amount": total_sale_amount,
        "description": f"Venta: {batch.description}",
        "type": "INCOME",
        "category_id": cat_id,
    }
    tx_res = supabase.table("transactions").insert(tx_data).execute()
    main_tx_id = tx_res.data[0]["id"] if tx_res.data else None

    for p in processed_items:
        sale_data = {
            "stock_item_id": p["product"]["id"],
            "quantity": p["quantity"],
            "description": f"{batch.description} ({'PACK' if p.get('is_pack') else 'UNID'})",
            "sale_price_total": p["total"],
            "sale_tx_id": main_tx_id,
        }
        supabase.table("sales").insert(sale_data).execute()

        new_qty = p["product"]["quantity"] - p.get("deduct_qty", p["quantity"])
        if new_qty < 0:
            logger.warning(
                f"Stock negativo detectado para producto {p['product']['id']}: {new_qty}"
            )
            new_qty = 0
        supabase.table("stock_items").update(
            {
                "quantity": new_qty,
                "status": "DEPLETED" if new_qty <= 0 else "AVAILABLE",
            }
        ).eq("id", p["product"]["id"]).execute()

    log_movement(
        "VENTA",
        "VENTA_LOTE",
        f"Venta realizada: {batch.description} - Total: ${total_sale_amount:,.2f}",
        {"total": total_sale_amount, "items_count": len(batch.items)},
        tx_id=main_tx_id,
    )

    return {"status": "success", "total": total_sale_amount, "transaction_id": main_tx_id}


# --- SALES INVOICE PDF ---
@router.get("/sales/invoice/{tx_id}")
def generate_sale_invoice(tx_id: int):
    """Generate a PDF invoice for a completed sale."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        SimpleDocTemplate,
        Table,
        TableStyle,
        Paragraph,
        Spacer,
        Image,
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_RIGHT

    # Fetch the transaction
    tx_res = (
        supabase.table("transactions")
        .select("*")
        .eq("id", tx_id)
        .single()
        .execute()
    )
    tx = tx_res.data
    if not tx:
        raise HTTPException(status_code=404, detail="Transacción no encontrada")

    # Fetch sale items linked to this transaction
    sales_res = (
        supabase.table("sales")
        .select("*")
        .eq("sale_tx_id", tx_id)
        .execute()
    )
    sale_items = sales_res.data or []

    # Fetch product names for each sale item
    enriched_items = []
    for item in sale_items:
        prod_res = (
            supabase.table("stock_items")
            .select("name, brand")
            .eq("id", item["stock_item_id"])
            .single()
            .execute()
        )
        prod = prod_res.data or {}
        product_name = f"{prod.get('brand', '')} {prod.get('name', 'Producto')}".strip()
        desc = item.get("description", "")
        item_type = "PACK" if "PACK" in desc.upper() else "UNID"
        unit_price = (
            item["sale_price_total"] / item["quantity"]
            if item["quantity"] > 0
            else 0
        )
        enriched_items.append(
            {
                "name": product_name,
                "quantity": item["quantity"],
                "type": item_type,
                "unit_price": unit_price,
                "subtotal": item["sale_price_total"],
            }
        )

    # Build PDF
    filename = f"Factura_{tx_id}.pdf"
    filepath = os.path.join("/tmp", filename)
    doc = SimpleDocTemplate(filepath, pagesize=A4,
                            topMargin=30 * mm, bottomMargin=20 * mm,
                            leftMargin=20 * mm, rightMargin=20 * mm)
    elements = []
    styles = getSampleStyleSheet()

    style_center = ParagraphStyle("Center", parent=styles["Normal"], alignment=TA_CENTER)
    style_right = ParagraphStyle("Right", parent=styles["Normal"], alignment=TA_RIGHT)

    # Header — Logo + Company Name
    logo_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "logo.png")
    if os.path.exists(logo_path):
        logo = Image(logo_path, width=35 * mm, height=35 * mm)
        logo.hAlign = "CENTER"
        elements.append(logo)
        elements.append(Spacer(1, 5))

    elements.append(Paragraph(
        "<b>CENTRO DE ABARATAMIENTO MAYORISTA</b>",
        ParagraphStyle("CompanyName", parent=styles["Title"], fontSize=14, alignment=TA_CENTER),
    ))
    elements.append(Paragraph(
        "Mercado Central Ezeiza",
        ParagraphStyle("CompanySub", parent=styles["Normal"], fontSize=9,
                       alignment=TA_CENTER, textColor=colors.HexColor("#555555")),
    ))
    elements.append(Spacer(1, 5))
    elements.append(Paragraph("Factura de Venta", style_center))
    elements.append(Spacer(1, 15))

    # Transaction info
    tx_date = tx.get("date", "")[:19].replace("T", " ")
    elements.append(Paragraph(f"<b>N° Transacción:</b> {tx_id}", styles["Normal"]))
    elements.append(Paragraph(f"<b>Fecha:</b> {tx_date}", styles["Normal"]))
    elements.append(Paragraph(f"<b>Descripción:</b> {tx.get('description', '')}", styles["Normal"]))
    elements.append(Spacer(1, 20))

    # Items table
    table_data = [["Producto", "Cant.", "Tipo", "P. Unit.", "Subtotal"]]
    for ei in enriched_items:
        table_data.append(
            [
                ei["name"][:35],
                str(int(ei["quantity"]) if ei["quantity"] == int(ei["quantity"]) else ei["quantity"]),
                ei["type"],
                f"${ei['unit_price']:,.2f}",
                f"${ei['subtotal']:,.2f}",
            ]
        )

    t = Table(table_data, colWidths=[180, 50, 50, 80, 80])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2E7D32")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                ("ALIGN", (3, 1), (-1, -1), "RIGHT"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f7f0")]),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements.append(t)
    elements.append(Spacer(1, 20))

    # Total
    total = tx.get("amount", 0)
    elements.append(
        Paragraph(
            f"<b>TOTAL: ${total:,.2f}</b>",
            ParagraphStyle("TotalStyle", parent=styles["Heading2"], alignment=TA_RIGHT),
        )
    )
    elements.append(Spacer(1, 40))

    # Footer
    elements.append(
        Paragraph(
            "Documento no fiscal — Centro de Abaratamiento Mayorista · Mercado Central Ezeiza",
            ParagraphStyle("Footer", parent=styles["Normal"], alignment=TA_CENTER,
                           fontSize=7, textColor=colors.grey),
        )
    )

    doc.build(elements)

    return FileResponse(filepath, filename=filename, media_type="application/pdf")
