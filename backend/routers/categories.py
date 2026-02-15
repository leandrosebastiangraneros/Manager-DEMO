"""Category CRUD endpoints."""

from fastapi import APIRouter, Query  # type: ignore
from supabase_client import supabase  # type: ignore
import schemas  # type: ignore

router = APIRouter()


@router.post("/categories")
async def create_category(cat: schemas.CategoryCreate):
    res = await supabase.table("categories").insert(cat.model_dump()).execute()
    if not res:
        raise Exception(f"Failed to create category: {res.error}")
    return res.data[0] if res.data else {}


@router.get("/categories")
async def read_categories(type: str = Query(None)):
    query = supabase.table("categories").select("*").order("name")
    if type:
        query = query.eq("type", type)
    res = await query.execute()
    return res.data if res else []
