"""Shared helpers and utilities for all routers."""
from typing import Optional, Dict
import os
import logging

from supabase_client import supabase

logger = logging.getLogger(__name__)

# Upload directory
UPLOAD_DIR = "/tmp/uploads" if os.getenv("VERCEL") else "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# Allowed file types and max size for expense uploads
ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "webp"}
MAX_UPLOAD_SIZE_MB = 10


def log_movement(
    category: str,
    action: str,
    description: str,
    metadata: Optional[Dict] = None,
    product_id: int = None,
    tx_id: int = None,
    sale_id: int = None,
):
    """Insert an activity record into app_movements."""
    metadata = metadata or {}
    try:
        data = {
            "category": category,
            "action": action,
            "description": description,
            "metadata": metadata,
            "stock_item_id": product_id,
            "transaction_id": tx_id,
            "sale_id": sale_id,
        }
        supabase.table("app_movements").insert(data).execute()
    except Exception as e:
        logger.error(f"Failed to log movement: {e}")
