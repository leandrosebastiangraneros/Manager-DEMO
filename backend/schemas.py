from pydantic import BaseModel
from typing import List, Optional
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

class StockItemBase(BaseModel):
    name: str
    cost_amount: float
    initial_quantity: float
    selling_price: Optional[float] = None
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
    class Config:
        from_attributes = True

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
