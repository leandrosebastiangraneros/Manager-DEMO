from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import os
import shutil
import traceback
import logging

# Supabase Client
from supabase_client import supabase

# Schemas
import schemas

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configurar root_path para Vercel
root_path = "/api" if os.getenv("VERCEL") else ""

app = FastAPI(title="NovaManager Commercial - API", root_path=root_path, debug=True)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- UTILS ---
def execute_supabase_query(query_builder):
    """Executes a Supabase query and handles errors."""
    try:
        response = query_builder.execute()
        # Newer versions of supabase-py might perform error checking automatically or return data differently.
        # Check documentation or assume response.data is the payload.
        return response.data
    except Exception as e:
        logger.error(f"Supabase Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# --- HEALTH ---
@app.get("/api/ping")
@app.get("/ping")
def ping():
    return {"status": "pong", "message": "Backend is reachable (Supabase Mode)!"}

@app.get("/health")
def health_check():
    try:
        # Simple query to check connection
        supabase.table("categories").select("id", count="exact").limit(1).execute()
        return {"status": "ONLINE", "db_connection": "SUCCESS", "mode": "Supabase Client"}
    except Exception as e:
        return {"status": "ERROR", "db_connection": "FAILED", "detail": str(e)}

# --- CATEGORIES ---
@app.post("/categories", response_model=schemas.Category)
def create_category(category: schemas.CategoryCreate):
    data = category.model_dump()
    res = supabase.table("categories").insert(data).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to create category")
    return res.data[0]

@app.get("/categories", response_model=List[schemas.Category])
def read_categories(type: Optional[str] = None):
    query = supabase.table("categories").select("*")
    if type:
        query = query.eq("type", type)
    
    res = query.execute()
    return res.data

# --- TRANSACTIONS ---
@app.post("/transactions", response_model=schemas.Transaction)
def create_transaction(transaction: schemas.TransactionCreate):
    data = transaction.model_dump()
    # Ensure date is string or datetime object compatible with Supabase
    data["created_at"] = datetime.now().isoformat()
    # If date is in schema but default to now if missing
    if "date" not in data or not data["date"]:
         data["date"] = datetime.now().isoformat()

    res = supabase.table("transactions").insert(data).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Failed to create transaction")
    return res.data[0]

@app.get("/transactions", response_model=List[schemas.Transaction])
def read_transactions(skip: int = 0, limit: int = 100):
    res = supabase.table("transactions").select("*").order("date", desc=True).range(skip, skip + limit - 1).execute()
    return res.data

@app.get("/dashboard-stats")
def get_dashboard_stats():
    # Calculate stats in Python (Fetch all recent transactions isn't checking aggregation for simplicity here, 
    # but strictly for scalability we would use an RPC or summary table. 
    # For now, fetching last 1000 tx is fine for MVP)
    
    now = datetime.now()
    first_day = datetime(now.year, now.month, 1).isoformat()
    
    # Fetch current month transactions
    res = supabase.table("transactions").select("amount, type, date").gte("date", first_day).execute()
    transactions = res.data
    
    income = sum(t["amount"] for t in transactions if t["type"] == "INCOME")
    expenses = sum(t["amount"] for t in transactions if t["type"] == "EXPENSE")
    
    # Chart Data (Last 30 days) - This requires a more complex query or processing.
    # We will return simplified data for now to match frontend expectation
    return {
        "income": income,
        "expenses": expenses,
        "balance": income - expenses,
        "chart_data": [] # TODO: Implement efficient chart data aggregation
    }

# --- PROVISION & STOCK ---
@app.post("/stock", response_model=schemas.StockItem)
def create_stock_item(item: schemas.StockItemCreate):
    # 1. Create Purchase Transaction (Expense)
    tx_data = {
        "date": datetime.now().isoformat(),
        "amount": item.cost_amount,
        "description": f"Compra Stock: {item.name}",
        "type": "EXPENSE",
        "category_id": 8 # Buying Merchandise ID (Hardcoded/Assumed from Seed)
    }
    
    # Try to find 'Compra de Mercadería' category ID dynamically
    cat_res = supabase.table("categories").select("id").eq("name", "Compra de Mercadería").execute()
    if cat_res.data:
        tx_data["category_id"] = cat_res.data[0]["id"]

    tx_res = supabase.table("transactions").insert(tx_data).execute()
    purchase_tx = tx_res.data[0] if tx_res.data else None
    
    # 2. Create Stock Item
    stock_data = item.model_dump()
    stock_data["purchase_tx_id"] = purchase_tx["id"] if purchase_tx else None
    stock_data["purchase_date"] = datetime.now().isoformat()
    stock_data["status"] = "AVAILABLE"
    
    # CRITICAL: Exclude generated columns and None values
    stock_data.pop("unit_cost", None) 
    if stock_data.get("category_id") == 0: stock_data["category_id"] = None

    stock_res = supabase.table("stock_items").insert(stock_data).execute()
    if not stock_res.data:
        raise HTTPException(status_code=400, detail="Failed to create stock item")
        
    return stock_res.data[0]

@app.get("/stock", response_model=List[schemas.StockItem])
def read_stock():
    # Helper: Update status if quantity is 0 (Lazy update)
    # Ideally should be a trigger, but we can do it on read or write.
    res = supabase.table("stock_items").select("*").order("name").execute()
    return res.data

# --- SALES ---
@app.post("/sales")
def create_sale(sale: schemas.MaterialUsageCreate):
    # 1. Get Stock Item to check availability and price
    item_res = supabase.table("stock_items").select("*").eq("id", sale.stock_item_id).single().execute()
    item = item_res.data
    
    if not item:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if item["quantity"] < sale.quantity:
         raise HTTPException(status_code=400, detail="Insufficient stock")
         
    selling_price = item.get("selling_price") or 0.0
    total_sale = selling_price * sale.quantity
    
    # 2. Create Income Transaction
    tx_data = {
        "date": datetime.now().isoformat(),
        "amount": total_sale,
        "description": f"Venta: {item.get('name', 'Producto')} x{sale.quantity}",
        "type": "INCOME",
        "category_id": 7 # Venta de Bebidas
    }
    # Dynamic Category Lookup
    cat_res = supabase.table("categories").select("id").eq("name", "Venta de Bebidas").execute()
    if cat_res.data:
        tx_data["category_id"] = cat_res.data[0]["id"]
        
    tx_res = supabase.table("transactions").insert(tx_data).execute()
    sale_tx = tx_res.data[0]
    
    # 3. Register Sale
    sale_data = {
        "stock_item_id": sale.stock_item_id,
        "quantity": sale.quantity,
        "description": sale.description,
        "sale_price_total": total_sale,
        "sale_tx_id": sale_tx["id"]
    }
    supabase.table("sales").insert(sale_data).execute()
    
    # 4. Update Stock Quantity
    new_quantity = item["quantity"] - sale.quantity
    new_status = "DEPLETED" if new_quantity <= 0 else "AVAILABLE"
    
    supabase.table("stock_items").update({
        "quantity": new_quantity,
        "status": new_status
    }).eq("id", item["id"]).execute()
    
    return {"status": "success", "message": "Sale registered successfully"}

# --- SEED ---
@app.get("/seed-categories")
def seed_categories():
    categories = [
        {"name": "Gaseosas", "type": "PRODUCT"},
        {"name": "Cervezas", "type": "PRODUCT"},
        {"name": "Vinos y Espumantes", "type": "PRODUCT"},
        {"name": "Aguas y Jugos", "type": "PRODUCT"},
        {"name": "Destilados", "type": "PRODUCT"},
        {"name": "Comida / Snacks", "type": "PRODUCT"},
        {"name": "Venta de Bebidas", "type": "INCOME"},
        {"name": "Compra de Mercadería", "type": "EXPENSE"},
        {"name": "Gastos Fijos", "type": "EXPENSE"},
        {"name": "Otros Ingresos", "type": "INCOME"}
    ]
    
    # Upsert (Insert or Ignore if name conflicts)
    res = supabase.table("categories").upsert(categories, on_conflict="name").execute()
    return {"status": "success", "data": res.data}

@app.api_route("/reset-db", methods=["GET", "POST"])
def reset_db_placeholder():
    return {"message": "Please use the Supabase SQL Editor with the provided schema.sql script to reset the DB structure."}

# --- REPORTING ---
@app.get("/reports/accounting/pdf")
def generate_accounting_report(month: int, year: int):
    # Lazy Import
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    
    start_date = datetime(year, month, 1).isoformat()
    end_date = (datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)).isoformat()
    
    res = supabase.table("transactions").select("*").gte("date", start_date).lt("date", end_date).execute()
    transactions = res.data
    
    tx_rows = []
    total_inc = 0.0
    total_exp = 0.0
    
    for tx in transactions:
        try:
            date_obj = datetime.fromisoformat(tx["date"].replace('Z', '+00:00'))
            date_str = date_obj.strftime("%d/%m/%Y")
        except:
            date_str = str(tx["date"])
            
        tx_rows.append([
            date_str,
            tx.get("description", "")[:40],
            tx["type"],
            f"${tx['amount']:,.2f}"
        ])
        if tx["type"] == "INCOME": total_inc += tx["amount"]
        else: total_exp += tx["amount"]
        
    # PDF Generation (Same as before)
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
