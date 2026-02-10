import sys
import os

# Añadimos la carpeta 'backend' al path para poder importar main
current_dir = os.path.dirname(__file__)
backend_dir = os.path.join(current_dir, '..', 'backend')
sys.path.append(backend_dir)

try:
    from main import app
except Exception as e:
    # FALLBACK EMERGENCY APP
    # If main fails to import (missing deps, path errors), we serve this app
    # to display the error instead of crashing with 500.
    from fastapi import FastAPI
    import traceback
    
    app = FastAPI(title="Emergency Failover")
    
    error_msg = f"Failed to start backend: {str(e)}\n\nTraceback:\n{traceback.format_exc()}"
    
    @app.get("/api/{path:path}")
    def catch_all(path: str):
        return {"status": "CRITICAL_ERROR", "detail": error_msg}

    @app.get("/")
    def root():
        return {"status": "CRITICAL_ERROR", "detail": error_msg}

