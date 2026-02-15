"""Tests for health check endpoints."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from conftest import SAMPLE_CATEGORIES  # type: ignore


def test_ping(test_client):
    """GET /ping should return pong."""
    response = test_client.get("/ping")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "pong"


def test_health(test_client, mock_supabase):
    """GET /health should return healthy with db status."""
    mock_supabase.set_table_data("categories", SAMPLE_CATEGORIES[:1])
    response = test_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
