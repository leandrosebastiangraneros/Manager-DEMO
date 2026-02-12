"""Admin endpoints (seed, reset)."""
from fastapi import APIRouter

from supabase_client import supabase
from helpers import log_movement

router = APIRouter(tags=["admin"])


@router.get("/seed-categories")
def seed_categories():
    categories = [
        {"name": "Gaseosas", "type": "PRODUCT"},
        {"name": "Cervezas", "type": "PRODUCT"},
        {"name": "Vinos y Espumantes", "type": "PRODUCT"},
        {"name": "Aguas y Jugos", "type": "PRODUCT"},
        {"name": "Destilados", "type": "PRODUCT"},
        {"name": "Comida / Snacks", "type": "PRODUCT"},
        {"name": "Venta de Bebidas", "type": "INCOME"},
        {"name": "Compra de Mercadería", "type": "EXPENSE"},
        {"name": "Gastos Fijos", "type": "EXPENSE"},
        {"name": "Otros Ingresos", "type": "INCOME"},
    ]
    res = supabase.table("categories").upsert(categories, on_conflict="name").execute()
    log_movement("SISTEMA", "CONFIG", "Categorías inicializadas o actualizadas")
    return {"status": "success", "data": res.data}


@router.api_route("/reset-db", methods=["GET", "POST"])
def reset_db_placeholder():
    return {
        "message": "Usa la consola de Supabase con el archivo schema.sql para resetear la base."
    }
