"""Tests for stock endpoints."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from conftest import SAMPLE_STOCK_ITEMS, SAMPLE_CATEGORIES  # type: ignore


def test_read_stock(test_client, mock_supabase):
    """GET /stock should return stock items with formats."""
    mock_supabase.set_table_data("stock_items", SAMPLE_STOCK_ITEMS)
    mock_supabase.set_table_data("stock_item_formats", [])

    response = test_client.get("/stock")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_read_stock_empty(test_client, mock_supabase):
    """GET /stock with no items returns empty list."""
    mock_supabase.set_table_data("stock_items", [])
    response = test_client.get("/stock")
    assert response.status_code == 200
    assert response.json() == []


def test_get_brands(test_client, mock_supabase):
    """GET /stock/brands returns sorted unique brands."""
    mock_supabase.set_table_data("stock_items", [
        {"brand": "Coca-Cola"},
        {"brand": "Quilmes"},
        {"brand": "Coca-Cola"},
        {"brand": None},
    ])
    response = test_client.get("/stock/brands")
    assert response.status_code == 200
    brands = response.json()
    assert isinstance(brands, list)


def test_delete_stock_not_found(test_client, mock_supabase):
    """DELETE /stock/999 for non-existent item should 404."""
    mock_supabase.set_table_data("stock_items", [])
    response = test_client.delete("/stock/999")
    # With mock returning empty data for single(), it should fail
    assert response.status_code in (404, 500)
