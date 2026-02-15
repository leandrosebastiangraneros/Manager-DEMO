"""
SupabaseLite — Lightweight async Supabase REST client using httpx.

Provides a unified QueryBuilder for all operations (select, insert, update,
upsert, delete) with consistent filter chaining.
"""

import os
from typing import Any, Optional
import httpx  # type: ignore
from dotenv import load_dotenv  # type: ignore

load_dotenv()

SUPABASE_URL = (
    os.getenv("SUPABASE_URL")
    or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    or ""
)
SUPABASE_KEY = (
    os.getenv("SUPABASE_KEY")
    or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    or ""
)

# ─── Response Wrapper ────────────────────────────────────────────────────────

class SupabaseResponse:
    """Wraps the httpx response into a convenient .data / .error interface."""

    def __init__(self, response: httpx.Response):
        self._response = response
        self.status_code = response.status_code
        self.data: list[Any] | dict[str, Any] | Any = []
        self.error: Optional[dict[str, Any]] = None

        if 200 <= response.status_code < 300:
            try:
                self.data = response.json()
            except Exception:
                self.data = []
            self.error = None
        else:
            self.data = []
            try:
                self.error = response.json()
            except Exception:
                self.error = {"message": response.text, "code": response.status_code}

    def __bool__(self):
        return self.error is None

    def __repr__(self):
        return f"<SupabaseResponse status={self.status_code} data_count={len(self.data) if isinstance(self.data, list) else 1}>"


# ─── Unified Query Builder ───────────────────────────────────────────────────

# ─── Unified Query Builder ───────────────────────────────────────────────────

class QueryBuilder:
    """
    Unified builder for all Supabase REST operations.
    """

    def __init__(self, supabase_instance, url: str, headers: dict, table_name: str):
        self._sb = supabase_instance
        self._base_url = f"{url}/rest/v1/{table_name}"
        self._headers = dict(headers)
        self._params: dict[str, str] = {}
        self._method = "GET"
        self._body: Any = None
        self._is_single = False
        self._is_count = False

    # ── Operation Setters ─────────────────────────────────────────────────

    def select(self, columns: str = "*"):
        self._method = "GET"
        self._params["select"] = columns
        return self

    def insert(self, data):
        self._method = "POST"
        self._body = data
        self._headers["Prefer"] = "return=representation"
        return self

    def update(self, data: dict):
        self._method = "PATCH"
        self._body = data
        self._headers["Prefer"] = "return=representation"
        return self

    def upsert(self, data, on_conflict: str = ""):
        self._method = "POST"
        self._body = data
        prefer = "return=representation,resolution=merge-duplicates"
        self._headers["Prefer"] = prefer
        if on_conflict:
            self._params["on_conflict"] = on_conflict
        return self

    def delete(self):
        self._method = "DELETE"
        self._headers["Prefer"] = "return=representation"
        return self

    # ── Filters (available for ALL operations) ────────────────────────────

    def eq(self, col: str, val):
        self._params[col] = f"eq.{val}"
        return self

    def neq(self, col: str, val):
        self._params[col] = f"neq.{val}"
        return self

    def gt(self, col: str, val):
        self._params[col] = f"gt.{val}"
        return self

    def gte(self, col: str, val):
        self._params[col] = f"gte.{val}"
        return self

    def lt(self, col: str, val):
        self._params[col] = f"lt.{val}"
        return self

    def lte(self, col: str, val):
        self._params[col] = f"lte.{val}"
        return self

    def like(self, col: str, val: str):
        self._params[col] = f"like.{val}"
        return self

    def ilike(self, col: str, val: str):
        self._params[col] = f"ilike.{val}"
        return self

    def in_(self, col: str, values: list):
        """Filter where column value is in a list: .in_("id", [1, 2, 3])"""
        formatted = ",".join(str(v) for v in values)
        self._params[col] = f"in.({formatted})"
        return self

    def is_(self, col: str, val):
        self._params[col] = f"is.{val}"
        return self

    # ── Modifiers ─────────────────────────────────────────────────────────

    def order(self, col: str, desc: bool = False):
        direction = "desc" if desc else "asc"
        self._params["order"] = f"{col}.{direction}"
        return self

    def limit(self, n: int):
        self._params["limit"] = str(n)
        return self

    def range(self, start: int, end: int):
        self._headers["Range"] = f"{start}-{end}"
        return self

    def single(self):
        """Expect exactly one result. Response .data will be a dict instead of list."""
        self._is_single = True
        self._headers["Accept"] = "application/vnd.pgrst.object+json"
        return self

    # ── Execute ───────────────────────────────────────────────────────────

    async def execute(self) -> SupabaseResponse:
        """Execute the built query and return a SupabaseResponse."""
        client = await self._sb.get_client()
        kwargs: dict = {"headers": self._headers, "params": self._params}

        if self._method == "GET":
            response = await client.get(self._base_url, **kwargs)
        elif self._method == "POST":
            response = await client.post(self._base_url, json=self._body, **kwargs)
        elif self._method == "PATCH":
            response = await client.patch(self._base_url, json=self._body, **kwargs)
        elif self._method == "DELETE":
            response = await client.delete(self._base_url, **kwargs)
        else:
            raise ValueError(f"Unsupported HTTP method: {self._method}")

        return SupabaseResponse(response)


# ─── Main Client ─────────────────────────────────────────────────────────────

class SupabaseLite:
    """
    Lightweight async Supabase client.
    
    Supports lazy connection for serverless environments.
    """

    def __init__(self, url: str, key: str):
        self.url = url.rstrip("/")
        self.key = key
        self._headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }
        self._client: httpx.AsyncClient | None = None

    async def get_client(self) -> httpx.AsyncClient:
        """Get existing client or create a new one if closed."""
        if self._client is None or self._client.is_closed:
            await self.open()
        if self._client is None: # Should not happen unless open() fails silently
             raise RuntimeError("Failed to initialize httpx client")
        return self._client

    async def open(self):
        """Initialize the async HTTP client with connection pooling."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(30.0, connect=10.0),
                limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
            )

    async def close(self):
        """Close the HTTP client and release connections."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    def table(self, name: str) -> QueryBuilder:
        """Start building a query for the given table."""
        # No longer raises error here. Connection is checked/opened in execute().
        return QueryBuilder(self, self.url, self._headers, name)


# ─── Singleton ────────────────────────────────────────────────────────────────

supabase = SupabaseLite(SUPABASE_URL, SUPABASE_KEY)
