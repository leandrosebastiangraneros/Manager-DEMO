from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import List
from datetime import datetime, timedelta
import os
import shutil

import models, schemas
import reports
from database import SessionLocal, engine

import logging

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="NovaManager API")

# Security: Restrict CORS to known frontends (dev and prod)
# Security: Restrict CORS to known frontends (dev and prod)
# For initial deployment flexibility, we allow all.Restrict this in strict production.
origins = [
    "http://localhost:5173",
    "http://localhost:5500",
    "http://127.0.0.1:5173",
    "https://leandrosebastiangraneros.github.io",
    "https://portfolio-hazel-five-14.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup Event to Seed Categories
@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        # Check if categories exist
        if db.query(models.Category).count() == 0:
            default_cats = [
                # INCOME
                {"name": "Honorarios / Servicios", "type": "INCOME"},
                {"name": "Venta de Productos", "type": "INCOME"},
                {"name": "Otros Ingresos", "type": "INCOME"},
                # EXPENSES
                {"name": "Monotributo / Impuestos", "type": "EXPENSE"},
                {"name": "Servicios (Luz, Internet)", "type": "EXPENSE"},
                {"name": "Insumos / Materiales", "type": "EXPENSE"},
                {"name": "Viáticos / Transporte", "type": "EXPENSE"},
                {"name": "Publicidad / Marketing", "type": "EXPENSE"},
                {"name": "Alquiler", "type": "EXPENSE"},
                {"name": "Equipamiento", "type": "EXPENSE"},
                {"name": "Suscripciones Software", "type": "EXPENSE"},
                {"name": "Otros Gastos", "type": "EXPENSE"},
            ]
            for cat in default_cats:
                db_cat = models.Category(**cat)
                db.add(db_cat)
            db.commit()
            logger.info("--- Database Seeded with Default Categories ---")
    finally:
        db.close()

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
def read_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).all()

@app.post("/reset-db")
def reset_database(db: Session = Depends(get_db)):
    # Drop all tables and recreate them
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)
    # Re-seed categories
    startup_event()
    return {"message": "Database reset successful"}

# --- TRANSACTIONS ---
@app.post("/transactions", response_model=schemas.Transaction)
def create_transaction(tx: schemas.TransactionCreate, db: Session = Depends(get_db)):
    db_tx = models.Transaction(**tx.model_dump())
    # Set date to now if not provided (handled by server default, but strict mapping might need it)
    # Actually Pydantic won't send it, model uses server_default.
    db.add(db_tx)
    db.commit()
    db.refresh(db_tx)
    return db_tx

@app.get("/transactions", response_model=List[schemas.Transaction])
def read_transactions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Transaction).order_by(models.Transaction.date.desc()).offset(skip).limit(limit).all()

@app.delete("/transactions/{tx_id}")
def delete_transaction(tx_id: int, db: Session = Depends(get_db)):
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(tx)
    db.commit()
    return {"ok": True}

# --- DASHBOARD ---
@app.get("/dashboard-stats")
def dashboard_stats(db: Session = Depends(get_db)):
    now = datetime.now()
    # Start of current month
    start_of_month = datetime(now.year, now.month, 1)
    
    # Get all transactions for this month
    txs = db.query(models.Transaction).filter(models.Transaction.date >= start_of_month).all()
    
    income = sum(t.amount for t in txs if t.type == "INCOME")
    expenses = sum(t.amount for t in txs if t.type == "EXPENSE")
    balance = income - expenses
    
    # Calculate daily data for chart
    # Create a dict of days 1..31 initialized to 0
    import calendar
    days_in_month = calendar.monthrange(now.year, now.month)[1]
    daily_data = {day: {"day": day, "income": 0, "expense": 0} for day in range(1, days_in_month + 1)}
    
    for t in txs:
        day = t.date.day
        if t.type == "INCOME":
            daily_data[day]["income"] += t.amount
        elif t.type == "EXPENSE":
            daily_data[day]["expense"] += t.amount
            
    # Convert to list sorted by day
    chart_data = [daily_data[day] for day in sorted(daily_data.keys())]

    return {
        "income": income,
        "expenses": expenses,
        "balance": balance,
        "month": now.strftime("%B"),
        "chart_data": chart_data
    }

# --- REPORTS ---
@app.get("/reports/monthly")
def download_monthly_report(year: int, month: int, db: Session = Depends(get_db)):
    import calendar
    # 1. Fetch transactions for the month
    start_date = datetime(year, month, 1)
    days_in_month = calendar.monthrange(year, month)[1]
    end_date = datetime(year, month, days_in_month, 23, 59, 59)
    
    txs = db.query(models.Transaction).filter(
        models.Transaction.date >= start_date, 
        models.Transaction.date <= end_date
    ).order_by(models.Transaction.date.asc()).all()
    
    # 2. Calculate stats
    income = sum(t.amount for t in txs if t.type == "INCOME")
    expenses = sum(t.amount for t in txs if t.type == "EXPENSE")
    balance = income - expenses
    
    # Simple Spanish Month Mapping
    spanish_months = {
        1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril", 5: "Mayo", 6: "Junio",
        7: "Julio", 8: "Agosto", 9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
    }
    month_str = f"{spanish_months.get(month, 'Desconocido')} {year}"
    
    # 3. Generate PDF
    pdf_buffer = reports.generate_monthly_pdf(month_str, income, expenses, balance, txs)
    
    # 4. Return StreamingResponse
    filename = f"Reporte_{month}_{year}.pdf"
    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# --- STOCK ---
@app.post("/stock", response_model=schemas.StockItem)
def create_stock_item(item: schemas.StockItemCreate, db: Session = Depends(get_db)):
    # 1. Create Stock Item with Unit Cost calculation
    # cost_amount is total cost of batch
    u_cost = item.cost_amount / item.initial_quantity if item.initial_quantity > 0 else 0
    
    db_item = models.StockItem(
        name=item.name,
        cost_amount=item.cost_amount,
        initial_quantity=item.initial_quantity,
        quantity=item.initial_quantity,
        unit_cost=u_cost,
        status="AVAILABLE"
    )
    db.add(db_item)
    db.flush()
    
    # 2. Automatically Create Expense Transaction
    cat = db.query(models.Category).filter(models.Category.name == "Insumos / Materiales").first()
    if not cat:
        cat = models.Category(name="Insumos / Materiales", type="EXPENSE")
        db.add(cat)
        db.flush()
        
    expense_tx = models.Transaction(
        amount=item.cost_amount,
        description=f"Compra Stock: {item.name} ({item.initial_quantity}u)",
        type="EXPENSE",
        category_id=cat.id,
        is_invoiced=False
    )
    db.add(expense_tx)
    db.flush()
    
    db_item.purchase_tx_id = expense_tx.id
    db.commit()
    db.refresh(db_item)
    return db_item

@app.get("/stock", response_model=List[schemas.StockItem])
def read_stock(db: Session = Depends(get_db)):
    return db.query(models.StockItem).order_by(models.StockItem.purchase_date.desc()).all()

@app.put("/stock/{item_id}/sell", response_model=schemas.StockItem)
def sell_stock_item(item_id: int, sale_data: schemas.StockItemSell, db: Session = Depends(get_db)):
    db_item = db.query(models.StockItem).filter(models.StockItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    if db_item.quantity < sale_data.quantity:
        raise HTTPException(status_code=400, detail="Stock insuficiente")
        
    # 1. Create Usage Record for the Sale
    total_sale = sale_data.quantity * sale_data.sale_price_unit
    
    # 2. Automatically Create Income Transaction
    cat = db.query(models.Category).filter(models.Category.name == "Venta de Productos").first()
    if not cat:
         cat = models.Category(name="Venta de Productos", type="INCOME")
         db.add(cat)
         db.flush()

    income_tx = models.Transaction(
        amount=total_sale,
        description=f"Venta Stock: {db_item.name} ({sale_data.quantity}u) - {sale_data.work_description}",
        type="INCOME",
        category_id=cat.id,
        is_invoiced=False
    )
    db.add(income_tx)
    db.flush()

    # 3. Create Usage Entry
    usage = models.MaterialUsage(
        stock_item_id=item_id,
        quantity=sale_data.quantity,
        description=sale_data.work_description,
        sale_price_total=total_sale,
        sale_tx_id=income_tx.id
    )
    db.add(usage)
    
    # 4. Update Stock Item
    db_item.quantity -= sale_data.quantity
    if db_item.quantity <= 0:
        db_item.status = "DEPLETED"
    
    db.commit()
    db.refresh(db_item)
    return db_item

@app.post("/stock/{item_id}/use", response_model=schemas.MaterialUsage)
def use_stock_item(item_id: int, usage_data: schemas.StockUsageCreate, db: Session = Depends(get_db)):
    db_item = db.query(models.StockItem).filter(models.StockItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    if db_item.quantity < usage_data.quantity:
        raise HTTPException(status_code=400, detail="Stock insuficiente")
        
    # Create Usage Entry
    usage = models.MaterialUsage(
        stock_item_id=item_id,
        employee_id=usage_data.employee_id,
        quantity=usage_data.quantity,
        description=usage_data.description or f"Retirado por personal"
    )
    db.add(usage)
    
    # Update Stock Item
    db_item.quantity -= usage_data.quantity
    if db_item.quantity <= 0:
        db_item.status = "DEPLETED"
        
    db.commit()
    db.refresh(usage)
    return usage

# --- EMPLOYEES & PAYROLL ---

@app.post("/employee-groups", response_model=schemas.EmployeeGroup)
def create_employee_group(group: schemas.EmployeeGroupCreate, db: Session = Depends(get_db)):
    db_group = models.EmployeeGroup(**group.model_dump())
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group

@app.get("/employee-groups", response_model=List[schemas.EmployeeGroup])
def read_employee_groups(db: Session = Depends(get_db)):
    return db.query(models.EmployeeGroup).all()

@app.post("/employees", response_model=schemas.Employee)
def create_employee(emp: schemas.EmployeeCreate, db: Session = Depends(get_db)):
    db_emp = models.Employee(**emp.model_dump())
    db.add(db_emp)
    db.commit()
    db.refresh(db_emp)
    return db_emp

@app.get("/employees", response_model=List[schemas.Employee])
def read_employees(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Employee).offset(skip).limit(limit).all()


@app.delete("/employees/{emp_id}")
def delete_employee(emp_id: int, db: Session = Depends(get_db)):
    db_emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not db_emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    db.delete(db_emp)
    db.commit()
    return {"ok": True}

@app.post("/employees/{empid}/records", response_model=schemas.PayrollRecord)
def add_payroll_record(empid: int, rec: schemas.EmployeeRecordBase, db: Session = Depends(get_db)):
    db_emp = db.query(models.Employee).filter(models.Employee.id == empid).first()
    if not db_emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # 1. Calculate Gross Total (Production value)
    # Get Current Price
    price_config = db.query(models.SystemConfig).filter(models.SystemConfig.key == "meter_price").first()
    try:
        current_price = float(price_config.value) if price_config and price_config.value else 0.0
    except ValueError:
        current_price = 0.0

    gross_total = rec.meters * current_price
    
    # 2. Settle advances based on production
    pending_advances = sorted([a for a in db_emp.advances if not a.is_settled], key=lambda x: x.date)
    total_pending = sum(a.amount for a in pending_advances)
    
    # Calculate Net Total (Cash that MUST be paid today)
    net_total = max(0, gross_total - total_pending)
    
    # Update advances to settled if they are covered by the work
    running_gross = gross_total
    for a in pending_advances:
        if running_gross >= a.amount:
            a.is_settled = True
            running_gross -= a.amount
        else:
            # Partial settlement not supported in current model
            # Advance stays pending if not fully covered
            break
    
    # 3. Create Payroll Record
    db_rec = models.PayrollRecord(
        employee_id=empid,
        meters=rec.meters,
        total_amount=gross_total, # We store the gross production value for reporting
        date=rec.date or datetime.now(),
        is_paid=True
    )
    db.add(db_rec)
    db.flush()
    
    # 4. Create Financial Transaction (EXPENSE) - Record the NET payment
    # This reflects the ACTUAL cash outflow today.
    cat_expense = db.query(models.Category).filter(models.Category.name == "Sueldos / Jornales").first()
    if not cat_expense:
        cat_expense = models.Category(name="Sueldos / Jornales", type="EXPENSE")
        db.add(cat_expense)
        db.flush()
        
    # Transaction description reflects if there was compensation
    desc = f"Pago Jornal: {db_emp.name} ({rec.meters}m)"
    if total_pending > 0:
        desc += f" - [Compensado con Adelantos]"

    tx = models.Transaction(
        amount=net_total,
        description=desc,
        type="EXPENSE",
        category_id=cat_expense.id,
        date=db_rec.date
    )
    db.add(tx)
    db.flush()
    db_rec.transaction_id = tx.id
    
    db.commit()
    db.refresh(db_rec)
    return db_rec
    
    db.commit()
    db.refresh(db_rec)
    return db_rec

@app.post("/employees/{empid}/advances", response_model=schemas.Advance)
def add_employee_advance(empid: int, adv: schemas.AdvanceCreate, db: Session = Depends(get_db)):
    db_emp = db.query(models.Employee).filter(models.Employee.id == empid).first()
    if not db_emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    # 1. Create Advance Entry
    db_adv = models.Advance(
        employee_id=empid,
        amount=adv.amount,
        description=adv.description or f"Adelanto a {db_emp.name}",
        date=adv.date or datetime.now(),
        is_settled=False
    )
    db.add(db_adv)
    db.flush()
    
    # 2. Create Financial Transaction (EXPENSE)
    cat = db.query(models.Category).filter(models.Category.name == "Adelantos / Vales").first()
    if not cat:
        cat = models.Category(name="Adelantos / Vales", type="EXPENSE")
        db.add(cat)
        db.flush()
        
    tx = models.Transaction(
        amount=adv.amount,
        description=f"Adelanto: {db_emp.name} ({adv.description or 'Sin desc.'})",
        type="EXPENSE",
        category_id=cat.id,
        date=db_adv.date
    )
    db.add(tx)
    db.flush()
    
    db_adv.transaction_id = tx.id
    db.commit()
    db.refresh(db_adv)
    return db_adv

@app.get("/employees/{empid}/history", response_model=schemas.EmployeeHistory)
def get_employee_history(empid: int, db: Session = Depends(get_db)):
    db_emp = db.query(models.Employee).filter(models.Employee.id == empid).first()
    if not db_emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # 1. Fetch Trip Assignments (New System)
    trip_assigns = db.query(models.TripEmployee).join(models.WorkTrip).filter(
        models.TripEmployee.employee_id == empid,
        models.WorkTrip.status == "CLOSED" # Only count closed/confirmed trips
    ).all()
    
    history_trips = []
    total_earned = 0.0
    for ta in trip_assigns:
        total_earned += ta.total_earned
        history_trips.append({
            "trip_id": ta.trip.id,
            "date": ta.trip.date,
            "trip_description": ta.trip.description,
            "meters_done": ta.meters_done,
            "historical_price": ta.historical_price,
            "total_earned": ta.total_earned
        })
        
    # 2. Fetch Attendance Log
    attendance = db.query(models.DailyAttendance).filter(
        models.DailyAttendance.employee_id == empid
    ).order_by(models.DailyAttendance.date.desc()).limit(60).all() # Last 60 days
    
    # 3. Calculate Advances (Legacy + New)
    total_advances = sum(a.amount for a in db_emp.advances if not a.is_settled)
    
    return {
        "employee_id": db_emp.id,
        "name": db_emp.name,
        "records": db_emp.records,
        "advances": db_emp.advances,
        "material_usages": db_emp.material_usages,
        
        "trip_assignments": history_trips,
        "attendance_log": attendance,
        
        "balance_earned": total_earned,
        "balance_advances": total_advances,
        "net_payable": total_earned - total_advances
    }

@app.get("/calendar/events")
def get_calendar_events(month: int = None, year: int = None, db: Session = Depends(get_db)):
    """
    Returns finalized trips formatted for calendar view.
    """
    query = db.query(models.WorkTrip).filter(models.WorkTrip.status == "CLOSED")
         
    trips = query.all()
    events = []
    
    for t in trips:
        # Calculate totals for summary
        total_meters = sum(a.meters_done for a in t.assignments)
        total_materials = len(t.materials)
        
        events.append({
            "id": t.id,
            "title": t.description,
            "start": t.date,
            "end": t.date,
            "allDay": True,
            "extendedProps": {
                "meters": total_meters,
                "driver_count": len(t.assignments),
                "materials_count": total_materials
            }
        })
        
    return events

# --- NOVA MANAGER 2.0 ENDPOINTS ---

# 1. System Config (Meter Price)
@app.get("/config/{key}", response_model=schemas.SystemConfig)
def get_system_config(key: str, db: Session = Depends(get_db)):
    config = db.query(models.SystemConfig).filter(models.SystemConfig.key == key).first()
    if not config:
        # Return default if not found
        return schemas.SystemConfig(key=key, value="0", updated_at=datetime.now())
    return config

@app.post("/config", response_model=schemas.SystemConfig)
def set_system_config(config: schemas.SystemConfigBase, db: Session = Depends(get_db)):
    db_config = db.query(models.SystemConfig).filter(models.SystemConfig.key == config.key).first()
    if db_config:
        db_config.value = config.value
    else:
        db_config = models.SystemConfig(key=config.key, value=config.value)
        db.add(db_config)
    
    db.commit()
    db.refresh(db_config)
    return db_config

# 2. Daily Attendance
@app.post("/attendance/bulk", response_model=List[schemas.DailyAttendance])
def save_daily_attendance(attendances: List[schemas.DailyAttendanceCreate], db: Session = Depends(get_db)):
    """
    Recibe una lista de estados (Presente/Ausente) para una fecha.
    Realiza UPSERT: Si ya existe registro para ese empleado y fecha, actualiza. Si no, crea.
    """
    saved_records = []
    
    for item in attendances:
        # Default date to Today if not provided
        target_date = item.date or datetime.now()
        start_of_day = datetime(target_date.year, target_date.month, target_date.day)
        end_of_day = start_of_day + timedelta(days=1)
        
        # Check existing record for this day
        existing = db.query(models.DailyAttendance).filter(
            models.DailyAttendance.employee_id == item.employee_id,
            models.DailyAttendance.date >= start_of_day,
            models.DailyAttendance.date < end_of_day
        ).first()
        
        if existing:
            existing.is_present = item.is_present
            saved_records.append(existing)
        else:
            new_record = models.DailyAttendance(
                employee_id=item.employee_id,
                is_present=item.is_present,
                date=target_date
            )
            db.add(new_record)
            saved_records.append(new_record)
    
    db.commit()
    # Refresh all to get IDs
    for r in saved_records:
        db.refresh(r)
    return saved_records

@app.get("/attendance/{date_str}", response_model=List[schemas.DailyAttendance])
def get_daily_attendance(date_str: str, db: Session = Depends(get_db)):
    """
    Get attendance for a specific date (YYYY-MM-DD).
    If no record exists for an employee, it is NOT returned here (frontend handles 'default false').
    """
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
    start_of_day = datetime(target_date.year, target_date.month, target_date.day)
    end_of_day = start_of_day + timedelta(days=1)
    
    records = db.query(models.DailyAttendance).filter(
        models.DailyAttendance.date >= start_of_day,
        models.DailyAttendance.date < end_of_day
    ).all()
    
    return records

# --- VEHICLES (FLEET COMMAND) ---
@app.post("/vehicles", response_model=schemas.Vehicle)
def create_vehicle(vehicle: schemas.VehicleCreate, db: Session = Depends(get_db)):
    db_vehicle = models.Vehicle(**vehicle.model_dump())
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

@app.get("/vehicles", response_model=List[schemas.Vehicle])
def read_vehicles(db: Session = Depends(get_db)):
    return db.query(models.Vehicle).all()

@app.put("/vehicles/{vehicle_id}", response_model=schemas.Vehicle)
def update_vehicle(vehicle_id: int, updates: schemas.VehicleCreate, db: Session = Depends(get_db)):
    db_vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not db_vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
        
    for key, value in updates.model_dump().items():
        setattr(db_vehicle, key, value)
        
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

@app.put("/vehicles/{vehicle_id}/service", response_model=schemas.Vehicle)
def register_vehicle_service(vehicle_id: int, db: Session = Depends(get_db)):
    db_vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not db_vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
        
    db_vehicle.last_service_date = datetime.now()
    # Reset next service interval (e.g. 10000km more)
    db_vehicle.next_service_km = db_vehicle.current_km + 10000
    db_vehicle.status = "OPERATIONAL"
    
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

# 3. Work Trips (Salida)
@app.post("/trips", response_model=schemas.WorkTrip)
def create_work_trip(trip: schemas.WorkTripCreate, db: Session = Depends(get_db)):
    # 1. Get Current Meter Price Global
    price_config = db.query(models.SystemConfig).filter(models.SystemConfig.key == "meter_price").first()
    try:
        current_price = float(price_config.value) if price_config and price_config.value else 0.0
    except ValueError:
        current_price = 0.0
    
    # 2. Link Vehicle if provided
    if trip.vehicle_id:
        vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == trip.vehicle_id).first()
        if vehicle and vehicle.status != "OPERATIONAL":
            pass # Warning? For now allow but maybe visually flag
    
    # 3. Create the Trip Header
    db_trip = models.WorkTrip(
        date=trip.date or datetime.now(),
        description=trip.description,
        status="OPEN",
        vehicle_id=trip.vehicle_id,
        destination_lat=trip.destination_lat,
        destination_lng=trip.destination_lng
    )
    db.add(db_trip)
    db.flush() # Get ID
    
    # 3. Assign Assignments (People)
    for emp in trip.employees:
        db_assign = models.TripEmployee(
            trip_id=db_trip.id,
            employee_id=emp.employee_id,
            is_present=emp.is_present,
            historical_price=current_price, # Snapshot Price
            meters_done=0.0,
            total_earned=0.0
        )
        db.add(db_assign)
        
    # 4. Assign Materials (Logistics)
    for mat in trip.materials:
        # Check Stock availability (Optional: Allow negative if urgent?)
        # For now, we just record "Llevado - quantity_out"
        db_mat = models.TripMaterial(
            trip_id=db_trip.id,
            stock_item_id=mat.stock_item_id,
            quantity_out=mat.quantity_out,
            quantity_returned=0.0,
            quantity_used=0.0 
        )
        db.add(db_mat)
        
        # Deduct temporary stock? 
        # Strategy: We deduct it from Main Stock immediately. 
        # When returning, we add back the *returned* amount. 
        # Then the net result is correct (Main - Out + Returned = Main - Used).
        stock_item = db.query(models.StockItem).filter(models.StockItem.id == mat.stock_item_id).first()
        if stock_item:
            stock_item.quantity -= mat.quantity_out
    
    db.commit()
    db.refresh(db_trip)
    return db_trip

@app.get("/trips", response_model=List[schemas.WorkTrip])
def get_work_trips(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return db.query(models.WorkTrip).order_by(models.WorkTrip.date.desc()).offset(skip).limit(limit).all()

@app.post("/trips/{trip_id}/close", response_model=schemas.WorkTrip)
def close_work_trip(trip_id: int, close_data: schemas.TripCloseRequest, db: Session = Depends(get_db)):
    # 1. Get Trip
    trip = db.query(models.WorkTrip).filter(models.WorkTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.status == "CLOSED":
        raise HTTPException(status_code=400, detail="Trip already closed")

    # 2. Get Current Price for Snapshot
    price_config = db.query(models.SystemConfig).filter(models.SystemConfig.key == "meter_price").first()
    current_price = float(price_config.value) if price_config else 0.0

    # 3. Process Materials (Logistics) - Add back returned stock
    for mat_update in close_data.materials:
        # Find the trip_material record
        tm = next((m for m in trip.materials if m.id == mat_update.id), None)
        if tm:
            tm.quantity_returned = mat_update.quantity_returned
            tm.quantity_used = max(0, tm.quantity_out - tm.quantity_returned)
            
            # Restore stock
            if tm.stock_item:
                 tm.stock_item.quantity += tm.quantity_returned
    
    # 4. Process Employees (Payroll) - Calculate earnings
    for emp_update in close_data.employees:
        te = next((e for e in trip.assignments if e.id == emp_update.id), None)
        if te:
            te.meters_done = emp_update.meters_done
            te.historical_price = current_price
            te.total_earned = te.meters_done * current_price
            
            # FUTURE: Here we could automatically create 'PayrollRecord' to sync with legacy system
            # but for now we keep it separate as requested in architecture plan.

    # 5. Close Trip
    trip.status = "CLOSED"
    db.commit()
    db.refresh(trip)
    return trip

@app.put("/trips/{trip_id}/progress", response_model=schemas.WorkTrip)
def update_trip_progress(trip_id: int, progress_data: schemas.TripCloseRequest, db: Session = Depends(get_db)):
    # 1. Get Trip
    trip = db.query(models.WorkTrip).filter(models.WorkTrip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.status == "CLOSED":
        raise HTTPException(status_code=400, detail="Trip already closed")

    # 2. Get Current Price (for estimation display, though realized on close)
    price_config = db.query(models.SystemConfig).filter(models.SystemConfig.key == "meter_price").first()
    current_price = float(price_config.value) if price_config else 0.0

    # 3. Process Employees (Update Meters & Potential Earnings)
    for emp_update in progress_data.employees:
        te = next((e for e in trip.assignments if e.id == emp_update.id), None)
        if te:
            te.meters_done = emp_update.meters_done
            # We update the potential earnings display, but actual financial record is on Close
            te.total_earned = te.meters_done * current_price

    # 4. Save (Status remains OPEN)
    db.commit()
    db.refresh(trip)
    return trip

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
