from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CategoryBase(BaseModel):
    name: str
    type: str

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int
    class Config:
        from_attributes = True

class TransactionBase(BaseModel):
    amount: float
    description: str
    type: str # INCOME / EXPENSE
    is_invoiced: bool = False
    category_id: Optional[int] = None

class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    id: int
    date: datetime
    category: Optional[Category] = None
    
    class Config:
        from_attributes = True

# --- STOCK ---
class StockItemBase(BaseModel):
    name: str

class StockItemCreate(StockItemBase):
    cost_amount: float
    initial_quantity: float

class StockItemSell(BaseModel):
    quantity: float
    sale_price_unit: float
    work_description: str

class StockUsageCreate(BaseModel):
    employee_id: Optional[int] = None
    quantity: float
    description: Optional[str] = None

class MaterialUsage(BaseModel):
    id: int
    stock_item_id: int
    employee_id: Optional[int] = None
    quantity: float
    date: datetime
    description: Optional[str] = None
    sale_price_total: Optional[float] = None
    
    class Config:
        from_attributes = True

class StockItem(StockItemBase):
    id: int
    cost_amount: float
    initial_quantity: float
    quantity: float
    unit_cost: float
    purchase_date: datetime
    status: str
    usages: List[MaterialUsage] = []
    
    class Config:
        from_attributes = True

# --- EMPLOYEES ---
class AdvanceBase(BaseModel):
    amount: float
    description: Optional[str] = None
    date: Optional[datetime] = None

class AdvanceCreate(AdvanceBase):
    pass

class Advance(AdvanceBase):
    id: int
    employee_id: int
    is_settled: bool
    date: datetime
    class Config:
        from_attributes = True

class EmployeeGroupBase(BaseModel):
    name: str

class EmployeeGroupCreate(EmployeeGroupBase):
    pass

class EmployeeRecordBase(BaseModel):
    meters: float
    date: Optional[datetime] = None

class EmployeeBase(BaseModel):
    name: str
    group_id: Optional[int] = None

class EmployeeCreate(EmployeeBase):
    pass

class PayrollRecord(EmployeeRecordBase):
    id: int
    employee_id: int
    total_amount: float
    is_paid: bool
    class Config:
        from_attributes = True

class Employee(EmployeeBase):
    id: int
    records: List[PayrollRecord] = []
    advances: List[Advance] = []
    class Config:
        from_attributes = True

class EmployeeGroup(EmployeeGroupBase):
    id: int
    employees: List[Employee] = []
    class Config:
        from_attributes = True

# --- HISTORY ---
class TripEmployeeHistory(BaseModel):
    trip_id: int
    date: datetime
    trip_description: str
    meters_done: float
    historical_price: float
    total_earned: float
    class Config:
        from_attributes = True

class AttendanceHistory(BaseModel):
    date: datetime
    is_present: bool
    class Config:
        from_attributes = True

class EmployeeHistory(BaseModel):
    employee_id: int
    name: str
    records: List[PayrollRecord] = [] # Legacy
    advances: List[Advance] = []
    material_usages: List[MaterialUsage] = []
    
    # New Fields
    trip_assignments: List[TripEmployeeHistory] = []
    attendance_log: List[AttendanceHistory] = []
    
    # Computed Financials
    balance_earned: float = 0.0 # Total Earned (Trips)
    balance_advances: float = 0.0 # Total Advances
    net_payable: float = 0.0 # Earned - Advances

    class Config:
        from_attributes = True

# --- NOVA MANAGER 2.0 SCHEMAS ---

class SystemConfigBase(BaseModel):
    key: str
    value: str

class SystemConfig(SystemConfigBase):
    updated_at: datetime
    class Config:
        from_attributes = True

class DailyAttendanceCreate(BaseModel):
    employee_id: int
    is_present: bool
    date: Optional[datetime] = None

    class Config:
        from_attributes = True

class DailyAttendance(DailyAttendanceCreate):
    id: int
    class Config:
        from_attributes = True

# --- VEHICLES (FLEET COMMAND) ---
class VehicleBase(BaseModel):
    name: str
    plate: str
    type: str
    status: str = "OPERATIONAL"

class VehicleCreate(VehicleBase):
    last_service_date: Optional[datetime] = None
    next_service_km: Optional[float] = None
    current_km: Optional[float] = 0.0

class Vehicle(VehicleCreate):
    id: int
    class Config:
        from_attributes = True

# 3. Work Trips (Salidas)
class TripEmployeeBase(BaseModel):
    employee_id: int
    is_present: bool = True # En la salida generalmente van presentes

class TripEmployee(TripEmployeeBase):
    id: int
    meters_done: float
    total_earned: float
    historical_price: float
    class Config:
        from_attributes = True

class TripMaterialBase(BaseModel):
    stock_item_id: int
    quantity_out: float

class TripMaterial(TripMaterialBase):
    id: int
    quantity_returned: float
    quantity_used: float
    class Config:
        from_attributes = True

class WorkTripCreate(BaseModel):
    date: Optional[datetime] = None
    description: str
    vehicle_id: Optional[int] = None
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    employees: List[TripEmployeeBase]
    materials: List[TripMaterialBase]

class WorkTrip(BaseModel):
    id: int
    date: datetime
    description: str
    status: str
    
    vehicle_id: Optional[int] = None
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    
    vehicle: Optional[Vehicle] = None # Nested relation
    
    assignments: List[TripEmployee] = []
    materials: List[TripMaterial] = []
    
    class Config:
        from_attributes = True

class TripEmployeeUpdate(BaseModel):
    id: int
    meters_done: float

class TripMaterialUpdate(BaseModel):
    id: int
    quantity_returned: float

class TripCloseRequest(BaseModel):
    employees: List[TripEmployeeUpdate]
    materials: List[TripMaterialUpdate]
    final_meter_reading: float = 0 # Optional validation
    class Config:
        from_attributes = True

# --- EXPENSES (ARCA) ---
class ExpenseDocumentBase(BaseModel):
    description: str
    amount: float
    date: Optional[datetime] = None

class ExpenseDocumentCreate(ExpenseDocumentBase):
    pass

class ExpenseDocument(ExpenseDocumentBase):
    id: int
    file_path: str
    file_type: str
    class Config:
        from_attributes = True
