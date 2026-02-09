import sys
from sqlalchemy import create_engine, text, inspect

# Hardcoded DB URL for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./novamanager.db"

print("--- DIAGNOSTICO DE ESQUEMA ---")
try:
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Tablas encontradas: {tables}")
    
    if "categories" in tables:
        print("OK: Tabla 'categories' existe.")
        cols = [c['name'] for c in inspector.get_columns("categories")]
        print(f"Columnas en categories: {cols}")
    else:
        print("ERROR: Tabla 'categories' NO existe.")

except Exception as e:
    print(f"\nFATAL ERROR: {e}")
    import traceback
    traceback.print_exc()
