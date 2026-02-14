import os
from typing import Optional
import httpx  # type: ignore[import-untyped]
from dotenv import load_dotenv  # type: ignore[import-untyped]
import logging

load_dotenv()

logger = logging.getLogger(__name__)

class SupabaseLite:
    def __init__(self):
        self.url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        self.key = os.environ.get("SUPABASE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
        
        if not self.url or not self.key:
            self.initialized = False
            self._client = None
        else:
            self.url = self.url.rstrip('/')
            self.base_url = f"{self.url}/rest/v1"
            self.headers = {
                "apikey": self.key,
                "Authorization": f"Bearer {self.key}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            }
            self.initialized = True
            # Reusable HTTP client with connection pooling
            self._client = httpx.Client(
                headers=self.headers,
                timeout=30.0,
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)
            )

    def table(self, table_name: str):
        if not self.initialized or not self._client:
            raise ValueError("Supabase Client NOT initialized. Check SUPABASE_URL and SUPABASE_KEY environment variables.")
        return SupabaseTable(self, table_name)

    def close(self) -> None:
        """Close the underlying HTTP client."""
        client = self._client
        self._client = None
        if client is not None:
            client.close()

class SupabaseTable:
    def __init__(self, client: SupabaseLite, table_name: str):
        self.client = client
        self.table_name = table_name

    def select(self, columns: str = "*"):
        class Chain:
            def __init__(self, table, cols):
                self.table = table
                self.params = {"select": cols}
                self.extra_headers = {}
                self.is_single = False

            def eq(self, col, val):
                if val is not None: self.params[col] = f"eq.{val}"
                return self
                
            def gte(self, col, val): self.params[col] = f"gte.{val}"; return self
            def lt(self, col, val): self.params[col] = f"lt.{val}"; return self
            def order(self, col, desc=True): self.params['order'] = f"{col}.{'desc' if desc else 'asc'}"; return self
            def range(self, start, end): self.extra_headers["Range"] = f"{start}-{end}"; return self
            def limit(self, l): self.params['limit'] = l; return self
            def single(self): self.is_single = True; return self
            def ilike(self, col, val): self.params[col] = f"ilike.{val}"; return self

            def execute(self):
                http = self.table.client._client
                url = f"{self.table.client.base_url}/{self.table.table_name}"
                headers = {**self.extra_headers} if self.extra_headers else None
                response = http.get(url, headers=headers, params=self.params)
                if response.status_code >= 400:
                    raise Exception(f"Supabase GET Error {response.status_code}: {response.text}")
                data = response.json()
                if self.is_single:
                    if isinstance(data, list) and len(data) > 0: return SupabaseResponse(response, data[0])
                    return SupabaseResponse(response, None)
                return SupabaseResponse(response, data)
        return Chain(self, columns)

    def insert(self, data: dict):
        class Operation:
            def __init__(self, table, payload):
                self.table = table
                self.payload = payload
            def execute(self):
                http = self.table.client._client
                url = f"{self.table.client.base_url}/{self.table.table_name}"
                response = http.post(url, json=self.payload)
                if response.status_code >= 400:
                    raise Exception(f"Supabase POST Error {response.status_code}: {response.text}")
                return SupabaseResponse(response, response.json())
        return Operation(self, data)

    def update(self, data: dict):
        class Operation:
            def __init__(self, table, payload):
                self.table = table
                self.payload = payload
                self.params = {}

            def eq(self, col, val): self.params[col] = f"eq.{val}"; return self
            
            def execute(self):
                http = self.table.client._client
                url = f"{self.table.client.base_url}/{self.table.table_name}"
                response = http.patch(url, json=self.payload, params=self.params)
                if response.status_code >= 400:
                    raise Exception(f"Supabase PATCH Error {response.status_code}: {response.text}")
                return SupabaseResponse(response, response.json())
        return Operation(self, data)

    def upsert(self, data: list, on_conflict: Optional[str] = None):
        class Operation:
            def __init__(self, table, payload, conflict_col):
                self.table = table
                self.payload = payload
                self.conflict_col = conflict_col
                
            def execute(self):
                http = self.table.client._client
                url = f"{self.table.client.base_url}/{self.table.table_name}"
                headers = {"Prefer": "resolution=merge-duplicates,return=representation"}
                if self.conflict_col: headers["Prefer"] += f",on_conflict={self.conflict_col}"
                response = http.post(url, headers=headers, json=self.payload)
                if response.status_code >= 400:
                    raise Exception(f"Supabase UPSERT Error {response.status_code}: {response.text}")
                return SupabaseResponse(response, response.json())
        return Operation(self, data, on_conflict)

    def delete(self):
        class Operation:
            def __init__(self, table):
                self.table = table
                self.params = {}
            def eq(self, col, val): self.params[col] = f"eq.{val}"; return self
            def execute(self):
                http = self.table.client._client
                url = f"{self.table.client.base_url}/{self.table.table_name}"
                response = http.delete(url, params=self.params)
                if response.status_code >= 400:
                    raise Exception(f"Supabase DELETE Error {response.status_code}: {response.text}")
                return SupabaseResponse(response, response.json() if response.text else [])
        return Operation(self)

class SupabaseResponse:
    def __init__(self, response, data=None):
        self.status_code = response.status_code
        self.data = data

# Singleton
supabase = SupabaseLite()
