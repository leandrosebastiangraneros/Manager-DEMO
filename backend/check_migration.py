import sys
from sqlalchemy import create_engine, text, inspect

SQLALCHEMY_DATABASE_URL = "sqlite:///./novamanager.db"

try:
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    needed = ['system_config', 'work_trips', 'trip_employees', 'trip_materials', 'accounting_documents']
    
    print("--- VERIFICACION MIGRACION ---")
    all_ok = True
    for t in needed:
        if t in tables:
            print(f"[OK] Tabla '{t}' creada.")
        else:
            print(f"[ERROR] Tabla '{t}' NO encontrada.")
            all_ok = False
            
    if all_ok:
        print("\nMigración exitosa: Todas las tablas nuevas existen.")
    else:
        print("\nMigración incompleta: Faltan tablas.")

except Exception as e:
    print(f"FATAL: {e}")
