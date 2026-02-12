"""
NovaManager Commercial - API
Modular FastAPI application with router-based architecture.
"""
from contextlib import asynccontextmanager
import os
import traceback
import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from supabase_client import supabase

# Routers
from routers import health, categories, stock, sales, expenses, reports, admin

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# --- Lifespan (startup/shutdown) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle — close resources on shutdown."""
    logger.info("NovaManager API starting up...")
    yield
    logger.info("NovaManager API shutting down — closing Supabase client...")
    supabase.close()


# --- App Factory ---
root_path = "/api" if os.getenv("VERCEL") else ""

app = FastAPI(
    title="NovaManager Commercial - API",
    root_path=root_path,
    debug=os.getenv("DEBUG", "false").lower() == "true",
    lifespan=lifespan,
)

# CORS
ALLOWED_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False if "*" in ALLOWED_ORIGINS else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = str(exc)
    stack = traceback.format_exc()
    logger.error(f"Global Error: {error_msg}\n{stack}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": error_msg,
            "type": type(exc).__name__,
            "msg": "Ocurrió un error en el servidor. Revisa los detalles.",
            "traceback": stack if app.debug else None,
        },
    )


# --- Register Routers ---
app.include_router(health.router)
app.include_router(categories.router)
app.include_router(stock.router)
app.include_router(sales.router)
app.include_router(expenses.router)
app.include_router(reports.router)
app.include_router(admin.router)
