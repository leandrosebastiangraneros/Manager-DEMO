from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class CategoryBase(BaseModel):
    name: str
    type: str = "PRODUCT" # PRODUCT, INCOME, EXPENSE

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int
    class Config:
        from_attributes = True

class TransactionBase(BaseModel):
    amount: float
    description: str
    type: str # INCOME, EXPENSE
    category_id: int

class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    id: int
    date: datetime
    class Config:
        from_attributes = True

# --- MULTI-FORMAT PACKS ---
class StockItemFormatBase(BaseModel):
    pack_size: float
    pack_price: float
    label: Optional[str] = None

class StockItemFormatCreate(StockItemFormatBase):
    stock_item_id: Optional[int] = None

class StockItemFormat(StockItemFormatBase):
    id: int
    stock_item_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class StockItemBase(BaseModel):
    name: str
    brand: Optional[str] = None
    is_pack: bool = False
    pack_size: float = 1.0
    cost_amount: float
    initial_quantity: float
    selling_price: Optional[float] = None
    pack_price: Optional[float] = None
    category_id: Optional[int] = None

class StockItemCreate(StockItemBase):
    pass

class StockItem(StockItemBase):
    id: int
    quantity: float
    unit_cost: float
    purchase_date: datetime
    status: str
    purchase_tx_id: Optional[int] = None
    formats: List[StockItemFormat] = []
    class Config:
        from_attributes = True

class BatchStockItem(BaseModel):
    item_id: Optional[int] = None # Si es replenishment
    name: str
    brand: Optional[str] = None
    is_pack: bool = False
    pack_size: float = 1.0
    cost_amount: float # Costo de la carga/lote
    quantity: float # Cantidad de la carga (unid o packs)
    selling_price: Optional[float] = None
    category_id: Optional[int] = None
    formats: Optional[List[StockItemFormatBase]] = []

class BatchStockRequest(BaseModel):
    items: List[BatchStockItem]
    description: Optional[str] = "Ingreso de Mercadería en Lote"

class MaterialUsageBase(BaseModel):
    stock_item_id: int
    quantity: float
    description: str

class MaterialUsageCreate(MaterialUsageBase):
    pass

class MaterialUsage(MaterialUsageBase):
    id: int
    date: datetime
    sale_price_total: Optional[float] = None
    sale_tx_id: Optional[int] = None
    class Config:
        from_attributes = True
class BatchSaleItem(BaseModel):
    item_id: int
    quantity: float
    is_pack: bool = False
    format_id: Optional[int] = None # ID del formato específico si is_pack es True

class BatchSaleRequest(BaseModel):
    items: List[BatchSaleItem]
    description: str

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

# --- ACTIVITY LOG (MOVEMENTS) ---
class AppMovementBase(BaseModel):
    category: str # STOCK, VENTA, FINANZAS, SISTEMA
    action: str   # ALTA, VENTA, REPORTE, GASTO
    description: str
    metadata: Optional[Dict[str, Any]] = {}

class AppMovementCreate(AppMovementBase):
    pass

class AppMovement(AppMovementBase):
    id: int
    created_at: datetime
    stock_item_id: Optional[int] = None
    transaction_id: Optional[int] = None
    sale_id: Optional[int] = None
    class Config:
        from_attributes = True
