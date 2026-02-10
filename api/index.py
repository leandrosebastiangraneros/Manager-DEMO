import sys
import os
import traceback

# 1. Add backend to path
current_dir = os.path.dirname(__file__)
backend_dir = os.path.join(current_dir, '..', 'backend')
sys.path.append(backend_dir)

# 2. Try to import the Real App
try:
    from main import app
except Exception as e_main:
    error_trace_main = traceback.format_exc()
    
    # 3. Try to import FastAPI for Emergency App
    try:
        from fastapi import FastAPI
        from fastapi.responses import PlainTextResponse
        
        app = FastAPI(title="Emergency Failover")
        
        @app.get("/{path:path}")
        def catch_all(path: str):
            return PlainTextResponse(f"CRITICAL BACKEND ERROR\n\nMain App Import Failed:\n{error_trace_main}")

    except ImportError:
        # 4. Ultimate Fallback: Raw WSGI (No dependecies required)
        # If FastAPI is missing, we use standard WSGI to print the error.
        def app(environ, start_response):
            status = '500 Internal Server Error'
            output = f"CRITICAL: FastAPI module not found.\n\nTraceback:\n{error_trace_main}".encode('utf-8')
            response_headers = [('Content-type', 'text/plain'), ('Content-Length', str(len(output)))]
            start_response(status, response_headers)
            return [output]

