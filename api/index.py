from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
import os
import sys

# Minimal Diagnostic App
app = FastAPI()

@app.get("/api/health")
def health():
    return debug_info()

@app.get("/api/{catchall:path}")
def catch_all(catchall: str):
    return debug_info()

def debug_info():
    try:
        current_dir = os.getcwd()
        files_current = str(os.listdir(current_dir))
        
        # Check parent/backend
        path_parent = os.path.join(current_dir, '..')
        files_parent = "ACCESSIBLE"
        try:
            files_parent = str(os.listdir(path_parent))
        except:
            files_parent = "ERROR_READING_PARENT"
            
        path_backend = os.path.join(path_parent, 'backend')
        files_backend = "BACKEND_NOT_FOUND"
        if os.path.exists(path_backend):
            try:
                files_backend = str(os.listdir(path_backend))
            except:
                files_backend = "ERROR_READING_BACKEND"
        
        sys_path = str(sys.path)
        
        return {
            "status": "DIAGNOSTIC_MODE",
            "message": "API Function is Running!",
            "filesystem": {
                "cwd": current_dir,
                "files_cwd": files_current,
                "files_parent": files_parent,
                "files_backend": files_backend
            },
            "sys_path": sys_path
        }
    except Exception as e:
        return {"status": "CRITICAL_DIAGNOSTIC_FAILURE", "error": str(e)}

