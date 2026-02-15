"""
Stock management endpoints.

Handles CRUD for stock items, batch additions, format management,
brand fetching, and bulk price updates.
"""

from fastapi import APIRouter, HTTPException  # type: ignore
from supabase_client import supabase  # type: ignore
from helpers import get_category_id, log_movement  # type: ignore
import schemas  # type: ignore

router = APIRouter()


# ─── READ ─────────────────────────────────────────────────────────────────────

@router.get("/stock")
async def read_stock():
    """Get all stock items with their formats embedded."""
    res = await supabase.table("stock_items").select("*").order("name").execute()
    items = res.data if res else []

    if not items:
        return items

    # Batch-fetch all formats in ONE query instead of N+1
    item_ids = [item["id"] for item in items]
    fmt_res = await supabase.table("stock_item_formats").select("*").in_("stock_item_id", item_ids).execute()
    all_formats = fmt_res.data if fmt_res else []

    # Group formats by stock_item_id
    formats_by_item: dict[int, list] = {}
    for fmt in all_formats:
        sid = fmt["stock_item_id"]
        formats_by_item.setdefault(sid, []).append(fmt)

    # Attach formats to each item
    for item in items:
        item["formats"] = formats_by_item.get(item["id"], [])

    return items


@router.get("/stock/brands")
async def get_brands():
    """Get distinct brand names from stock items."""
    res = await supabase.table("stock_items").select("brand").execute()
    if not res or not res.data:
        return []
    brands = sorted(set(item["brand"] for item in res.data if item.get("brand")))
    return brands


# ─── CREATE ───────────────────────────────────────────────────────────────────

@router.post("/stock")
async def create_stock_item(item: schemas.StockItemCreate):
    """Create a single stock item."""
    data = item.model_dump()

    # Calculate unit cost
    qty = data.get("initial_quantity", 1) or 1
    pack_size = data.get("pack_size", 1) or 1
    cost = data.get("cost_amount", 0) or 0
    data["unit_cost"] = cost / (qty * pack_size) if qty * pack_size > 0 else 0
    data["quantity"] = qty * pack_size
    data["status"] = "AVAILABLE"

    res = await supabase.table("stock_items").insert(data).execute()
    if not res:
        raise HTTPException(status_code=400, detail=f"Insert failed: {res.error}")

    created = res.data[0]
    await log_movement(
        "STOCK", "ALTA",
        f"Producto creado: {created['name']}",
        metadata={"item_id": created["id"], "quantity": created["quantity"]},
        stock_item_id=created["id"],
    )
    return created


@router.post("/stock/batch")
async def create_stock_batch(batch: schemas.BatchStockRequest):
    """
    Create or replenish multiple stock items in a single operation.

    Each item can be new (no item_id) or a replenishment (with item_id).
    """
    results = []
    purchase_cat_id = await get_category_id("Compra de Mercadería")

    for item_data in batch.items:
        d = item_data.model_dump()
        pack_size = d.get("pack_size", 1) or 1
        units = (d.get("quantity", 1) or 1) * pack_size
        cost = d.get("cost_amount", 0) or 0
        unit_cost = cost / units if units > 0 else 0

        if d.get("item_id"):
            # Replenishment — update existing item
            existing_res = await supabase.table("stock_items").select("*").eq("id", d["item_id"]).single().execute()
            if not existing_res or not existing_res.data:
                results.append({"error": f"Item {d['item_id']} not found"})
                continue

            existing = existing_res.data
            new_qty = existing["quantity"] + units

            update_data = {"quantity": new_qty, "unit_cost": unit_cost, "status": "AVAILABLE"}
            if d.get("selling_price"):
                update_data["selling_price"] = d["selling_price"]
            if d.get("pack_price") is not None:
                update_data["pack_price"] = d["pack_price"]

            await supabase.table("stock_items").update(update_data).eq("id", d["item_id"]).execute()

            # Log expense transaction
            if cost > 0 and purchase_cat_id:
                await supabase.table("transactions").insert({
                    "amount": cost,
                    "description": f"Reposición: {existing['name']}",
                    "type": "EXPENSE",
                    "category_id": purchase_cat_id,
                }).execute()

            await log_movement(
                "STOCK", "REPOSICION",
                f"Reposición: {existing['name']} (+{units} unidades)",
                metadata={"item_id": d["item_id"], "added": units, "new_total": new_qty},
                stock_item_id=d["item_id"],
            )
            results.append({"id": d["item_id"], "status": "replenished", "new_quantity": new_qty})
        else:
            # New item
            new_item = {
                "name": d["name"],
                "brand": d.get("brand", ""),
                "barcode": d.get("barcode"),
                "is_pack": d.get("is_pack", False),
                "pack_size": pack_size,
                "cost_amount": cost,
                "initial_quantity": d.get("quantity", 1),
                "quantity": units,
                "unit_cost": unit_cost,
                "selling_price": d.get("selling_price", 0),
                "pack_price": d.get("pack_price"),
                "category_id": d.get("category_id"),
                "status": "AVAILABLE",
            }
            insert_res = await supabase.table("stock_items").insert(new_item).execute()
            if insert_res and insert_res.data:
                created = insert_res.data[0]

                # Log expense transaction
                if cost > 0 and purchase_cat_id:
                    await supabase.table("transactions").insert({
                        "amount": cost,
                        "description": f"Compra: {created['name']}",
                        "type": "EXPENSE",
                        "category_id": purchase_cat_id,
                    }).execute()

                await log_movement(
                    "STOCK", "ALTA",
                    f"Nuevo producto: {created['name']}",
                    metadata={"item_id": created["id"], "quantity": units},
                    stock_item_id=created["id"],
                )
                results.append({"id": created["id"], "status": "created"})
            else:
                results.append({"error": f"Failed to insert {d.get('name', '?')}"})

    return results


# ─── UPDATE ───────────────────────────────────────────────────────────────────

@router.put("/stock/{item_id}")
async def update_stock_item(item_id: int, item: schemas.StockItemUpdate):
    """Update a stock item by ID."""
    # Verify exists
    check = await supabase.table("stock_items").select("id").eq("id", item_id).single().execute()
    if not check or not check.data:
        raise HTTPException(status_code=404, detail="Item not found")

    data = item.model_dump(exclude_none=True)

    # Recalculate unit_cost if cost or quantity changed
    if "cost_amount" in data or "initial_quantity" in data:
        cost = data.get("cost_amount", 0) or 0
        qty = data.get("initial_quantity", 1) or 1
        pack_size = data.get("pack_size", 1) or 1
        data["unit_cost"] = cost / (qty * pack_size) if qty * pack_size > 0 else 0
        data["quantity"] = qty * pack_size

    res = await supabase.table("stock_items").update(data).eq("id", item_id).execute()
    if not res:
        raise HTTPException(status_code=400, detail=f"Update failed: {res.error}")

    await log_movement(
        "STOCK", "EDICION",
        f"Producto actualizado (ID: {item_id})",
        metadata={"item_id": item_id, "changes": list(data.keys())},
        stock_item_id=item_id,
    )
    return res.data[0] if res.data else {}


# ─── DELETE ───────────────────────────────────────────────────────────────────

@router.delete("/stock/{item_id}")
async def delete_stock_item(item_id: int):
    """Delete a stock item and its formats."""
    check = await supabase.table("stock_items").select("id, name").eq("id", item_id).single().execute()
    if not check or not check.data:
        raise HTTPException(status_code=404, detail="Item not found")

    name = check.data.get("name", "?")

    # Delete associated formats first
    await supabase.table("stock_item_formats").delete().eq("stock_item_id", item_id).execute()
    # Delete item
    await supabase.table("stock_items").delete().eq("id", item_id).execute()

    await log_movement(
        "STOCK", "BAJA",
        f"Producto eliminado: {name}",
        metadata={"item_id": item_id},
        stock_item_id=item_id,
    )
    return {"status": "deleted", "id": item_id}


# ─── SELL (Quick sell from stock page) ────────────────────────────────────────

@router.put("/stock/{item_id}/sell")
async def sell_stock_item(item_id: int, sale: schemas.SellItem):
    """Quick sell: deduct stock and create an income transaction."""
    item_res = await supabase.table("stock_items").select("*").eq("id", item_id).single().execute()
    if not item_res or not item_res.data:
        raise HTTPException(status_code=404, detail="Item not found")

    item = item_res.data
    if item["quantity"] < sale.quantity:
        raise HTTPException(status_code=400, detail="Stock insuficiente")

    new_qty = item["quantity"] - sale.quantity
    new_status = "DEPLETED" if new_qty == 0 else "AVAILABLE"

    await supabase.table("stock_items").update({
        "quantity": new_qty,
        "status": new_status,
    }).eq("id", item_id).execute()

    # Create income transaction
    total = sale.quantity * (sale.price or item["selling_price"] or 0)
    sale_cat_id = await get_category_id("Venta de Bebidas")

    tx_res = await supabase.table("transactions").insert({
        "amount": total,
        "description": f"Venta: {item['name']} x{sale.quantity}",
        "type": "INCOME",
        "category_id": sale_cat_id,
    }).execute()

    await log_movement(
        "VENTA", "VENTA",
        f"Venta rápida: {item['name']} x{sale.quantity}",
        metadata={"item_id": item_id, "quantity": sale.quantity, "total": total},
        stock_item_id=item_id,
        transaction_id=tx_res.data[0]["id"] if tx_res and tx_res.data else None,
    )

    return {"status": "sold", "remaining": new_qty}


# ─── FORMATS ──────────────────────────────────────────────────────────────────

@router.post("/stock/formats")
async def create_format(fmt: schemas.FormatCreate):
    """Add a pack format to a stock item."""
    res = await supabase.table("stock_item_formats").insert(fmt.model_dump()).execute()
    if not res:
        raise HTTPException(status_code=400, detail=f"Failed: {res.error}")
    return res.data[0] if res.data else {}


@router.delete("/stock/formats/{format_id}")
async def delete_format(format_id: int):
    """Delete a pack format."""
    await supabase.table("stock_item_formats").delete().eq("id", format_id).execute()
    return {"status": "deleted", "id": format_id}


# ─── BULK UPDATE ──────────────────────────────────────────────────────────────

@router.post("/stock/bulk-update")
async def bulk_update_prices(request: schemas.BulkUpdateRequest):
    """
    Bulk update prices and costs by percentage for filtered items.
    Applies to both stock_items and their associated stock_item_formats.
    """
    query = supabase.table("stock_items").select("*")

    if request.category_id:
        query = query.eq("category_id", request.category_id)
    if request.brand and request.brand.strip():
        query = query.ilike("brand", f"%{request.brand}%")

    items_res = await query.execute()
    items = items_res.data if items_res else []

    if not items:
        raise HTTPException(status_code=404, detail="No items match the filter")

    multiplier = 1 + (request.percentage / 100)
    updated_count = 0

    # Batch-fetch all formats for these items (N+1 fix)
    item_ids = [item["id"] for item in items]
    fmt_res = await supabase.table("stock_item_formats").select("*").in_("stock_item_id", item_ids).execute()
    all_formats = fmt_res.data if fmt_res else []

    formats_by_item: dict[int, list] = {}
    for fmt in all_formats:
        formats_by_item.setdefault(fmt["stock_item_id"], []).append(fmt)

    for item in items:
        new_selling = round((item.get("selling_price") or 0) * multiplier, 2)
        new_cost = round((item.get("unit_cost") or 0) * multiplier, 2)
        new_pack_price = round((item.get("pack_price") or 0) * multiplier, 2) if item.get("pack_price") else None

        update_data = {
            "selling_price": new_selling,
            "unit_cost": new_cost,
        }
        if new_pack_price is not None:
            update_data["pack_price"] = new_pack_price

        await supabase.table("stock_items").update(update_data).eq("id", item["id"]).execute()
        updated_count += 1

        # Update formats for this item
        for fmt in formats_by_item.get(item["id"], []):  # type: ignore
            new_fmt_price = round((fmt.get("pack_price") or 0) * multiplier, 2)
            await supabase.table("stock_item_formats").update(
                {"pack_price": new_fmt_price}
            ).eq("id", fmt["id"]).execute()

    await log_movement(
        "STOCK", "ACTUALIZACION_MASIVA",
        f"Actualización masiva de precios: {request.percentage:+.1f}% a {updated_count} productos",
        metadata={
            "percentage": request.percentage,
            "category_id": request.category_id,
            "brand": request.brand,
            "items_updated": updated_count,
        },
    )

    return {"status": "ok", "updated": updated_count}
