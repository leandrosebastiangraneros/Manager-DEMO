"""Expenses and finance endpoints."""
from typing import List
from datetime import date
import os
import shutil
import uuid
import logging

from fastapi import APIRouter, HTTPException, File, UploadFile, Form

from supabase_client import supabase
from helpers import log_movement, UPLOAD_DIR, ALLOWED_EXTENSIONS, MAX_UPLOAD_SIZE_MB
import schemas

logger = logging.getLogger(__name__)

router = APIRouter(tags=["expenses"])


@router.get("/finances/summary")
def get_finance_summary(month: int, year: int):
    start_date = date(year, month, 1).isoformat()
    end_date = (
        date(year + 1, 1, 1).isoformat()
        if month == 12
        else date(year, month + 1, 1).isoformat()
    )

    res = (
        supabase.table("transactions")
        .select("amount, type")
        .gte("date", start_date)
        .lt("date", end_date)
        .execute()
    )
    txs = res.data or []

    income = sum(t["amount"] for t in txs if t["type"] == "INCOME")
    expense = sum(t["amount"] for t in txs if t["type"] == "EXPENSE")

    return {
        "total_income": income,
        "total_expense": expense,
        "net_balance": income - expense,
    }


@router.get("/expenses", response_model=List[schemas.ExpenseDocument])
def read_expenses(month: int, year: int):
    start_date = date(year, month, 1).isoformat()
    end_date = (
        date(year + 1, 1, 1).isoformat()
        if month == 12
        else date(year, month + 1, 1).isoformat()
    )
    res = (
        supabase.table("expense_documents")
        .select("*")
        .gte("date", start_date)
        .lt("date", end_date)
        .execute()
    )
    return res.data or []


@router.post("/expenses/upload")
async def upload_expense(
    description: str = Form(...),
    amount: float = Form(...),
    date: str = Form(...),
    file: UploadFile = File(...),
):
    # Validate file extension
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de archivo no permitido: .{ext}. Permitidos: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Validate file size
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"El archivo excede el límite de {MAX_UPLOAD_SIZE_MB}MB",
        )
    await file.seek(0)

    # Save file
    file_id = str(uuid.uuid4())[:8]
    safe_filename = f"{file_id}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, safe_filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    doc_data = {
        "description": description,
        "amount": amount,
        "date": date,
        "file_path": filepath,
        "file_type": ext,
    }
    res = supabase.table("expense_documents").insert(doc_data).execute()

    log_movement(
        "FINANZAS",
        "GASTO",
        f"Comprobante cargado: {description} - ${amount:,.2f}",
        {"amount": amount, "file_id": file_id},
    )

    return res.data[0]
