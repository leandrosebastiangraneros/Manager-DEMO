"""PDF report generation endpoints."""
from datetime import date
import os
import logging

from fastapi import APIRouter
from fastapi.responses import FileResponse

from supabase_client import supabase
from helpers import log_movement

logger = logging.getLogger(__name__)

router = APIRouter(tags=["reports"])


@router.get("/reports/accounting/pdf")
def generate_accounting_report(month: int, year: int):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate,
        Table,
        TableStyle,
        Paragraph,
        Spacer,
    )
    from reportlab.lib.styles import getSampleStyleSheet

    start_date = date(year, month, 1).isoformat()
    end_date = (
        date(year + 1, 1, 1).isoformat()
        if month == 12
        else date(year, month + 1, 1).isoformat()
    )

    res = (
        supabase.table("transactions")
        .select("*")
        .gte("date", start_date)
        .lt("date", end_date)
        .execute()
    )
    transactions = res.data or []

    tx_rows = []
    total_inc = total_exp = 0.0
    for tx in transactions:
        tx_rows.append(
            [
                tx["date"][:10],
                tx.get("description", "")[:40],
                tx["type"],
                f"${tx['amount']:,.2f}",
            ]
        )
        if tx["type"] == "INCOME":
            total_inc += tx["amount"]
        else:
            total_exp += tx["amount"]

    filename = f"Reporte_{year}_{month}.pdf"
    filepath = os.path.join("/tmp", filename)
    doc = SimpleDocTemplate(filepath, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()

    elements.append(
        Paragraph(
            "<b>NovaManager Commercial - Reporte Financiero</b>", styles["Title"]
        )
    )
    elements.append(Paragraph(f"Período: {month}/{year}", styles["Normal"]))
    elements.append(Spacer(1, 20))

    if tx_rows:
        t = Table(
            [["Fecha", "Descripción", "Tipo", "Monto"]] + tx_rows,
            colWidths=[80, 200, 60, 100],
        )
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )
        elements.append(t)

    elements.append(Spacer(1, 40))
    elements.append(
        Paragraph(f"TOTAL INGRESOS: ${total_inc:,.2f}", styles["Normal"])
    )
    elements.append(
        Paragraph(f"TOTAL EGRESOS: ${total_exp:,.2f}", styles["Normal"])
    )
    elements.append(
        Paragraph(
            f"<b>BALANCE NETO: ${(total_inc - total_exp):,.2f}</b>",
            styles["Heading1"],
        )
    )

    doc.build(elements)

    log_movement(
        "SISTEMA",
        "REPORTE",
        f"Generado Reporte PDF Período {month}/{year}",
        {"month": month, "year": year},
    )

    return FileResponse(filepath, filename=filename, media_type="application/pdf")
