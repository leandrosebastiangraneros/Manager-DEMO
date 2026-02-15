"""
NovaManager — FastAPI Application Entry Point.

Sets up middleware (CORS, Auth), exception handling, router registration,
and manages the async Supabase client lifecycle.
"""

import os
import traceback
from contextlib import asynccontextmanager

from dotenv import load_dotenv  # type: ignore
from fastapi import FastAPI, Request  # type: ignore
from fastapi.responses import JSONResponse  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore

from supabase_client import supabase  # type: ignore
from auth import ApiKeyMiddleware  # type: ignore

load_dotenv()

DEBUG = os.getenv("DEBUG", "false").lower() == "true"
IS_VERCEL = os.getenv("VERCEL", "")

# ─── Lifespan ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Open the Supabase client on startup, close on shutdown."""
    await supabase.open()
    yield
    await supabase.close()

# ─── App Factory ─────────────────────────────────────────────────────────────

root_path = "/api" if IS_VERCEL else ""

app = FastAPI(
    title="NovaManager API",
    version="2.0.0",
    root_path=root_path,
    lifespan=lifespan,
    debug=DEBUG,
)

# ─── Middleware ───────────────────────────────────────────────────────────────

# CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Key Authentication
app.add_middleware(ApiKeyMiddleware)

# ─── Global Exception Handler ────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc() if DEBUG else None
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "traceback": tb,
        },
    )

# ─── Router Registration ─────────────────────────────────────────────────────

from routers import health, categories, stock, sales, expenses, reports, admin  # type: ignore

app.include_router(health.router)
app.include_router(categories.router)
app.include_router(stock.router)
app.include_router(sales.router)
app.include_router(expenses.router)
app.include_router(reports.router)
app.include_router(admin.router)
