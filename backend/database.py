import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv(Path(__file__).resolve().parent / ".env")

# PostgreSQL database URL. Set DATABASE_URL in backend/.env (gitignored) so each
# developer can use their own local password; see backend/.env.example.
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Copy backend/.env.example to backend/.env and "
        "fill in your local PostgreSQL connection string."
    )

# SQLAlchemy engine connects FastAPI to PostgreSQL.
engine = create_engine(DATABASE_URL)

# SessionLocal creates database sessions for each API request.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base is used by all database models.
Base = declarative_base()


def get_db():
    """Create a database session and close it after the request finishes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
