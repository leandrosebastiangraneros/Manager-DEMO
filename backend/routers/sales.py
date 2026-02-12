"""Sales, transactions, movements, and dashboard stats endpoints."""
from typing import List
from datetime import datetime
import logging

from fastapi import APIRouter, HTTPException

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

    for s_item in batch.items:
        res = (
            supabase.table("stock_items")
            .select("*")
            .eq("id", s_item.item_id)
            .single()
            .execute()
        )
        product = res.data
        if not product:
            raise HTTPException(
                status_code=404, detail=f"Producto {s_item.item_id} no encontrado"
            )

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

    return {"status": "success", "total": total_sale_amount}
