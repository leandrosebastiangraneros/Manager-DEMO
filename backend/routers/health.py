"""Health check endpoints."""
from fastapi import APIRouter

from supabase_client import supabase

router = APIRouter(tags=["health"])


@router.get("/api/ping")
@router.get("/ping")
def ping():
    return {"status": "pong", "message": "Backend is reachable (Supabase Mode)!"}


@router.get("/health")
def health_check():
    if not supabase or not supabase.initialized:
        return {
            "status": "ERROR",
            "db_connection": "NOT_CONFIGURED",
            "detail": "Supabase credentials missing",
        }
    try:
        supabase.table("categories").select("id").limit(1).execute()
        return {
            "status": "ONLINE",
            "db_connection": "SUCCESS",
            "mode": "Supabase Client (HTTPX Lite)",
        }
    except Exception as e:
        return {"status": "ERROR", "db_connection": "FAILED", "detail": str(e)}
