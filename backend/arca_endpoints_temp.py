
# --- ARCA - ADMINISTRATION & REPORTS ---

@app.post("/expenses/upload", response_model=schemas.ExpenseDocument)
async def upload_expense(
    description: str,
    amount: float,
    date: str = None, # YYYY-MM-DD
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # 1. Create Directory Structure: storage/comprobantes/YYYY/MM
    expense_date = datetime.strptime(date, "%Y-%m-%d") if date else datetime.now()
    year_str = expense_date.strftime("%Y")
    month_str = expense_date.strftime("%m")
    
    upload_dir = f"storage/comprobantes/{year_str}/{month_str}"
    os.makedirs(upload_dir, exist_ok=True)
    
    # 2. Save File
    file_ext = file.filename.split('.')[-1]
    safe_filename = f"{int(datetime.now().timestamp())}_{file.filename.replace(' ', '_')}"
    file_path = f"{upload_dir}/{safe_filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # 3. Create DB Record
    db_doc = models.ExpenseDocument(
        description=description,
        amount=amount,
        date=expense_date,
        file_path=file_path,
        file_type=file_ext
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    
    return db_doc

@app.get("/expenses", response_model=List[schemas.ExpenseDocument])
def get_expenses(month: int = None, year: int = None, db: Session = Depends(get_db)):
    query = db.query(models.ExpenseDocument)
    if month and year:
        # Simple Filter Logic (In prod database use extract)
        # For SQLite strings we can filter mostly by range
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
             end_date = datetime(year, month + 1, 1)
             
        query = query.filter(models.ExpenseDocument.date >= start_date, models.ExpenseDocument.date < end_date)
        
    return query.order_by(models.ExpenseDocument.date.desc()).all()

@app.get("/finances/summary")
def get_financial_summary(month: int = None, year: int = None, db: Session = Depends(get_db)):
    # Defaults to current month
    if not month or not year:
        now = datetime.now()
        month = now.month
        year = now.year
        
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)
        
    # 1. Labor Costs (From Closed Trips + Advances?? No, usually just Production Value)
    # Strategy: Sum 'total_earned' from TripAssignments in Closed Trips this month
    labor_query = db.query(func.sum(models.TripEmployee.total_earned)).join(models.WorkTrip).filter(
        models.WorkTrip.status == "CLOSED",
        models.WorkTrip.date >= start_date,
        models.WorkTrip.date < end_date
    )
    labor_cost = labor_query.scalar() or 0.0
    
    # 2. Expenses
    expense_query = db.query(func.sum(models.ExpenseDocument.amount)).filter(
        models.ExpenseDocument.date >= start_date,
        models.ExpenseDocument.date < end_date
    )
    expense_cost = expense_query.scalar() or 0.0
    
    return {
        "period": f"{month}/{year}",
        "labor_cost": labor_cost,
        "expense_cost": expense_cost,
        "total_cost": labor_cost + expense_cost
    }

@app.get("/reports/accounting/pdf")
def generate_accounting_report(month: int, year: int, db: Session = Depends(get_db)):
    # Fetch Data
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)
        
    # Payroll Data (Grouped by Employee)
    employees = db.query(models.Employee).all()
    payroll_rows = []
    total_payroll = 0.0
    
    for emp in employees:
        # Get production for this month
        prod = db.query(func.sum(models.TripEmployee.total_earned), func.sum(models.TripEmployee.meters_done)).join(models.WorkTrip).filter(
            models.TripEmployee.employee_id == emp.id,
            models.WorkTrip.status == "CLOSED",
            models.WorkTrip.date >= start_date,
            models.WorkTrip.date < end_date
        ).first()
        
        earned = prod[0] or 0.0
        meters = prod[1] or 0.0
        
        if earned > 0:
            payroll_rows.append([emp.name, f"{meters:.2f}m", f"${earned:,.2f}"])
            total_payroll += earned
            
    # Expenses Data
    expenses = db.query(models.ExpenseDocument).filter(
        models.ExpenseDocument.date >= start_date,
        models.ExpenseDocument.date < end_date
    ).order_by(models.ExpenseDocument.date).all()
    
    expense_rows = []
    total_expenses = 0.0
    for exp in expenses:
        expense_rows.append([
            exp.date.strftime("%d/%m/%Y"), 
            exp.description[:40], 
            f"${exp.amount:,.2f}"
        ])
        total_expenses += exp.amount

    # --- PDF GENERATION ---
    filename = f"Reporte_Contable_{year}_{month}.pdf"
    filepath = f"storage/{filename}"
    
    doc = SimpleDocTemplate(filepath, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    # Header
    elements.append(Paragraph(f"<b>NovaManager - Reporte Contable</b>", styles['Title']))
    elements.append(Paragraph(f"Período: {month}/{year}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Section 1: Payroll
    elements.append(Paragraph(f"<b>1. Nómina / Producción ({len(payroll_rows)} Empleados)</b>", styles['Heading2']))
    if payroll_rows:
        data = [["Empleado", "Producción", "A Pagar"]] + payroll_rows
        t = Table(data, colWidths=[200, 100, 100])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.grey),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('GRID', (0,0), (-1,-1), 1, colors.black),
        ]))
        elements.append(t)
        elements.append(Paragraph(f"<b>Total Nómina: ${total_payroll:,.2f}</b>", styles['Normal']))
    else:
         elements.append(Paragraph("Sin actividad registrada.", styles['Normal']))
         
    elements.append(Spacer(1, 20))
    
    # Section 2: Expenses
    elements.append(Paragraph(f"<b>2. Gastos Operativos ({len(expenses)})</b>", styles['Heading2']))
    if expense_rows:
        data = [["Fecha", "Descripción", "Monto"]] + expense_rows
        t = Table(data, colWidths=[80, 220, 100])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.grey),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('GRID', (0,0), (-1,-1), 1, colors.black),
        ]))
        elements.append(t)
        elements.append(Paragraph(f"<b>Total Gastos: ${total_expenses:,.2f}</b>", styles['Normal']))
    else:
        elements.append(Paragraph("Sin gastos registrados.", styles['Normal']))
        
    elements.append(Spacer(1, 30))
    
    # Footer
    elements.append(Paragraph(f"<b>TOTAL GENERAL DEL PERÍODO: ${(total_payroll + total_expenses):,.2f}</b>", styles['Heading1']))
    
    doc.build(elements)
    
    return FileResponse(filepath, filename=filename, media_type='application/pdf')
