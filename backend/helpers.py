"""
Helper utilities — logging movements and upload config.
"""

import os
import shutil
from datetime import datetime
from typing import Any
from fastapi import UploadFile, HTTPException  # type: ignore
from supabase_client import supabase  # type: ignore

# Upload directory (Vercel uses /tmp, local uses ./uploads)
IS_VERCEL = os.getenv("VERCEL", "")
UPLOAD_DIR = "/tmp/uploads" if IS_VERCEL else os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ─── In-memory category cache ────────────────────────────────────────────────

_category_cache: dict[str, int] = {}


async def get_category_id(name: str) -> int | None:
    """
    Get category ID by name, with in-memory caching.
    Returns None if category not found.
    """
    if name in _category_cache:
        return _category_cache[name]

    res = await supabase.table("categories").select("id").eq("name", name).single().execute()
    if res and res.data:
        _category_cache[name] = res.data["id"]
        return res.data["id"]
    return None


# ─── Movement Logging ────────────────────────────────────────────────────────

async def log_movement(
    category: str,
    action: str,
    description: str,
    metadata: dict | None = None,
    stock_item_id: int | None = None,
    transaction_id: int | None = None,
    sale_id: int | None = None,
):
    """
    Log an application movement to the app_movements table.

    Categories: STOCK, VENTA, FINANZAS, SISTEMA
    Actions: ALTA, VENTA, VENTA_LOTE, REPORTE, GASTO, CONFIG, etc.
    """
    try:
        payload: dict[str, Any] = {
            "category": category,
            "action": action,
            "description": description,
            "metadata": metadata or {},
        }
        if stock_item_id:
            payload["stock_item_id"] = stock_item_id
        if transaction_id:
            payload["transaction_id"] = transaction_id
        if sale_id:
            payload["sale_id"] = sale_id

        await supabase.table("app_movements").insert(payload).execute()
    except Exception as e:
        # Don't let logging failures break the main operation
        print(f"[log_movement] Warning: {e}")
