import os
import httpx
from dotenv import load_dotenv

load_dotenv()

class SupabaseLite:
    def __init__(self):
        self.url = os.environ.get("SUPABASE_URL")
        self.key = os.environ.get("SUPABASE_KEY")
        if not self.url or not self.key:
            # Fallback to NEXT_PUBLIC if found
            self.url = self.url or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
            self.key = self.key or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
            
        if not self.url or not self.key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY are required")
        
        # Ensure url does not end with /
        if self.url.endswith('/'):
            self.url = self.url[:-1]
            
        self.base_url = f"{self.url}/rest/v1"
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

    def table(self, table_name: str):
        return SupabaseTable(self, table_name)

class SupabaseTable:
    def __init__(self, client: SupabaseLite, table_name: str):
        self.client = client
        self.table_name = table_name

    def select(self, columns: str = "*"):
        # Very simplified select
        def execute():
            with httpx.Client() as client:
                url = f"{self.client.base_url}/{self.table_name}?select={columns}"
                response = client.get(url, headers=self.client.headers)
                return SupabaseResponse(response)
        
        # Mocking the chainable interface just enough for main.py
        class Chain:
            def __init__(self, table): self.table = table; self.params = {}
            def eq(self, col, val): self.params[col] = f"eq.{val}"; return self
            def gte(self, col, val): self.params[col] = f"gte.{val}"; return self
            def lt(self, col, val): self.params[col] = f"lt.{val}"; return self
            def order(self, col, desc=True): self.order_by = f"{col}.{'desc' if desc else 'asc'}"; return self
            def range(self, start, end): self.limit = end - start + 1; return self
            def limit(self, l): self.limit_val = l; return self
            def single(self): self.is_single = True; return self
            
            def execute(self):
                with httpx.Client() as client:
                    params = {"select": columns}
                    for k, v in self.params.items(): params[k] = v
                    if hasattr(self, 'order_by'): params['order'] = self.order_by
                    
                    url = f"{self.table.client.base_url}/{self.table.table_name}"
                    # Add limit header if needed
                    headers = self.table.client.headers.copy()
                    if hasattr(self, 'limit_val'): headers["Range"] = f"0-{self.limit_val-1}"
                    
                    response = client.get(url, headers=headers, params=params)
                    data = response.json()
                    if hasattr(self, 'is_single') and isinstance(data, list) and len(data) > 0:
                        return SupabaseResponse(response, data[0])
                    return SupabaseResponse(response, data)
        return Chain(self)

    def insert(self, data: dict):
        class Operation:
            def execute(self):
                with httpx.Client() as client:
                    url = f"{self.client.base_url}/{self.table_name}"
                    response = client.post(url, headers=self.client.headers, json=data)
                    return SupabaseResponse(response, response.json())
        return Operation()

    def update(self, data: dict):
        class Operation:
            def __init__(self, table): self.table = table; self.col = None; self.val = None
            def eq(self, col, val): self.col = col; self.val = val; return self
            def execute(self):
                with httpx.Client() as client:
                    url = f"{self.table.client.base_url}/{self.table.table_name}"
                    params = {self.col: f"eq.{self.val}"}
                    response = client.patch(url, headers=self.table.client.headers, json=data, params=params)
                    return SupabaseResponse(response, response.json())
        return Operation(self)

    def upsert(self, data: list, on_conflict: str = None):
        # Postgrest upsert uses Prefer: resolution=merge-duplicates (simplified)
        class Operation:
            def execute(self):
                with httpx.Client() as client:
                    url = f"{self.client.base_url}/{self.table_name}"
                    headers = self.client.headers.copy()
                    headers["Prefer"] = "resolution=merge-duplicates,return=representation"
                    response = client.post(url, headers=headers, json=data)
                    return SupabaseResponse(response, response.json())
        return Operation()

class SupabaseResponse:
    def __init__(self, response, data=None):
        self.status_code = response.status_code
        self.data = data if data is not None else []
        if response.status_code >= 400:
            raise Exception(f"Supabase Error {response.status_code}: {response.text}")

# Singleton
supabase = SupabaseLite()
