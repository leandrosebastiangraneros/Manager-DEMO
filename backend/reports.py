from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from io import BytesIO

def generate_monthly_pdf(month_str, income, expenses, balance, transactions):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    story = []
    
    styles = getSampleStyleSheet()
    title_style = styles["Title"]
    
    # Title
    story.append(Paragraph(f"Reporte Mensual: {month_str}", title_style))
    story.append(Spacer(1, 1*cm))
    
    # Summary Table
    story.append(Paragraph("Resumen Financiero", styles["Heading2"]))
    story.append(Spacer(1, 0.5*cm))
    
    summary_data = [
        ["Concepto", "Monto"],
        ["Total Ingresos", f"$ {income:,.2f}"],
        ["Total Gastos", f"$ {expenses:,.2f}"],
        ["Balance Final", f"$ {balance:,.2f}"]
    ]
    
    t_summary = Table(summary_data, colWidths=[10*cm, 5*cm])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('TEXTCOLOR', (1, 3), (1, 3), colors.green if balance >= 0 else colors.red),
        ('FONTNAME', (1, 3), (1, 3), 'Helvetica-Bold'),
    ]))
    story.append(t_summary)
    story.append(Spacer(1, 1*cm))
    
    # Transactions List
    story.append(Paragraph("Detalle de Movimientos", styles["Heading2"]))
    story.append(Spacer(1, 0.5*cm))
    
    tx_data = [["Fecha", "Tipo", "Categoría", "Descripción", "Monto"]]
    for tx in transactions:
        tx_data.append([
            tx.date.strftime("%d/%m/%Y"),
            "Ingreso" if tx.type == "INCOME" else "Gasto",
            tx.category.name if tx.category else "-",
            tx.description[:30] if tx.description else "-", # Truncate description properly
            f"$ {tx.amount:,.2f}"
        ])
        
    t_tx = Table(tx_data, colWidths=[2.5*cm, 2*cm, 4*cm, 5.5*cm, 3*cm])
    t_tx.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    
    # Colorize amounts
    for i, tx in enumerate(transactions):
        row_idx = i + 1
        color = colors.green if tx.type == "INCOME" else colors.red
        t_tx.setStyle(TableStyle([
            ('TEXTCOLOR', (4, row_idx), (4, row_idx), color)
        ]))

    story.append(t_tx)
    
    doc.build(story)
    buffer.seek(0)
    return buffer
