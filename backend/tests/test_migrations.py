"""TASK-49 (#49): `alembic upgrade head` on a fresh database produces exactly
the schema in models.py, and the foreign-key columns are indexed."""
from pathlib import Path

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import create_engine, inspect

from database import Base

BACKEND = Path(__file__).resolve().parents[1]


def _config(url):
    config = Config(str(BACKEND / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND / "migrations"))
    config.set_main_option("sqlalchemy.url", url)
    config.attributes["configure_logger"] = False
    return config


def test_upgrade_head_on_fresh_database_matches_models(tmp_path):
    url = f"sqlite:///{tmp_path / 'fresh.db'}"
    command.upgrade(_config(url), "head")

    engine = create_engine(url)
    with engine.connect() as connection:
        diffs = compare_metadata(MigrationContext.configure(connection), Base.metadata)
    engine.dispose()
    assert diffs == [], f"models.py and the migrations disagree: {diffs}"


def test_foreign_key_columns_are_indexed(tmp_path):
    url = f"sqlite:///{tmp_path / 'fresh.db'}"
    command.upgrade(_config(url), "head")

    inspector = inspect(create_engine(url))
    indexed = {
        table: {tuple(index["column_names"]) for index in inspector.get_indexes(table)}
        for table in ("products", "retail_sales")
    }
    assert ("supplier_id",) in indexed["products"]
    assert ("product_id",) in indexed["retail_sales"]


def test_downgrade_and_upgrade_round_trip(tmp_path):
    config = _config(f"sqlite:///{tmp_path / 'fresh.db'}")
    command.upgrade(config, "head")
    command.downgrade(config, "0001")
    command.upgrade(config, "head")
