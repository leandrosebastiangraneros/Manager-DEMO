"""
API Key authentication middleware.

Protects all endpoints except public ones (health checks).
Configure via API_SECRET_KEY environment variable.
"""

import os
from fastapi import Request  # type: ignore
from fastapi.responses import JSONResponse  # type: ignore
from starlette.middleware.base import BaseHTTPMiddleware  # type: ignore

# Public paths that don't require authentication
PUBLIC_PATHS = {
    "/ping",
    "/health",
    "/api/wrapper-health",
    "/openapi.json",
    "/docs",
    "/redoc",
}

API_SECRET_KEY = os.getenv("API_SECRET_KEY", "")


class ApiKeyMiddleware(BaseHTTPMiddleware):
    """
    Middleware that validates X-API-Key header on all non-public endpoints.

    If API_SECRET_KEY is not set (empty string), auth is DISABLED
    (dev mode). This allows local development without config.
    """

    async def dispatch(self, request: Request, call_next):
        # Skip auth if no key is configured (dev mode)
        if not API_SECRET_KEY:
            return await call_next(request)

        # Skip auth for public paths
        path = request.url.path.rstrip("/")
        if path in PUBLIC_PATHS:
            return await call_next(request)

        # Skip preflight CORS requests
        if request.method == "OPTIONS":
            return await call_next(request)

        # Validate API key
        api_key = request.headers.get("X-API-Key", "")
        if api_key != API_SECRET_KEY:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or missing API key"},
            )

        return await call_next(request)
