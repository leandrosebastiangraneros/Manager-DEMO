from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

import os
from dotenv import load_dotenv

load_dotenv()

# Priority:
# 1. POSTGRES_PRISMA_URL (Neon/Vercel optimized with timeouts)
# 2. POSTGRES_URL_NON_POOLING (Direct connection)
# 3. POSTGRES_URL (Standard Vercel Env)
# 4. DATABASE_URL (Generic)
# 5. SQLite Fallback (Local)

SQLALCHEMY_DATABASE_URL = (
    os.getenv("POSTGRES_PRISMA_URL") or 
    os.getenv("POSTGRES_URL_NON_POOLING") or 
    os.getenv("POSTGRES_URL") or 
    os.getenv("DATABASE_URL")
)

# Vercel/Render fallback to SQLite if no DB string found
if not SQLALCHEMY_DATABASE_URL:
    if os.getenv("VERCEL"):
        SQLALCHEMY_DATABASE_URL = "sqlite:////tmp/novamanager.db"
    else:
        SQLALCHEMY_DATABASE_URL = "sqlite:///./novamanager.db"

# Fix for Vercel/Render providing postgres:// instead of postgresql://
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {}
if "sqlite" in SQLALCHEMY_DATABASE_URL:
    connect_args = {"check_same_thread": False}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
