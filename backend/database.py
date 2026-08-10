from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# PostgreSQL database URL.
# Replace YOUR_PASSWORD with your actual PostgreSQL password before running.
DATABASE_URL = "postgresql://postgres:password-56@localhost:5432/smart_erp_users"

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
