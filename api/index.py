from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
import sys
import os
import traceback

# --- VERCEL ENTRYPOINT (ALWAYS ALIVE) ---
app = FastAPI(title="Vercel Wrapper")

# Helper to load backend dynamically
def get_backend_app():
    try:
        current_dir = os.getcwd() # /var/task
        backend_dir = os.path.join(current_dir, 'backend')
        if backend_dir not in sys.path:
            sys.path.append(backend_dir)
            
        from main import app as backend
        return backend, None
    except Exception as e:
        return None, traceback.format_exc()

@app.get("/api/health")
@app.get("/health")
async def health_check():
    backend, error = get_backend_app()
    
    status = {
        "status": "WRAPPER_ONLINE",
        "backend_status": "LOADED" if backend else "FAILED",
        "cwd": os.getcwd(),
        "sys_path": str(sys.path)
    }
    
    if error:
        status["error_trace"] = error
        
    # If backend loaded, try to get its health
    if backend:
        try:
            # We can't easily call backend's health check object directly strictly speaking
            # without simulating a request, but we can check if it exists
            return status
        except:
            pass
            
    return status

# Catch-all to forward requests to backend if loaded
@app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def catch_all(request: Request, path_name: str):
    backend, error = get_backend_app()
    
    if backend:
        # Forward request to the loaded backend app
        # Note: We are inside the wrapper app.
        scope = request.scope
        # Update path to match what backend expects (if needed)
        # But backend is mounted differently. 
        # The cleanest way is to call the backend app as an ASGI callable.
        
        async def receive():
            return await request.receive()
            
        # Capture response
        class ResponseCapturer:
            def __init__(self):
                self.status_code = 200
                self.headers = []
                self.body = b""
                
            async def send(self, message):
                if message["type"] == "http.response.start":
                    self.status_code = message["status"]
                    self.headers = message.get("headers", [])
                elif message["type"] == "http.response.body":
                    self.body += message.get("body", b"")

        capturer = ResponseCapturer()
        await backend(scope, receive, capturer.send)
        
        return Response(
            content=capturer.body, 
            status_code=capturer.status_code, 
            headers=dict(capturer.headers)
        )
    
    # If backend failed to load
    return JSONResponse(
        status_code=500,
        content={
            "error": "Backend functionality unavailable",
            "detail": error
        }
    )

