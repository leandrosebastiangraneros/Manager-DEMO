from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import os
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

def get_database_url() -> str:
    """
    Retrieves the database URL from environment variables with specific priority.
    
    Priority:
    1. POSTGRES_PRISMA_URL (Neon/Vercel optimized with timeouts)
    2. POSTGRES_URL_NON_POOLING (Direct connection)
    3. POSTGRES_URL (Standard Vercel Env)
    4. DATABASE_URL (Generic)
    5. SQLite Fallback (Local Development Only)
    """
    url = (
        os.getenv("POSTGRES_PRISMA_URL") or 
        os.getenv("POSTGRES_URL_NON_POOLING") or 
        os.getenv("POSTGRES_URL") or 
        os.getenv("DATABASE_URL")
    )

    if url:
        logger.info("Database URL found in environment variables.")
        # Fix for Vercel providing postgres:// instead of postgresql://
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        
        # Fix for Supabase 'pgbouncer=true' which crashes psycopg2
        if "pgbouncer=true" in url:
            url = url.replace("?pgbouncer=true", "").replace("&pgbouncer=true", "")
            
        return url
    
    # If no URL found:
    if os.getenv("VERCEL"):
        # CRITICAL: Do not fallback to SQLite in production. Fail hard.
        logger.error("No database URL found in Vercel environment!")
        raise RuntimeError("CRITICAL: DATABASE_URL is missing in Vercel environment.")
    
    # Local development fallback
    logger.warning("No database URL found. Falling back to local SQLite.")
    return "sqlite:///./novamanager.db"

SQLALCHEMY_DATABASE_URL = get_database_url()

# Connection Arguments
connect_args = {}
if "sqlite" in SQLALCHEMY_DATABASE_URL:
    connect_args = {"check_same_thread": False}

# Engine Creation
# Use NullPool for Postgres to disable SQLAlchemy pooling (let Supabase/PgBouncer handle it)
pool_class = NullPool if "postgresql" in SQLALCHEMY_DATABASE_URL else None

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args=connect_args,
    poolclass=pool_class
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
