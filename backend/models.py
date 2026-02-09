from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    type = Column(String) # "INCOME" or "EXPENSE"
    
    transactions = relationship("Transaction", back_populates="category")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime(timezone=True), server_default=func.now())
    amount = Column(Float)
    description = Column(String)
    type = Column(String) # "INCOME" or "EXPENSE"
    is_invoiced = Column(Boolean, default=False)
    
    category_id = Column(Integer, ForeignKey("categories.id"))
    category = relationship("Category", back_populates="transactions")

class StockItem(Base):
    __tablename__ = "stock_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    
    # Cost (Purchase)
    cost_amount = Column(Float) # Total cost of batch
    initial_quantity = Column(Float, default=1.0)
    quantity = Column(Float, default=1.0) # Current available
    unit_cost = Column(Float, default=0.0)
    
    purchase_date = Column(DateTime(timezone=True), server_default=func.now())
    
    # Status (AVAILABLE, DEPLETED)
    status = Column(String, default="AVAILABLE") 
    
    # Link to financial purchase transaction
    purchase_tx_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    purchase_tx = relationship("Transaction", foreign_keys=[purchase_tx_id])
    
    usages = relationship("MaterialUsage", back_populates="stock_item")

class MaterialUsage(Base):
    __tablename__ = "material_usages"
    id = Column(Integer, primary_key=True, index=True)
    stock_item_id = Column(Integer, ForeignKey("stock_items.id"))
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    
    quantity = Column(Float)
    date = Column(DateTime(timezone=True), server_default=func.now())
    description = Column(String, nullable=True)
    
    # For sales
    sale_price_total = Column(Float, nullable=True)
    sale_tx_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)

    stock_item = relationship("StockItem", back_populates="usages")
    employee = relationship("Employee")
    sale_tx = relationship("Transaction")

class EmployeeGroup(Base):
    __tablename__ = "employee_groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    employees = relationship("Employee", back_populates="group", cascade="all, delete-orphan")

class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    group_id = Column(Integer, ForeignKey("employee_groups.id"))
    
    group = relationship("EmployeeGroup", back_populates="employees")
    records = relationship("PayrollRecord", back_populates="employee", cascade="all, delete-orphan")
    advances = relationship("Advance", back_populates="employee", cascade="all, delete-orphan")
    material_usages = relationship("MaterialUsage", back_populates="employee", cascade="all, delete-orphan")

class Advance(Base):
    __tablename__ = "advances"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    amount = Column(Float)
    date = Column(DateTime(timezone=True), server_default=func.now())
    description = Column(String, nullable=True)
    is_settled = Column(Boolean, default=False) # True if subtracted from payroll
    
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    
    employee = relationship("Employee", back_populates="advances")
    transaction = relationship("Transaction")

class PayrollRecord(Base):
    __tablename__ = "payroll_records"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    date = Column(DateTime(timezone=True), server_default=func.now())
    meters = Column(Float)
    total_amount = Column(Float) # meters * 100,000
    is_paid = Column(Boolean, default=False)
    
    # Financial Link
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    
    employee = relationship("Employee", back_populates="records")
    transaction = relationship("Transaction")

# --- NUEVAS ENTIDADES PARA NOVA MANAGER 2.0 (ARQUITECTO DB) ---

class SystemConfig(Base):
    """
    Almacena configuraciones globales como el 'Precio del Metro'.
    Ej: key='meter_price', value='1500'
    """
    __tablename__ = "system_config"
    key = Column(String, primary_key=True, index=True)
    value = Column(String)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Vehicle(Base):
    """
    Fleet Command: Registro de vehiculos de la empresa.
    """
    __tablename__ = "vehicles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String) # Ej: "Camion 01"
    plate = Column(String, unique=True) # Patente
    type = Column(String) # TRUCK, UTE, VAN, CAR
    status = Column(String, default="OPERATIONAL") # OPERATIONAL, MAINTENANCE, OUT_OF_SERVICE
    
    # Mantenimiento
    last_service_date = Column(DateTime(timezone=True), nullable=True)
    next_service_km = Column(Float, nullable=True)
    current_km = Column(Float, default=0.0)
    
    trips = relationship("WorkTrip", back_populates="vehicle")

class WorkTrip(Base):
    """
    Representa una 'Salida' o 'Viaje'.
    Es el contenedor principal de la lógica diaria.
    """
    __tablename__ = "work_trips"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime(timezone=True), server_default=func.now())
    description = Column(String) # Ej: "Obra Barrio San Martín"
    status = Column(String, default="OPEN") # OPEN (En curso), CLOSED (Cerrado/Pagado)
    
    # Fleet Management
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    
    # Live Ops (GPS fake/real Coordinates)
    destination_lat = Column(Float, nullable=True)
    destination_lng = Column(Float, nullable=True)
    
    # Asistencia y Producción en este viaje
    assignments = relationship("TripEmployee", back_populates="trip", cascade="all, delete-orphan")
    
    # Materiales llevados y devueltos
    materials = relationship("TripMaterial", back_populates="trip", cascade="all, delete-orphan")
    
    vehicle = relationship("Vehicle", back_populates="trips")

class TripEmployee(Base):
    """
    Relación Trabajador-Viaje (Producción).
    Registra cuántos metros hizo una persona específica en un viaje específico.
    """
    __tablename__ = "trip_employees"
    
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("work_trips.id"))
    employee_id = Column(Integer, ForeignKey("employees.id"))
    
    # Asistencia (Presente en el viaje)
    is_present = Column(Boolean, default=True)
    
    # Producción
    meters_done = Column(Float, default=0.0)
    
    # Precio Snapshot: Guarda cuánto valía el metro ESE DÍA.
    historical_price = Column(Float, default=0.0) 
    
    # Totales calculados (meters * historical_price)
    total_earned = Column(Float, default=0.0)
    
    trip = relationship("WorkTrip", back_populates="assignments")
    employee = relationship("Employee")

class TripMaterial(Base):
    """
    Logística de Materiales (Ida y Vuelta).
    Reemplaza la lógica simple de consumo inmediato.
    """
    __tablename__ = "trip_materials"
    
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("work_trips.id"))
    stock_item_id = Column(Integer, ForeignKey("stock_items.id"))
    
    # Control de Stock
    quantity_out = Column(Float, default=0.0)     # Llevado (Carga)
    quantity_returned = Column(Float, default=0.0) # Devuelto (Sobrante)
    quantity_used = Column(Float, default=0.0)     # Calculado: Out - Returned
    
    trip = relationship("WorkTrip", back_populates="materials")
    stock_item = relationship("StockItem")

class ExpenseDocument(Base):
    """
    Módulo ARCA. Registro documental.
    No guarda el archivo, guarda la RUTA.
    """
    __tablename__ = "expense_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime(timezone=True), server_default=func.now())
    
    type = Column(String, default="COMPROBANTE") # FACTURA, REMITO, COMPROBANTE
    description = Column(String)
    amount = Column(Float, default=0.0)
    
    # Ruta local del archivo
    file_path = Column(String) # Ej: "/storage/facturas/2026/01/f-0001.pdf"
    file_type = Column(String)
    
    # Opcional: Vincular a una transacción financiera existente
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    transaction = relationship("Transaction")

class DailyAttendance(Base):
    """
    Registro diario de asistencia (Check-in).
    Permite saber quién vino a trabajar hoy antes de armar los viajes.
    """
    __tablename__ = "daily_attendance"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime(timezone=True), server_default=func.now())
    employee_id = Column(Integer, ForeignKey("employees.id"))
    is_present = Column(Boolean, default=False)
    
    employee = relationship("Employee")
