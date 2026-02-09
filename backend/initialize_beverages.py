import sys
import os

# Añadir el directorio actual al path para importar modelos y base
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
from models import Category, Base

def initialize():
    # Asegurar que las tablas existen
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Borrar categorías existentes para empezar de cero (opcional, pero pedido por el usuario)
        print("Limpiando categorías antiguas...")
        db.query(Category).delete()
        db.commit()

        # Nuevas categorías de productos
        beverage_categories = [
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

        print("Insertando categorías de bebidas...")
        for cat_data in beverage_categories:
            cat = Category(**cat_data)
            db.add(cat)
        
        db.commit()
        print("¡Categorías inicializadas con éxito!")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    initialize()
