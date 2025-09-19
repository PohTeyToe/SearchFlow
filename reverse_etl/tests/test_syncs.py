"""Tests for reverse-ETL sync modules with mocked destinations."""

import sys
import json
from pathlib import Path
from datetime import datetime
from unittest.mock import patch, MagicMock, call

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.syncs.user_segments_sync import UserSegmentsSync
from src.syncs.email_triggers_sync import EmailTriggersSync
from src.syncs.recommendations_sync import RecommendationsSync
from src.config import Config


# ------------------------------------------------------------------
# Fixtures
# ------------------------------------------------------------------


@pytest.fixture
def mock_duckdb():
    """Mock duckdb.connect to return controlled data."""
    with patch("src.syncs.user_segments_sync.duckdb") as mock:
        conn = MagicMock()
        mock.connect.return_value = conn
        yield mock, conn


@pytest.fixture
def mock_psycopg2():
    """Mock psycopg2.connect."""
    with patch("src.syncs.user_segments_sync.psycopg2") as mock:
        conn = MagicMock()
        cursor = MagicMock()
        conn.cursor.return_value = cursor
        cursor.rowcount = 5
        mock.connect.return_value = conn
        yield mock, conn, cursor


@pytest.fixture
def pg_config() -> dict:
    return {
        "host": "localhost",
        "port": 5432,
        "dbname": "test",
        "user": "test",
        "password": "test",
    }


# ------------------------------------------------------------------
# UserSegmentsSync tests
# ------------------------------------------------------------------


class TestUserSegmentsSync:
    def test_run_success(self, mock_duckdb, mock_psycopg2, pg_config) -> None:
        duckdb_mod, duckdb_conn = mock_duckdb
        _, pg_conn, cursor = mock_psycopg2

        # DuckDB returns sample segments
        duckdb_conn.execute.return_value.fetchall.return_value = [
            ("user_1", "high_value", 85.0, 1500.0, 3, "web", "CA", "2026-01-01", "2026-01-20"),
            ("user_2", "at_risk", 20.0, 200.0, 1, "ios", "US", "2025-12-01", "2026-01-10"),
        ]

        sync = UserSegmentsSync("/fake/path.duckdb", pg_config)
        result = sync.run()

        assert result["status"] == "success"
        assert result["rows_extracted"] == 2
        assert result["sync_type"] == "user_segments"

    def test_run_handles_empty_data(self, mock_duckdb, mock_psycopg2, pg_config) -> None:
        duckdb_mod, duckdb_conn = mock_duckdb
        duckdb_conn.execute.return_value.fetchall.return_value = []

        sync = UserSegmentsSync("/fake/path.duckdb", pg_config)
        result = sync.run()

        assert result["status"] == "success"
        assert result["rows_extracted"] == 0

    def test_run_reports_failure(self, pg_config) -> None:
        with patch("src.syncs.user_segments_sync.duckdb") as mock_duck:
            mock_duck.connect.side_effect = Exception("Connection failed")

            sync = UserSegmentsSync("/fake/path.duckdb", pg_config)
            result = sync.run()

            assert result["status"] == "failed"
            assert "error" in result


# ------------------------------------------------------------------
# EmailTriggersSync tests
# ------------------------------------------------------------------


class TestEmailTriggersSync:
    @patch("src.syncs.email_triggers_sync.psycopg2")
    @patch("src.syncs.email_triggers_sync.duckdb")
    def test_run_success(self, mock_duck, mock_pg, pg_config) -> None:
        # DuckDB returns abandoned search users
        conn = MagicMock()
        mock_duck.connect.return_value = conn
        conn.execute.return_value.fetchall.return_value = [
            ("user_1", "flights to Miami", datetime(2026, 1, 20), 3),
        ]

        # Postgres cursor
        pg_conn = MagicMock()
        cursor = MagicMock()
        pg_conn.cursor.return_value = cursor
        cursor.fetchone.return_value = None  # No duplicate
        mock_pg.connect.return_value = pg_conn

        sync = EmailTriggersSync("/fake/path.duckdb", pg_config)
        result = sync.run()

        assert result["status"] == "success"
        assert result["users_identified"] == 1
        assert result["emails_queued"] == 1

    @patch("src.syncs.email_triggers_sync.psycopg2")
    @patch("src.syncs.email_triggers_sync.duckdb")
    def test_skips_duplicate_emails(self, mock_duck, mock_pg, pg_config) -> None:
        conn = MagicMock()
        mock_duck.connect.return_value = conn
        conn.execute.return_value.fetchall.return_value = [
            ("user_1", "hotels", datetime(2026, 1, 20), 2),
        ]

        pg_conn = MagicMock()
        cursor = MagicMock()
        pg_conn.cursor.return_value = cursor
        cursor.fetchone.return_value = (1,)  # Already queued
        mock_pg.connect.return_value = pg_conn

        sync = EmailTriggersSync("/fake/path.duckdb", pg_config)
        result = sync.run()

        assert result["emails_queued"] == 0

    @patch("src.syncs.email_triggers_sync.psycopg2")
    @patch("src.syncs.email_triggers_sync.duckdb")
    def test_handles_failure(self, mock_duck, mock_pg, pg_config) -> None:
        mock_duck.connect.side_effect = Exception("db error")
        sync = EmailTriggersSync("/fake/path.duckdb", pg_config)
        result = sync.run()
        assert result["status"] == "failed"


# ------------------------------------------------------------------
# RecommendationsSync tests
# ------------------------------------------------------------------


class TestRecommendationsSync:
    @patch("src.syncs.recommendations_sync.redis")
    @patch("src.syncs.recommendations_sync.duckdb")
    def test_run_success(self, mock_duck, mock_redis) -> None:
        conn = MagicMock()
        mock_duck.connect.return_value = conn
        conn.execute.return_value.fetchall.return_value = [
            ("user_1", "Miami", 0.95, 1),
            ("user_1", "Toronto", 0.80, 2),
            ("user_2", "Cancun", 0.70, 1),
        ]

        redis_client = MagicMock()
        mock_redis.Redis.return_value = redis_client
        pipe = MagicMock()
        redis_client.pipeline.return_value = pipe

        sync = RecommendationsSync("/fake/path.duckdb", "localhost", 6379)
        result = sync.run()

        assert result["status"] == "success"
        assert result["records_extracted"] == 3
        assert result["users_updated"] == 2

    @patch("src.syncs.recommendations_sync.redis")
    @patch("src.syncs.recommendations_sync.duckdb")
    def test_empty_recommendations(self, mock_duck, mock_redis) -> None:
        conn = MagicMock()
        mock_duck.connect.return_value = conn
        conn.execute.return_value.fetchall.return_value = []

        redis_client = MagicMock()
        mock_redis.Redis.return_value = redis_client

        sync = RecommendationsSync("/fake/path.duckdb", "localhost", 6379)
        result = sync.run()

        assert result["status"] == "success"
        assert result["users_updated"] == 0

    @patch("src.syncs.recommendations_sync.redis")
    @patch("src.syncs.recommendations_sync.duckdb")
    def test_handles_failure(self, mock_duck, mock_redis) -> None:
        mock_duck.connect.side_effect = Exception("read error")
        mock_redis.Redis.return_value = MagicMock()

        sync = RecommendationsSync("/fake/path.duckdb", "localhost", 6379)
        result = sync.run()

        assert result["status"] == "failed"


# ------------------------------------------------------------------
# Config tests
# ------------------------------------------------------------------


class TestReverseEtlConfig:
    def test_default_values(self) -> None:
        cfg = Config()
        assert cfg.batch_size == 1000
        assert cfg.redis_port == 6379

    def test_postgres_connection_string(self) -> None:
        cfg = Config()
        assert "postgresql://" in cfg.postgres_connection_string
