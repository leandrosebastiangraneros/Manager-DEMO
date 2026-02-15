"""
Test fixtures and mocks for backend tests.

Uses a mock SupabaseLite client to avoid real database connections.
"""

import pytest  # type: ignore
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient  # type: ignore


class MockResponse:
    """Mock for SupabaseResponse."""
    def __init__(self, data=None, error=None):
        self.data = data or []
        self.error = error
        self.status_code = 200 if not error else 400

    def __bool__(self):
        return self.error is None


class MockQueryBuilder:
    """Mock QueryBuilder that returns configurable responses."""

    def __init__(self, response_data=None):
        self._response = MockResponse(data=response_data or [])

    # All chainable methods return self
    def select(self, *a, **kw): return self
    def insert(self, *a, **kw): return self
    def update(self, *a, **kw): return self
    def upsert(self, *a, **kw): return self
    def delete(self, *a, **kw): return self
    def eq(self, *a, **kw): return self
    def neq(self, *a, **kw): return self
    def gt(self, *a, **kw): return self
    def gte(self, *a, **kw): return self
    def lt(self, *a, **kw): return self
    def lte(self, *a, **kw): return self
    def like(self, *a, **kw): return self
    def ilike(self, *a, **kw): return self
    def in_(self, *a, **kw): return self
    def is_(self, *a, **kw): return self
    def order(self, *a, **kw): return self
    def limit(self, *a, **kw): return self
    def range(self, *a, **kw): return self
    def single(self, *a, **kw): return self

    async def execute(self):
        return self._response


class MockSupabase:
    """Mock SupabaseLite that returns MockQueryBuilders."""

    def __init__(self):
        self._table_data: dict[str, list] = {}

    def set_table_data(self, table_name: str, data: list):
        self._table_data[table_name] = data

    def table(self, name: str) -> MockQueryBuilder:
        data = self._table_data.get(name, [])
        return MockQueryBuilder(response_data=data)

    async def open(self):
        pass

    async def close(self):
        pass


@pytest.fixture
def mock_supabase():
    """Provides a MockSupabase instance."""
    return MockSupabase()


@pytest.fixture
def test_client(mock_supabase):
    """
    Create a TestClient with mocked Supabase.
    Patches the supabase singleton before importing the app.
    """
    with patch("supabase_client.supabase", mock_supabase):
        with patch("helpers.supabase", mock_supabase):
            with patch("routers.health.supabase", mock_supabase):
                with patch("routers.categories.supabase", mock_supabase):
                    with patch("routers.stock.supabase", mock_supabase):
                        with patch("routers.sales.supabase", mock_supabase):
                            with patch("routers.expenses.supabase", mock_supabase):
                                with patch("routers.reports.supabase", mock_supabase):
                                    with patch("routers.admin.supabase", mock_supabase):
                                        from main import app  # type: ignore
                                        yield TestClient(app)


SAMPLE_STOCK_ITEMS = [
    {
        "id": 1,
        "name": "Coca-Cola",
        "brand": "Coca-Cola",
        "barcode": "7790895000591",
        "quantity": 100,
        "selling_price": 500,
        "unit_cost": 300,
        "cost_amount": 30000,
        "initial_quantity": 100,
        "is_pack": False,
        "pack_size": 1,
        "pack_price": None,
        "category_id": 1,
        "status": "AVAILABLE",
        "min_stock_alert": 10,
    },
    {
        "id": 2,
        "name": "Quilmes",
        "brand": "Quilmes",
        "barcode": "7790895000592",
        "quantity": 50,
        "selling_price": 800,
        "unit_cost": 500,
        "cost_amount": 25000,
        "initial_quantity": 50,
        "is_pack": True,
        "pack_size": 6,
        "pack_price": 4200,
        "category_id": 2,
        "status": "AVAILABLE",
        "min_stock_alert": 5,
    },
]

SAMPLE_CATEGORIES = [
    {"id": 1, "name": "Gaseosas", "type": "PRODUCT"},
    {"id": 2, "name": "Cervezas", "type": "PRODUCT"},
    {"id": 3, "name": "Venta de Bebidas", "type": "INCOME"},
    {"id": 4, "name": "Compra de Mercadería", "type": "EXPENSE"},
]
