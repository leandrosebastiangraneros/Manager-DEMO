"""Tests for sales endpoints."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from conftest import SAMPLE_STOCK_ITEMS  # type: ignore


def test_create_batch_sale_empty(test_client):
    """POST /sales with empty items should return 400 or 422."""
    response = test_client.post("/sales", json={"items": [], "description": "Test"})
    assert response.status_code in (400, 422)


def test_read_transactions(test_client, mock_supabase):
    """GET /transactions should return list."""
    mock_supabase.set_table_data("transactions", [
        {"id": 1, "amount": 1000, "type": "INCOME", "description": "Venta", "date": "2026-02-15"},
    ])
    response = test_client.get("/transactions")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_read_movements(test_client, mock_supabase):
    """GET /movements should return list."""
    mock_supabase.set_table_data("app_movements", [])
    response = test_client.get("/movements")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_dashboard_stats(test_client, mock_supabase):
    """GET /dashboard-stats should return financial summary."""
    mock_supabase.set_table_data("transactions", [])
    mock_supabase.set_table_data("app_movements", [])
    response = test_client.get("/dashboard-stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_income" in data
    assert "total_expense" in data
    assert "net_balance" in data
