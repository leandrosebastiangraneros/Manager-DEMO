"""
Expense and financial summary endpoints.
"""

import os
from datetime import datetime

from fastapi import APIRouter, HTTPException, UploadFile, File, Form  # type: ignore
from supabase_client import supabase  # type: ignore
from helpers import log_movement, UPLOAD_DIR, get_category_id  # type: ignore

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.get("/finances/summary")
async def financial_summary(month: int, year: int):
    """Get income/expense summary for a given month."""
    month_start = f"{year}-{month:02d}-01"
    next_month = month + 1 if month < 12 else 1
    next_year = year if month < 12 else year + 1
    month_end = f"{next_year}-{next_month:02d}-01"

    # Income
    income_res = await (
        supabase.table("transactions")
        .select("amount")
        .eq("type", "INCOME")
        .gte("date", month_start)
        .lt("date", month_end)
        .execute()
    )
    total_income = sum(t["amount"] for t in (income_res.data or []))

    # Expenses
    expense_res = await (
        supabase.table("transactions")
        .select("amount")
        .eq("type", "EXPENSE")
        .gte("date", month_start)
        .lt("date", month_end)
        .execute()
    )
    total_expense = sum(t["amount"] for t in (expense_res.data or []))

    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "net_balance": total_income - total_expense,
    }


@router.get("/expenses")
async def list_expenses(month: int, year: int):
    """List expense documents for a given month."""
    month_start = f"{year}-{month:02d}-01"
    next_month = month + 1 if month < 12 else 1
    next_year = year if month < 12 else year + 1
    month_end = f"{next_year}-{next_month:02d}-01"

    res = await (
        supabase.table("expense_documents")
        .select("*")
        .gte("date", month_start)
        .lt("date", month_end)
        .order("date", desc=True)
        .execute()
    )
    return res.data if res else []


@router.post("/expenses/upload")
async def upload_expense(
    description: str = Form(...),
    amount: float = Form(...),
    date: str = Form(...),
    file: UploadFile = File(...),
):
    """Upload an expense document (PDF or image)."""
    # Validate extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type not allowed: {ext}")

    # Read and validate size
    contents: bytes = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    # Save file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)

    # Record in database
    doc_res = await supabase.table("expense_documents").insert({
        "description": description,
        "amount": amount,
        "date": date,
        "file_path": f"uploads/{filename}",
        "file_type": ext.lstrip("."),
    }).execute()

    # Create expense transaction
    expense_cat_id = await get_category_id("Gastos Fijos")
    tx_res = await supabase.table("transactions").insert({
        "amount": amount,
        "description": description,
        "type": "EXPENSE",
        "category_id": expense_cat_id,
    }).execute()

    await log_movement(
        "FINANZAS", "GASTO",
        f"Gasto registrado: {description} — ${amount:,.2f}",
        metadata={"amount": amount, "file": filename},
        transaction_id=tx_res.data[0]["id"] if tx_res and tx_res.data else None,
    )

    return {"status": "ok", "document": doc_res.data[0] if doc_res and doc_res.data else {}}
