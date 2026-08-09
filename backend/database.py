"""database.py — SQLite via SQLAlchemy.

Known limitation, not glossed over: Render's free tier filesystem is
ephemeral, this database is wiped on every redeploy. That's an accepted
tradeoff for now (see backend/README.md, Zone Mapping section) until a
managed Postgres instance is provisioned, at which point only
DATABASE_URL below needs to change, nothing else in db_models.py or
zone_service.py does.
"""

import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

BACKEND_DIR = Path(__file__).resolve().parent
DEFAULT_SQLITE_PATH = BACKEND_DIR / "data" / "plasticnet.db"

DATABASE_URL = os.environ.get("PLASTICNET_DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH}")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def init_db():
    Base.metadata.create_all(bind=engine)
