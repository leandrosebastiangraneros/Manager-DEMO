from fastapi import FastAPI, HTTPException, File, UploadFile, Form, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import os
import shutil
import traceback
import logging
import uuid

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

# Global Exception Handler (Diagnostic Tool)
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
            "traceback": stack if app.debug else None
        }
    )

# Upload directory
UPLOAD_DIR = "/tmp/uploads" if os.getenv("VERCEL") else "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# Helper for Activity Logging
def log_movement(category: str, action: str, description: str, metadata: dict = {}):
    try:
        data = {
            "category": category,
            "action": action,
            "description": description,
            "metadata": metadata
        }
        supabase.table("app_movements").insert(data).execute()
    except Exception as e:
        logger.error(f"Failed to log movement: {e}")

# --- HEALTH ---
@app.get("/api/ping")
@app.get("/ping")
def ping():
    return {"status": "pong", "message": "Backend is reachable (Supabase Mode)!"}

@app.get("/health")
def health_check():
    if not supabase or not supabase.initialized:
        return {"status": "ERROR", "db_connection": "NOT_CONFIGURED", "detail": "Supabase credentials missing"}
    try:
        supabase.table("categories").select("id").limit(1).execute()
        return {"status": "ONLINE", "db_connection": "SUCCESS", "mode": "Supabase Client (HTTPX Lite)"}
    except Exception as e:
        return {"status": "ERROR", "db_connection": "FAILED", "detail": str(e)}

# --- CATEGORIES ---
@app.post("/categories", response_model=schemas.Category)
def create_category(category: schemas.CategoryCreate):
    data = category.model_dump()
    res = supabase.table("categories").insert(data).execute()
    return res.data[0]

@app.get("/categories", response_model=List[schemas.Category])
def read_categories(type: Optional[str] = None):
    query = supabase.table("categories").select("*")
    if type:
        query = query.eq("type", type)
    res = query.execute()
    return res.data or []

# --- TRANSACTIONS ---
@app.post("/transactions", response_model=schemas.Transaction)
def create_transaction(transaction: schemas.TransactionCreate):
    data = transaction.model_dump()
    data["date"] = datetime.now().isoformat()
    res = supabase.table("transactions").insert(data).execute()
    return res.data[0]

@app.get("/transactions", response_model=List[schemas.Transaction])
def read_transactions(skip: int = 0, limit: int = 100):
    res = supabase.table("transactions").select("*").order("date", desc=True).range(skip, skip + limit - 1).execute()
    return res.data or []

@app.get("/movements", response_model=List[schemas.AppMovement])
def read_movements(limit: int = 100):
    res = supabase.table("app_movements").select("*").order("created_at", desc=True).limit(limit).execute()
    return res.data or []

@app.get("/dashboard-stats")
def get_dashboard_stats():
    now = datetime.now()
    first_day = datetime(now.year, now.month, 1).isoformat()
    
    res = supabase.table("transactions").select("amount, type, date").gte("date", first_day).execute()
    transactions = res.data or []
    
    income = sum(t["amount"] for t in transactions if t["type"] == "INCOME")
    expenses = sum(t["amount"] for t in transactions if t["type"] == "EXPENSE")
    
    # NEW: Fetch last 3 movements of type VENTA
    res_movements = supabase.table("app_movements").select("*").eq("category", "VENTA").order("created_at", desc=True).limit(3).execute()
    recent_sales = res_movements.data or []
    
    return {
        "income": income,
        "expenses": expenses,
        "balance": income - expenses,
        "month": now.strftime("%B"),
        "recent_sales": recent_sales,
        "chart_data": [] 
    }

# --- PROVISION & STOCK ---
@app.get("/stock", response_model=List[schemas.StockItem])
def read_stock():
    res = supabase.table("stock_items").select("*").order("name").execute()
    return res.data or []

@app.post("/stock", response_model=schemas.StockItem)
def create_stock_item(item: schemas.StockItemCreate):
    # This is now a simple wrapper or we can keep it as is.
    # We'll keep the logic here for single item addition.
    cat_id = None
    try:
        cat_res = supabase.table("categories").select("id").eq("name", "Compra de Mercadería").single().execute()
        if cat_res.data: cat_id = cat_res.data["id"]
    except: pass

    tx_data = {
        "date": datetime.now().isoformat(),
        "amount": item.cost_amount,
        "description": f"Compra Stock: {item.name}",
        "type": "EXPENSE",
        "category_id": cat_id
    }
    tx_res = supabase.table("transactions").insert(tx_data).execute()
    purchase_tx_id = tx_res.data[0]["id"] if tx_res.data else None

    stock_data = item.model_dump()
    stock_data["purchase_tx_id"] = purchase_tx_id
    stock_data["purchase_date"] = datetime.now().isoformat()
    stock_data["quantity"] = stock_data["initial_quantity"]
    stock_data["status"] = "AVAILABLE"
    stock_data.pop("unit_cost", None)
    if not stock_data.get("category_id") or stock_data.get("category_id") == 0:
        stock_data["category_id"] = None

    stock_res = supabase.table("stock_items").insert(stock_data).execute()
    if not stock_res.data:
        raise HTTPException(status_code=400, detail="Failed to create stock item")
    
    log_movement("STOCK", "ALTA", f"Ingreso: {item.name}", {"id": stock_res.data[0]["id"]})
    return stock_res.data[0]

@app.post("/stock/batch")
def create_batch_stock(batch: schemas.BatchStockRequest):
    # 1. Get Expense Category
    cat_id = None
    try:
        cat_res = supabase.table("categories").select("id").eq("name", "Compra de Mercadería").single().execute()
        if cat_res.data: cat_id = cat_res.data["id"]
    except: pass

    processed = []
    for item in batch.items:
        if item.item_id:
            # --- REPLENISHMENT ---
            res = supabase.table("stock_items").select("*").eq("id", item.item_id).single().execute()
            if not res.data: continue
            
            existing = res.data
            # Calculate new quantity (if it was pack, we multiply by size)
            add_qty = item.quantity * (item.pack_size if item.is_pack else 1)
            new_total_qty = existing["quantity"] + add_qty
            
            # Calculate new Weighted Average Cost
            current_unit_cost = existing.get("unit_cost") or 0
            total_inventory_value = (existing["quantity"] * current_unit_cost) + item.cost_amount
            new_unit_cost = total_inventory_value / new_total_qty if new_total_qty > 0 else 0

            # Update Existing Item
            update_data = {
                "quantity": new_total_qty,
                "status": "AVAILABLE"
            }
            if item.selling_price:
                update_data["selling_price"] = item.selling_price
            
            # Note: unit_cost is calculated as a generated column in Supabase (cost_amount / initial_quantity)
            # or it is restricted from manual updates. We calculate PPP for tracking but skip updating that specific column here to avoid 428C9 error.
            
            supabase.table("stock_items").update(update_data).eq("id", item.item_id).execute()
            
            # Create Expense Transaction
            tx_data = {
                "date": datetime.now().isoformat(),
                "amount": item.cost_amount,
                "description": f"Reposición: {existing['name']}" + (f" [{item.brand}]" if item.brand else ""),
                "type": "EXPENSE",
                "category_id": cat_id
            }
            supabase.table("transactions").insert(tx_data).execute()
            
            log_movement(
                "STOCK", "REPOSICION", 
                f"Reposición: {existing['name']} (+{add_qty} unidades)",
                {"product_id": item.item_id, "added": add_qty}
            )
            processed.append({"id": item.item_id, "name": existing["name"], "status": "replenished"})
            
        else:
            # --- NEW PRODUCT ---
            # Create Purchase Transaction
            tx_data = {
                "date": datetime.now().isoformat(),
                "amount": item.cost_amount,
                "description": f"Compra Stock: {item.name}",
                "type": "EXPENSE",
                "category_id": cat_id
            }
            tx_res = supabase.table("transactions").insert(tx_data).execute()
            purchase_tx_id = tx_res.data[0]["id"] if tx_res.data else None
            
            stock_data = item.model_dump()
            stock_data.pop("item_id", None) # Remove item_id as it doesn't exist in stock_items table
            stock_data["purchase_tx_id"] = purchase_tx_id
            stock_data["purchase_date"] = datetime.now().isoformat()
            # quantity is initial_quantity in the base sense
            total_initial = item.quantity * (item.pack_size if item.is_pack else 1)
            stock_data["initial_quantity"] = total_initial
            stock_data["quantity"] = total_initial
            stock_data["status"] = "AVAILABLE"
            
            # Unit cost is handled by Supabase as a generated column (cost_amount / initial_quantity)
            # or it is restricted from manual input. We omit it from the payload to avoid 428C9 error.
            
            stock_res = supabase.table("stock_items").insert(stock_data).execute()
            if stock_res.data:
                log_movement(
                    "STOCK", "ALTA", 
                    f"Ingreso (Batch): {item.name} ({total_initial} unidades)",
                    {"product_id": stock_res.data[0]["id"], "qty": total_initial}
                )
                processed.append({"id": stock_res.data[0]["id"], "name": item.name, "status": "created"})

    return {"status": "success", "processed": processed}

@app.put("/stock/{item_id}", response_model=schemas.StockItem)
def update_stock_item(item_id: int, item: schemas.StockItemCreate):
    data = item.model_dump()
    data.pop("unit_cost", None)
    if not data.get("category_id") or data.get("category_id") == 0:
        data["category_id"] = None
        
    res = supabase.table("stock_items").update(data).eq("id", item_id).execute()
    return res.data[0]

@app.delete("/stock/{item_id}")
def delete_stock_item(item_id: int):
    supabase.table("stock_items").delete().eq("id", item_id).execute()
    return {"status": "deleted"}

# --- BATCH SALES ---
@app.post("/sales")
def create_batch_sale(batch: schemas.BatchSaleRequest):
    cat_id = None
    try:
        cat_res = supabase.table("categories").select("id").eq("name", "Venta de Bebidas").single().execute()
        if cat_res.data: cat_id = cat_res.data["id"]
    except: pass
    
    total_sale_amount = 0.0
    processed_items = []
    
    for s_item in batch.items:
        res = supabase.table("stock_items").select("*").eq("id", s_item.item_id).single().execute()
        product = res.data
        if not product: raise HTTPException(status_code=404, detail=f"Producto {s_item.item_id} no encontrado")
        
        if s_item.is_pack:
            # Usar pack_price si existe, sino calcular (selling_price * pack_size)
            price = product.get("pack_price") or ((product.get("selling_price") or 0) * (product.get("pack_size") or 1))
            deduct_qty = s_item.quantity * (product.get("pack_size") or 1)
        else:
            price = product.get("selling_price") or 0
            deduct_qty = s_item.quantity
            
        item_total = price * s_item.quantity
        total_sale_amount += item_total
        processed_items.append({
            "product": product, 
            "quantity": s_item.quantity, 
            "deduct_qty": deduct_qty, 
            "total": item_total,
            "is_pack": s_item.is_pack
        })

    # Create Income Transaction
    tx_data = {
        "date": datetime.now().isoformat(),
        "amount": total_sale_amount,
        "description": f"Venta: {batch.description}",
        "type": "INCOME",
        "category_id": cat_id
    }
    tx_res = supabase.table("transactions").insert(tx_data).execute()
    main_tx_id = tx_res.data[0]["id"] if tx_res.data else None
    
    # Record and update
    for p in processed_items:
        sale_data = {
            "stock_item_id": p["product"]["id"],
            "quantity": p["quantity"],
            "description": f"{batch.description} ({'PACK' if p.get('is_pack') else 'UNID'})",
            "sale_price_total": p["total"],
            "sale_tx_id": main_tx_id
        }
        supabase.table("sales").insert(sale_data).execute()
        
        new_qty = p["product"]["quantity"] - p.get("deduct_qty", p["quantity"])
        supabase.table("stock_items").update({
            "quantity": new_qty,
            "status": "DEPLETED" if new_qty <= 0 else "AVAILABLE"
        }).eq("id", p["product"]["id"]).execute()
        
    # Log movement
    log_movement(
        "VENTA", "VENTA_LOTE", 
        f"Venta realizada: {batch.description} - Total: ${total_sale_amount:,.2f}",
        {"total": total_sale_amount, "items_count": len(batch.items)}
    )
        
    return {"status": "success", "total": total_sale_amount}

# --- FINANCES ---
@app.get("/finances/summary")
def get_finance_summary(month: int, year: int):
    start_date = date(year, month, 1).isoformat()
    end_date = date(year + 1, 1, 1).isoformat() if month == 12 else date(year, month + 1, 1).isoformat()
        
    res = supabase.table("transactions").select("amount, type").gte("date", start_date).lt("date", end_date).execute()
    txs = res.data or []
    
    income = sum(t["amount"] for t in txs if t["type"] == "INCOME")
    expense = sum(t["amount"] for t in txs if t["type"] == "EXPENSE")
    
    return {"total_income": income, "total_expense": expense, "net_balance": income - expense}

@app.get("/expenses", response_model=List[schemas.ExpenseDocument])
def read_expenses(month: int, year: int):
    res = supabase.table("expense_documents").select("*").execute()
    return res.data or []

@app.post("/expenses/upload")
async def upload_expense(
    description: str = Form(...),
    amount: float = Form(...),
    date: str = Form(...),
    file: UploadFile = File(...)
):
    # Save Local (Vercel has limited persistence, so this is temporary)
    file_id = str(uuid.uuid4())[:8]
    ext = file.filename.split(".")[-1]
    filename = f"{file_id}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    doc_data = {"description": description, "amount": amount, "date": date, "file_path": filepath, "file_type": ext}
    res = supabase.table("expense_documents").insert(doc_data).execute()
    
    log_movement(
        "FINANZAS", "GASTO", 
        f"Comprobante cargado: {description} - ${amount:,.2f}",
        {"amount": amount, "file_id": file_id}
    )
    
    return res.data[0]

# --- SEED & RESET ---
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
    res = supabase.table("categories").upsert(categories, on_conflict="name").execute()
    log_movement("SISTEMA", "CONFIG", "Categorías inicializadas o actualizadas")
    return {"status": "success", "data": res.data}

@app.api_route("/reset-db", methods=["GET", "POST"])
def reset_db_placeholder():
    return {"message": "Usa la consola de Supabase con el archivo schema.sql para resetear la base."}

# --- REPORTING ---
@app.get("/reports/accounting/pdf")
def generate_accounting_report(month: int, year: int):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    
    start_date = date(year, month, 1).isoformat()
    end_date = date(year + 1, 1, 1).isoformat() if month == 12 else date(year, month + 1, 1).isoformat()
    
    res = supabase.table("transactions").select("*").gte("date", start_date).lt("date", end_date).execute()
    transactions = res.data or []
    
    tx_rows = []
    total_inc = total_exp = 0.0
    for tx in transactions:
        tx_rows.append([tx["date"][:10], tx.get("description", "")[:40], tx["type"], f"${tx['amount']:,.2f}"])
        if tx["type"] == "INCOME": total_inc += tx["amount"]
        else: total_exp += tx["amount"]
        
    filename = f"Reporte_{year}_{month}.pdf"
    filepath = os.path.join("/tmp", filename)
    doc = SimpleDocTemplate(filepath, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    elements.append(Paragraph(f"<b>NovaManager Commercial - Reporte Financiero</b>", styles['Title']))
    elements.append(Paragraph(f"Período: {month}/{year}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    if tx_rows:
        t = Table([["Fecha", "Descripción", "Tipo", "Monto"]] + tx_rows, colWidths=[80, 200, 60, 100])
        t.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,0), colors.grey), ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke), ('GRID', (0,0), (-1,-1), 1, colors.black)]))
        elements.append(t)
    
    elements.append(Spacer(1, 40))
    elements.append(Paragraph(f"TOTAL INGRESOS: ${total_inc:,.2f}", styles['Normal']))
    elements.append(Paragraph(f"TOTAL EGRESOS: ${total_exp:,.2f}", styles['Normal']))
    elements.append(Paragraph(f"<b>BALANCE NETO: ${(total_inc - total_exp):,.2f}</b>", styles['Heading1']))
    
    doc.build(elements)
    
    log_movement(
        "SISTEMA", "REPORTE", 
        f"Generado Reporte PDF Período {month}/{year}",
        {"month": month, "year": year}
    )
    
    return FileResponse(filepath, filename=filename, media_type='application/pdf')
