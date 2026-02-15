"""
Report generation endpoints — PDF accounting reports.
"""

import io
from fastapi import APIRouter  # type: ignore
from fastapi.responses import StreamingResponse  # type: ignore
from reportlab.lib.pagesizes import A4  # type: ignore
from reportlab.lib.units import mm  # type: ignore
from reportlab.pdfgen import canvas  # type: ignore

from supabase_client import supabase  # type: ignore

router = APIRouter()


@router.get("/reports/accounting/pdf")
async def accounting_report_pdf(month: int, year: int):
    """
    Generate a PDF accounting report for a given month.
    Summarizes income, expenses, and net balance.
    """
    month_start = f"{year}-{month:02d}-01"
    next_month = month + 1 if month < 12 else 1
    next_year = year if month < 12 else year + 1
    month_end = f"{next_year}-{next_month:02d}-01"

    # Fetch transactions for the month
    income_res = await (
        supabase.table("transactions")
        .select("*")
        .eq("type", "INCOME")
        .gte("date", month_start)
        .lt("date", month_end)
        .order("date")
        .execute()
    )
    expense_res = await (
        supabase.table("transactions")
        .select("*")
        .eq("type", "EXPENSE")
        .gte("date", month_start)
        .lt("date", month_end)
        .order("date")
        .execute()
    )

    incomes = income_res.data if income_res else []
    expenses = expense_res.data if expense_res else []
    total_income = sum(t["amount"] for t in incomes)
    total_expense = sum(t["amount"] for t in expenses)
    net_balance = total_income - total_expense

    # Month name in Spanish
    months_es = [
        "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ]
    month_name = months_es[month] if 1 <= month <= 12 else str(month)

    # Build PDF
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Header
    c.setFont("Helvetica-Bold", 18)
    c.drawString(30 * mm, height - 25 * mm, "ESTADO DE CUENTA")
    c.setFont("Helvetica", 11)
    c.drawString(30 * mm, height - 33 * mm, "Centro de Abaratamiento Mayorista")
    c.drawString(30 * mm, height - 40 * mm, f"Período: {month_name} {year}")

    y = height - 55 * mm

    # ── Income Section ────
    c.setFont("Helvetica-Bold", 12)
    c.drawString(30 * mm, y, "INGRESOS")
    y -= 8 * mm
    c.setFont("Helvetica", 9)

    for tx in incomes:
        date_str = tx.get("date", "-")[:10]
        c.drawString(30 * mm, y, date_str)
        c.drawString(55 * mm, y, (tx.get("description", "-"))[:55])
        c.drawRightString(175 * mm, y, f"$ {tx['amount']:,.2f}")
        y -= 5 * mm
        if y < 30 * mm:
            c.showPage()
            y = height - 25 * mm

    c.setFont("Helvetica-Bold", 10)
    y -= 3 * mm
    c.line(30 * mm, y + 2, 175 * mm, y + 2)
    c.drawString(55 * mm, y - 3 * mm, "Total Ingresos:")
    c.drawRightString(175 * mm, y - 3 * mm, f"$ {total_income:,.2f}")
    y -= 15 * mm

    # ── Expense Section ────
    c.setFont("Helvetica-Bold", 12)
    c.drawString(30 * mm, y, "EGRESOS")
    y -= 8 * mm
    c.setFont("Helvetica", 9)

    for tx in expenses:
        date_str = tx.get("date", "-")[:10]
        c.drawString(30 * mm, y, date_str)
        c.drawString(55 * mm, y, (tx.get("description", "-"))[:55])
        c.drawRightString(175 * mm, y, f"$ {tx['amount']:,.2f}")
        y -= 5 * mm
        if y < 30 * mm:
            c.showPage()
            y = height - 25 * mm

    c.setFont("Helvetica-Bold", 10)
    y -= 3 * mm
    c.line(30 * mm, y + 2, 175 * mm, y + 2)
    c.drawString(55 * mm, y - 3 * mm, "Total Egresos:")
    c.drawRightString(175 * mm, y - 3 * mm, f"$ {total_expense:,.2f}")
    y -= 20 * mm

    # ── Balance ────
    c.setFont("Helvetica-Bold", 14)
    c.line(30 * mm, y + 5, 175 * mm, y + 5)
    c.drawString(55 * mm, y - 5 * mm, "BALANCE NETO:")
    c.drawRightString(175 * mm, y - 5 * mm, f"$ {net_balance:,.2f}")

    c.save()
    buffer.seek(0)

    filename = f"Estado_Cuenta_{month_name}_{year}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
