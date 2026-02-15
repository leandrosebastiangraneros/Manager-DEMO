"""Health check endpoints."""

from fastapi import APIRouter  # type: ignore
from supabase_client import supabase  # type: ignore

router = APIRouter()


@router.get("/ping")
async def ping():
    return {"status": "pong"}


@router.get("/health")
async def health_check():
    """Health check with database connectivity test."""
    try:
        res = await supabase.table("categories").select("id").limit(1).execute()
        db_status = "connected" if res else "error"
    except Exception as e:
        db_status = f"error: {e}"

    return {
        "status": "healthy",
        "database": db_status,
    }
