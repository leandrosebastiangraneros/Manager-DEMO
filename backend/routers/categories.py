"""Category management endpoints."""
from typing import List, Optional
from fastapi import APIRouter

from supabase_client import supabase
import schemas

router = APIRouter(tags=["categories"])


@router.post("/categories", response_model=schemas.Category)
def create_category(category: schemas.CategoryCreate):
    data = category.model_dump()
    res = supabase.table("categories").insert(data).execute()
    return res.data[0]


@router.get("/categories", response_model=List[schemas.Category])
def read_categories(type: Optional[str] = None):
    query = supabase.table("categories").select("*")
    if type:
        query = query.eq("type", type)
    res = query.execute()
    return res.data or []
