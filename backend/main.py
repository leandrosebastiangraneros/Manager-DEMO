from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List, Optional
from datetime import datetime, timedelta
import os
import shutil

# PDF Reporting (ReportLab)
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

import models
import schemas
from database import SessionLocal, engine

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="NovaManager Commercial - API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- CATEGORIES ---
@app.post("/categories", response_model=schemas.Category)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db)):
    db_cat = models.Category(**category.model_dump())
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@app.get("/categories", response_model=List[schemas.Category])
def read_categories(type: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Category)
    if type:
        query = query.filter(models.Category.type == type)
    return query.all()

# --- TRANSACTIONS ---
@app.post("/transactions", response_model=schemas.Transaction)
def create_transaction(transaction: schemas.TransactionCreate, db: Session = Depends(get_db)):
    db_tx = models.Transaction(**transaction.model_dump())
    db.add(db_tx)
    db.commit()
    db.refresh(db_tx)
    return db_tx

@app.get("/transactions", response_model=List[schemas.Transaction])
def read_transactions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Transaction).order_by(models.Transaction.date.desc()).offset(skip).limit(limit).all()

@app.get("/dashboard-stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    now = datetime.now()
    first_day = datetime(now.year, now.month, 1)
    
    income = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.type == "INCOME",
        models.Transaction.date >= first_day
    ).scalar() or 0.0
    
    expenses = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.type == "EXPENSE",
        models.Transaction.date >= first_day
    ).scalar() or 0.0
    
    chart_data = []
    for i in range(29, -1, -1):
        day = now - timedelta(days=i)
        start_day = datetime(day.year, day.month, day.day)
        end_day = start_day + timedelta(days=1)
        
        day_income = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.type == "INCOME",
            models.Transaction.date >= start_day,
            models.Transaction.date < end_day
        ).scalar() or 0.0
        
        day_expense = db.query(func.sum(models.Transaction.amount)).filter(
            models.Transaction.type == "EXPENSE",
            models.Transaction.date >= start_day,
            models.Transaction.date < end_day
        ).scalar() or 0.0
        
        chart_data.append({
            "day": day.day,
            "income": day_income,
            "expense": day_expense
        })

    return {
        "income": income,
        "expenses": expenses,
        "balance": income - expenses,
        "month": now.strftime("%B"),
        "chart_data": chart_data
    }

# --- STOCK & SALES ---
@app.post("/stock", response_model=schemas.StockItem)
def create_stock_item(item: schemas.StockItemCreate, db: Session = Depends(get_db)):
    u_cost = item.cost_amount / item.initial_quantity if item.initial_quantity > 0 else 0
    db_item = models.StockItem(
        name=item.name,
        cost_amount=item.cost_amount,
        initial_quantity=item.initial_quantity,
        quantity=item.initial_quantity,
        unit_cost=u_cost,
        selling_price=item.selling_price,
        category_id=item.category_id,
        status="AVAILABLE"
    )
    db.add(db_item)
    db.flush()
    
    cat = db.query(models.Category).filter(models.Category.name == "Compra de Mercadería").first()
    if not cat:
        cat = models.Category(name="Compra de Mercadería", type="EXPENSE")
        db.add(cat)
        db.flush()

    tx = models.Transaction(
        amount=item.cost_amount,
        description=f"Compra Stock: {item.name} ({item.initial_quantity}u)",
        type="EXPENSE",
        category_id=cat.id
    )
    db.add(tx)
    db.flush()
    db_item.purchase_tx_id = tx.id
    
    db.commit()
    db.refresh(db_item)
    return db_item

@app.get("/stock", response_model=List[schemas.StockItem])
def read_stock(db: Session = Depends(get_db)):
    return db.query(models.StockItem).order_by(models.StockItem.purchase_date.desc()).all()

@app.put("/stock/{item_id}", response_model=schemas.StockItem)
def update_stock_item(item_id: int, item_data: schemas.StockItemCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.StockItem).filter(models.StockItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db_item.name = item_data.name
    db_item.cost_amount = item_data.cost_amount
    db_item.initial_quantity = item_data.initial_quantity
    db_item.selling_price = item_data.selling_price
    db_item.category_id = item_data.category_id
    db_item.unit_cost = item_data.cost_amount / item_data.initial_quantity if item_data.initial_quantity > 0 else 0
    
    db.commit()
    db.refresh(db_item)
    return db_item

@app.post("/sales", response_model=List[schemas.MaterialUsage])
def create_batch_sale(sale: schemas.BatchSaleRequest, db: Session = Depends(get_db)):
    results = []
    total_amount = 0.0
    sale_cat = db.query(models.Category).filter(models.Category.name == "Venta de Bebidas").first()
    if not sale_cat:
        sale_cat = models.Category(name="Venta de Bebidas", type="INCOME")
        db.add(sale_cat)
        db.flush()

    for item_req in sale.items:
        db_item = db.query(models.StockItem).filter(models.StockItem.id == item_req.item_id).first()
        if not db_item:
            raise HTTPException(status_code=404, detail=f"Item {item_req.item_id} not found")
        if db_item.quantity < item_req.quantity:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para {db_item.name}")
            
        subtotal = item_req.quantity * db_item.selling_price
        total_amount += subtotal
        db_item.quantity -= item_req.quantity
        if db_item.quantity <= 0:
            db_item.status = "DEPLETED"
            
        usage = models.MaterialUsage(
            stock_item_id=db_item.id,
            quantity=item_req.quantity,
            description=sale.description,
            sale_price_total=subtotal
        )
        db.add(usage)
        db.flush()
        results.append(usage)

    tx = models.Transaction(
        amount=total_amount,
        description=f"Venta: {sale.description}",
        type="INCOME",
        category_id=sale_cat.id
    )
    db.add(tx)
    db.flush()
    
    for res in results:
        res.sale_tx_id = tx.id
        
    db.commit()
    return results

# --- ARCA - EXPENSES ---
@app.post("/expenses/upload", response_model=schemas.ExpenseDocument)
async def upload_expense(
    description: str,
    amount: float,
    date: str = None, 
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    expense_date = datetime.strptime(date, "%Y-%m-%d") if date else datetime.now()
    year_str = expense_date.strftime("%Y")
    month_str = expense_date.strftime("%m")
    
    upload_dir = f"storage/comprobantes/{year_str}/{month_str}"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_ext = file.filename.split('.')[-1]
    safe_filename = f"{int(datetime.now().timestamp())}_{file.filename.replace(' ', '_')}"
    file_path = f"{upload_dir}/{safe_filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
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
        start_date = datetime(year, month, 1)
        end_date = datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)
        query = query.filter(models.ExpenseDocument.date >= start_date, models.ExpenseDocument.date < end_date)
    return query.order_by(models.ExpenseDocument.date.desc()).all()

@app.get("/finances/summary")
def get_financial_summary(month: int = None, year: int = None, db: Session = Depends(get_db)):
    if not month or not year:
        now = datetime.now()
        month, year = now.month, now.year
        
    start_date = datetime(year, month, 1)
    end_date = datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)
    
    income = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.type == "INCOME",
        models.Transaction.date >= start_date,
        models.Transaction.date < end_date
    ).scalar() or 0.0
    
    expense = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.type == "EXPENSE",
        models.Transaction.date >= start_date,
        models.Transaction.date < end_date
    ).scalar() or 0.0
    
    return {
        "period": f"{month}/{year}",
        "total_income": income,
        "total_expense": expense,
        "net_balance": income - expense
    }

# --- PDF REPORTS ---
@app.get("/reports/accounting/pdf")
def generate_accounting_report(month: int, year: int, db: Session = Depends(get_db)):
    start_date = datetime(year, month, 1)
    end_date = datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)
    
    # Transactions Detail
    transactions = db.query(models.Transaction).filter(
        models.Transaction.date >= start_date,
        models.Transaction.date < end_date
    ).all()
    
    tx_rows = []
    total_inc = 0.0
    total_exp = 0.0
    for tx in transactions:
        tx_rows.append([
            tx.date.strftime("%d/%m/%Y"),
            tx.description[:40],
            tx.type,
            f"${tx.amount:,.2f}"
        ])
        if tx.type == "INCOME": total_inc += tx.amount
        else: total_exp += tx.amount

    filename = f"Reporte_Comercial_{year}_{month}.pdf"
    filepath = os.path.join("/tmp", filename)
    
    doc = SimpleDocTemplate(filepath, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    elements.append(Paragraph(f"<b>NovaManager Commercial - Reporte de Ventas y Gastos</b>", styles['Title']))
    elements.append(Paragraph(f"Período: {month}/{year}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    elements.append(Paragraph(f"<b>Resumen de Movimientos</b>", styles['Heading2']))
    if tx_rows:
        t = Table([["Fecha", "Descripción", "Tipo", "Monto"]] + tx_rows, colWidths=[80, 200, 60, 100])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.grey),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('GRID', (0,0), (-1,-1), 1, colors.black)
        ]))
        elements.append(t)
    else:
        elements.append(Paragraph("Sin movimientos en el período.", styles['Normal']))

    elements.append(Spacer(1, 40))
    elements.append(Paragraph(f"TOTAL INGRESOS: ${total_inc:,.2f}", styles['Normal']))
    elements.append(Paragraph(f"TOTAL EGRESOS: ${total_exp:,.2f}", styles['Normal']))
    elements.append(Paragraph(f"<b>BALANCE NETO: ${(total_inc - total_exp):,.2f}</b>", styles['Heading1']))
    
    doc.build(elements)
    return FileResponse(filepath, filename=filename, media_type='application/pdf')

# --- SYSTEM MANAGEMENT ---
@app.post("/reset-db")
def reset_database(db: Session = Depends(get_db)):
    # Option 2: Drop all tables and recreate them (Cleanest Factory Reset)
    try:
        models.Base.metadata.drop_all(bind=engine)
        models.Base.metadata.create_all(bind=engine)
        
        # Initialize default categories
        sale_cat = models.Category(name="Venta de Bebidas", type="INCOME")
        purchase_cat = models.Category(name="Compra de Mercadería", type="EXPENSE")
        
        db.add(sale_cat)
        db.add(purchase_cat)
        db.commit()
        
        return {"message": "Database reset successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
