from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, func
from sqlalchemy.orm import relationship
from database import Base

class Category(Base):
    """
    Categorías de productos o transacciones. 
    Ej: "Cervezas", "Gaseosas", "Gasto Fijo".
    """
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    type = Column(String, default="PRODUCT") # PRODUCT, INCOME, EXPENSE
    
    # Relaciones
    products = relationship("StockItem", back_populates="category")
    transactions = relationship("Transaction", back_populates="category")

class Transaction(Base):
    """
    Registro contable básico (Ingresos y Egresos).
    """
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime(timezone=True), server_default=func.now())
    amount = Column(Float)
    description = Column(String)
    type = Column(String) # INCOME, EXPENSE
    
    category_id = Column(Integer, ForeignKey("categories.id"))
    category = relationship("Category", back_populates="transactions")

class StockItem(Base):
    """
    Inventario de productos.
    """
    __tablename__ = "stock_items"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    
    # Financials
    cost_amount = Column(Float, default=0.0)    # Costo total de la compra
    initial_quantity = Column(Float, default=0.0)
    quantity = Column(Float, default=0.0)        # Stock actual
    unit_cost = Column(Float, default=0.0)      # cost_amount / initial_quantity
    
    selling_price = Column(Float, nullable=True) # Precio de venta al público
    
    purchase_date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="AVAILABLE") # AVAILABLE, DEPLETED, RESERVED
    
    # Relaciones
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    category = relationship("Category", back_populates="products")
    
    # Traceability
    purchase_tx_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    usages = relationship("MaterialUsage", back_populates="stock_item")

class MaterialUsage(Base):
    """
    Registro de 'Salida' de stock (Ventas o Desperdicio).
    """
    __tablename__ = "material_usages"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime(timezone=True), server_default=func.now())
    
    stock_item_id = Column(Integer, ForeignKey("stock_items.id"))
    quantity = Column(Float)
    description = Column(String) # Ej: "Venta Cliente X"
    
    # Venta Snapshopt
    sale_price_total = Column(Float, nullable=True) # quantity * selling_price at that time
    sale_tx_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    
    stock_item = relationship("StockItem", back_populates="usages")

class ExpenseDocument(Base):
    """
    Módulo ARCA. Registro documental de gastos.
    """
    __tablename__ = "expense_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime(timezone=True), server_default=func.now())
    
    type = Column(String, default="COMPROBANTE") # FACTURA, REMITO, COMPROBANTE
    description = Column(String)
    amount = Column(Float, default=0.0)
    
    file_path = Column(String)
    file_type = Column(String)
    
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    transaction = relationship("Transaction")
