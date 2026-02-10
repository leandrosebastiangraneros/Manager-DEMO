from fastapi import FastAPI
import sys
import os
import traceback

# DIAGNOSIS RESULT:
# CWD is /var/task
# backend is at /var/task/backend

# 1. Add backend to path explicitly using CWD
current_dir = os.getcwd() # /var/task
backend_dir = os.path.join(current_dir, 'backend')

if backend_dir not in sys.path:
    sys.path.append(backend_dir)

# 2. Try to import the Real App
try:
    from main import app
except Exception as e_main:
    error_trace_main = traceback.format_exc()
    
    # 3. Emergency App if Main Fails
    app = FastAPI(title="Emergency Failover")
    
    @app.get("/api/health")
    def health_explicit():
        return emergency_status()

    @app.get("/health")
    def health():
        return emergency_status()
    
    @app.get("/{path:path}")
    def catch_all(path: str):
        return emergency_status()
        
    def emergency_status():
        return {
            "status": "CRITICAL_BOOT_ERROR", 
            "detail": "Failed to import 'main' from 'backend'.",
            "error_message": str(e_main),
            "traceback": error_trace_main,
            "sys_path": str(sys.path),
            "cwd": current_dir,
            "backend_dir_exists": os.path.exists(backend_dir)
        }

