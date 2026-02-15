"""Admin endpoints — seeding and maintenance."""

from fastapi import APIRouter  # type: ignore
from supabase_client import supabase  # type: ignore
from helpers import log_movement  # type: ignore

router = APIRouter()

DEFAULT_CATEGORIES = [
    # Products
    {"name": "Gaseosas", "type": "PRODUCT"},
    {"name": "Cervezas", "type": "PRODUCT"},
    {"name": "Vinos y Espumantes", "type": "PRODUCT"},
    {"name": "Aguas y Jugos", "type": "PRODUCT"},
    {"name": "Destilados", "type": "PRODUCT"},
    {"name": "Comida / Snacks", "type": "PRODUCT"},
    # Income
    {"name": "Venta de Bebidas", "type": "INCOME"},
    {"name": "Otros Ingresos", "type": "INCOME"},
    # Expense
    {"name": "Compra de Mercadería", "type": "EXPENSE"},
    {"name": "Gastos Fijos", "type": "EXPENSE"},
]


@router.get("/seed-categories")
async def seed_categories():
    """Upsert default categories into the database."""
    res = await supabase.table("categories").upsert(
        DEFAULT_CATEGORIES, on_conflict="name"
    ).execute()

    await log_movement("SISTEMA", "CONFIG", "Categorías inicializadas/actualizadas")
    return {"status": "ok", "count": len(res.data) if res.data else 0}


@router.api_route("/reset-db", methods=["GET", "POST"])
async def reset_db():
    """
    Placeholder — database reset should be done via Supabase SQL Editor.
    See AI_CONTEXT.md section 14 for the TRUNCATE commands.
    """
    return {
        "status": "manual_action_required",
        "message": "Use Supabase SQL Editor to run TRUNCATE commands. See AI_CONTEXT.md.",
    }
