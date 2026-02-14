"""Stock management endpoints (inventory CRUD, batch, formats)."""
from typing import List
from datetime import datetime
import logging

from fastapi import APIRouter, HTTPException

from supabase_client import supabase
from helpers import log_movement
import schemas

logger = logging.getLogger(__name__)

router = APIRouter(tags=["stock"])


@router.get("/stock", response_model=List[schemas.StockItem])
def read_stock():
    res = (
        supabase.table("stock_items")
        .select("*, formats:stock_item_formats(*)")
        .order("name")
        .execute()
    )
    return res.data or []


@router.get("/stock/barcode/{code}")
def get_stock_by_barcode(code: str):
    res = (
        supabase.table("stock_items")
        .select("*, formats:stock_item_formats(*)")
        .eq("barcode", code)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Producto no encontrado con ese código de barras")
    return res.data[0]


@router.post("/stock", response_model=schemas.StockItem)
def create_stock_item(item: schemas.StockItemCreate):
    cat_id = None
    try:
        cat_res = (
            supabase.table("categories")
            .select("id")
            .eq("name", "Compra de Mercadería")
            .single()
            .execute()
        )
        if cat_res.data:
            cat_id = cat_res.data["id"]
    except Exception as e:
        logger.warning(f"Could not fetch expense category: {e}")

    tx_data = {
        "date": datetime.now().isoformat(),
        "amount": item.cost_amount,
        "description": f"Compra Stock: {item.name}",
        "type": "EXPENSE",
        "category_id": cat_id,
    }
    tx_res = supabase.table("transactions").insert(tx_data).execute()
    purchase_tx_id = tx_res.data[0]["id"] if tx_res.data else None

    stock_data = item.model_dump()
    stock_data["purchase_tx_id"] = purchase_tx_id
    stock_data["purchase_date"] = datetime.now().isoformat()
    stock_data["quantity"] = stock_data["initial_quantity"]
    stock_data["status"] = "AVAILABLE"
    stock_data.pop("unit_cost", None)
    if not stock_data.get("category_id") or stock_data.get("category_id") == 0:
        stock_data["category_id"] = None

    stock_res = supabase.table("stock_items").insert(stock_data).execute()
    if not stock_res.data:
        raise HTTPException(status_code=400, detail="Failed to create stock item")

    log_movement(
        "STOCK",
        "ALTA",
        f"Ingreso: {item.name}",
        {"id": stock_res.data[0]["id"]},
        product_id=stock_res.data[0]["id"],
        tx_id=purchase_tx_id,
    )
    return stock_res.data[0]


@router.post("/stock/batch")
def create_batch_stock(batch: schemas.BatchStockRequest):
    cat_id = None
    try:
        cat_res = (
            supabase.table("categories")
            .select("id")
            .eq("name", "Compra de Mercadería")
            .single()
            .execute()
        )
        if cat_res.data:
            cat_id = cat_res.data["id"]
    except Exception as e:
        logger.warning(f"Could not fetch expense category: {e}")

    processed = []
    for item in batch.items:
        if item.item_id:
            # --- REPLENISHMENT ---
            res = (
                supabase.table("stock_items")
                .select("*")
                .eq("id", item.item_id)
                .single()
                .execute()
            )
            if not res.data:
                continue

            existing = res.data
            add_qty = item.quantity * (item.pack_size if item.is_pack else 1)
            new_total_qty = existing["quantity"] + add_qty

            # Weighted Average Cost
            current_unit_cost = existing.get("unit_cost") or 0
            total_inventory_value = (
                existing["quantity"] * current_unit_cost
            ) + item.cost_amount
            new_unit_cost = (
                total_inventory_value / new_total_qty if new_total_qty > 0 else 0
            )

            update_data = {"quantity": new_total_qty, "status": "AVAILABLE"}
            if item.selling_price:
                update_data["selling_price"] = item.selling_price

            # Handle Pack Prices and Formats during replenishment
            if item.is_pack:
                if item.pack_size == existing.get("pack_size"):
                    if item.pack_price:
                        update_data["pack_price"] = item.pack_price
                else:
                    fmt_res = (
                        supabase.table("stock_item_formats")
                        .select("*")
                        .eq("stock_item_id", item.item_id)
                        .eq("pack_size", item.pack_size)
                        .execute()
                    )

                    fmt_payload = {
                        "stock_item_id": item.item_id,
                        "pack_size": item.pack_size,
                        "pack_price": item.pack_price
                        or (
                            item.selling_price * item.pack_size
                            if item.selling_price
                            else 0
                        ),
                        "label": f"Pack x{item.pack_size}",
                    }

                    if fmt_res.data:
                        supabase.table("stock_item_formats").update(
                            fmt_payload
                        ).eq("id", fmt_res.data[0]["id"]).execute()
                    else:
                        supabase.table("stock_item_formats").insert(
                            fmt_payload
                        ).execute()

            supabase.table("stock_items").update(update_data).eq(
                "id", item.item_id
            ).execute()

            # Create Expense Transaction
            tx_data = {
                "date": datetime.now().isoformat(),
                "amount": item.cost_amount,
                "description": f"Reposición: {existing['name']}"
                + (f" [{item.brand}]" if item.brand else ""),
                "type": "EXPENSE",
                "category_id": cat_id,
            }
            supabase.table("transactions").insert(tx_data).execute()

            log_movement(
                "STOCK",
                "REPOSICION",
                f"Reposición: {existing['name']} (+{add_qty} unidades)",
                {"product_id": item.item_id, "added": add_qty},
                product_id=item.item_id,
            )
            processed.append(
                {"id": item.item_id, "name": existing["name"], "status": "replenished"}
            )

        else:
            # --- NEW PRODUCT ---
            tx_data = {
                "date": datetime.now().isoformat(),
                "amount": item.cost_amount,
                "description": f"Compra Stock: {item.name}",
                "type": "EXPENSE",
                "category_id": cat_id,
            }
            tx_res = supabase.table("transactions").insert(tx_data).execute()
            purchase_tx_id = tx_res.data[0]["id"] if tx_res.data else None

            stock_data = item.model_dump()
            stock_data.pop("item_id", None)
            stock_data["purchase_tx_id"] = purchase_tx_id
            stock_data["purchase_date"] = datetime.now().isoformat()
            total_initial = item.quantity * (item.pack_size if item.is_pack else 1)
            stock_data["initial_quantity"] = total_initial
            stock_data["quantity"] = total_initial
            stock_data["status"] = "AVAILABLE"

            formats = stock_data.pop("formats", [])
            stock_res = supabase.table("stock_items").insert(stock_data).execute()
            if stock_res.data:
                new_item_id = stock_res.data[0]["id"]
                for fmt in formats:
                    fmt_data = (
                        fmt.model_dump() if hasattr(fmt, "model_dump") else fmt
                    )
                    fmt_data["stock_item_id"] = new_item_id
                    supabase.table("stock_item_formats").insert(fmt_data).execute()

                log_movement(
                    "STOCK",
                    "ALTA",
                    f"Ingreso (Batch): {item.name} ({total_initial} unidades)",
                    {"product_id": new_item_id, "qty": total_initial},
                    product_id=new_item_id,
                    tx_id=purchase_tx_id,
                )
                processed.append(
                    {"id": new_item_id, "name": item.name, "status": "created"}
                )

    return {"status": "success", "processed": processed}


@router.put("/stock/{item_id}", response_model=schemas.StockItem)
def update_stock_item(item_id: int, item: schemas.StockItemCreate):
    data = item.model_dump()
    data.pop("unit_cost", None)
    if not data.get("category_id") or data.get("category_id") == 0:
        data["category_id"] = None

    res = supabase.table("stock_items").update(data).eq("id", item_id).execute()
    return res.data[0]


@router.delete("/stock/{item_id}")
def delete_stock_item(item_id: int):
    check = supabase.table("stock_items").select("id").eq("id", item_id).execute()
    if not check.data:
        raise HTTPException(
            status_code=404, detail=f"Producto {item_id} no encontrado"
        )
    supabase.table("stock_items").delete().eq("id", item_id).execute()
    log_movement(
        "STOCK", "BAJA", f"Producto eliminado (ID: {item_id})", product_id=item_id
    )
    return {"status": "deleted", "id": item_id}


# --- STOCK FORMATS ---
@router.post("/stock/formats", response_model=schemas.StockItemFormat)
def create_stock_format(format: schemas.StockItemFormatCreate):
    res = (
        supabase.table("stock_item_formats").insert(format.model_dump()).execute()
    )
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to create format")
    return res.data[0]


@router.delete("/stock/formats/{format_id}")
def delete_stock_format(format_id: int):
    supabase.table("stock_item_formats").delete().eq("id", format_id).execute()
    return {"status": "deleted"}

@router.post("/stock/bulk-update")
def bulk_update_prices(request: schemas.BulkUpdateRequest):
    """
    Update prices (cost/selling/pack) for multiple items based on filters.
    percentage: positive for increase, negative for discount.
    """
    try:
        # Build query
        query = supabase.table("stock_items").select("*")
        
        if request.category_id:
            query = query.eq("category_id", request.category_id)
        if request.brand:
            query = query.ilike("brand", f"%{request.brand}%")
            
        items = query.execute().data
        
        if not items:
            return {"status": "no_items", "count": 0, "message": "No se encontraron productos con los filtros seleccionados."}
        
        updated_count = 0
        factor = 1 + (request.percentage / 100.0)
        
        for item in items:
            updates = {}
            
            # Update Unit Cost
            if request.target_field in ["cost", "both"]:
                 updates["unit_cost"] = (item.get("unit_cost") or 0) * factor
                 # Usually cost_amount tracks total historical cost, but for future ref we might update unit_cost
            
            # Update Selling Price
            if request.target_field in ["price", "both"]:
                if item.get("selling_price"):
                    updates["selling_price"] = item["selling_price"] * factor
                
                if item.get("pack_price"):
                    updates["pack_price"] = item["pack_price"] * factor
            
            if updates:
                supabase.table("stock_items").update(updates).eq("id", item["id"]).execute()
                updated_count += 1
                
                # Update formats if they exist
                if request.target_field in ["price", "both"]:
                    f_res = supabase.table("stock_item_formats").select("*").eq("stock_item_id", item["id"]).execute()
                    formats = f_res.data
                    if formats:
                        for fmt in formats:
                            new_p = (fmt.get("pack_price") or 0) * factor
                            supabase.table("stock_item_formats").update({"pack_price": new_p}).eq("id", fmt["id"]).execute()

        # Log movement
        log_movement(
            "STOCK",
            "UPDATE_PRICE",
            f"Actualización masiva: {request.percentage}% en {request.target_field} ({updated_count} items). Filtros: Cat={request.category_id}, Brand={request.brand}",
            {"count": updated_count, "percentage": request.percentage, "target": request.target_field}
        )

        return {"status": "success", "count": updated_count, "message": f"Se actualizaron {updated_count} productos correctamente."}

    except Exception as e:
        logger.error(f"Error en bulk update: {e}")
        raise HTTPException(status_code=500, detail=str(e))
