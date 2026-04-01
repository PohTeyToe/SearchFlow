"""Tests for LangChain tools: ML, SQL, and SHAP."""

from unittest.mock import patch, MagicMock

import duckdb
import pytest

from src.tools.ml_tools import query_churn_model, query_sentiment, query_recommendations
from src.tools.sql_tools import run_analytics_query
from src.tools.shap_tools import get_shap_explanation


# ============================================
# ML Tools Tests
# ============================================

class TestQueryChurnModel:
    def test_returns_formatted_prediction(self, mock_churn_response):
        mock_resp = MagicMock()
        mock_resp.json.return_value = mock_churn_response
        mock_resp.raise_for_status = MagicMock()

        mock_client = MagicMock()
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client.post.return_value = mock_resp

        with patch("src.tools.ml_tools.httpx.Client", return_value=mock_client):
            result = query_churn_model.invoke("user_123")

        assert "user_123" in result
        assert "45.0%" in result
        assert "medium" in result
        assert "days_since_last_activity" in result

    def test_handles_connection_error(self):
        mock_client = MagicMock()
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client.post.side_effect = Exception("Connection refused")

        with patch("src.tools.ml_tools.httpx.Client", return_value=mock_client):
            result = query_churn_model.invoke("user_123")

        assert "Error" in result
        assert "user_123" in result


class TestQuerySentiment:
    def test_returns_formatted_sentiment(self, mock_sentiment_response):
        mock_resp = MagicMock()
        mock_resp.json.return_value = mock_sentiment_response
        mock_resp.raise_for_status = MagicMock()

        mock_client = MagicMock()
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client.post.return_value = mock_resp

        with patch("src.tools.ml_tools.httpx.Client", return_value=mock_client):
            result = query_sentiment.invoke("Great hotel with amazing views")

        assert "positive" in result
        assert "92.0%" in result

    def test_calls_sentiment_endpoint(self, mock_sentiment_response):
        mock_resp = MagicMock()
        mock_resp.json.return_value = mock_sentiment_response
        mock_resp.raise_for_status = MagicMock()

        mock_client = MagicMock()
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client.post.return_value = mock_resp

        with patch("src.tools.ml_tools.httpx.Client", return_value=mock_client):
            query_sentiment.invoke("test text")

        mock_client.post.assert_called_once()
        call_args = mock_client.post.call_args
        assert "/sentiment" in call_args[0][0]


class TestQueryRecommendations:
    def test_returns_formatted_list(self, mock_recommendation_response):
        mock_resp = MagicMock()
        mock_resp.json.return_value = mock_recommendation_response
        mock_resp.raise_for_status = MagicMock()

        mock_client = MagicMock()
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client.post.return_value = mock_resp

        with patch("src.tools.ml_tools.httpx.Client", return_value=mock_client):
            result = query_recommendations.invoke("user_123")

        assert "user_123" in result
        assert "Miami" in result
        assert "0.90" in result

    def test_handles_empty_recommendations(self):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"user_id": "user_123", "recommendations": []}
        mock_resp.raise_for_status = MagicMock()

        mock_client = MagicMock()
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client.post.return_value = mock_resp

        with patch("src.tools.ml_tools.httpx.Client", return_value=mock_client):
            result = query_recommendations.invoke("user_123")

        assert "No recommendations" in result


# ============================================
# SQL Tool Tests
# ============================================

class TestRunAnalyticsQuery:
    @pytest.fixture
    def test_duckdb(self, tmp_path):
        """Create an in-memory-style DuckDB with analytics/marketing schemas."""
        db_path = str(tmp_path / "test.duckdb")
        conn = duckdb.connect(db_path)
        conn.execute("CREATE SCHEMA IF NOT EXISTS analytics")
        conn.execute("CREATE SCHEMA IF NOT EXISTS marketing")
        conn.execute("""
            CREATE TABLE analytics.dim_users (
                user_id VARCHAR, name VARCHAR, created_at TIMESTAMP
            )
        """)
        conn.execute("""
            INSERT INTO analytics.dim_users VALUES
            ('u1', 'Alice', '2024-01-01'),
            ('u2', 'Bob', '2024-02-01')
        """)
        conn.execute("""
            CREATE TABLE analytics.fct_search_funnel (
                user_id VARCHAR, searches INT, clicks INT
            )
        """)
        conn.execute("""
            INSERT INTO analytics.fct_search_funnel VALUES
            ('u1', 100, 30), ('u2', 50, 10)
        """)
        conn.execute("""
            CREATE TABLE marketing.mart_user_segments (
                user_id VARCHAR, segment VARCHAR
            )
        """)
        conn.execute("""
            INSERT INTO marketing.mart_user_segments VALUES
            ('u1', 'high_value'), ('u2', 'at_risk')
        """)
        conn.close()
        return db_path

    def test_select_allowed_table(self, test_duckdb):
        with patch("src.tools.sql_tools.DUCKDB_PATH", test_duckdb):
            result = run_analytics_query.invoke("SELECT * FROM analytics.dim_users")
        assert "Alice" in result
        assert "Bob" in result

    def test_blocks_non_allowlisted_schema(self, test_duckdb):
        with patch("src.tools.sql_tools.DUCKDB_PATH", test_duckdb):
            result = run_analytics_query.invoke("SELECT * FROM public.secrets")
        assert "Query blocked" in result
        assert "not in the allowlist" in result

    def test_blocks_ddl(self, test_duckdb):
        with patch("src.tools.sql_tools.DUCKDB_PATH", test_duckdb):
            result = run_analytics_query.invoke("DROP TABLE analytics.dim_users")
        assert "Query blocked" in result
        assert "DDL" in result or "not allowed" in result

    def test_blocks_insert(self, test_duckdb):
        with patch("src.tools.sql_tools.DUCKDB_PATH", test_duckdb):
            result = run_analytics_query.invoke(
                "INSERT INTO analytics.dim_users VALUES ('u3', 'Eve', '2024-03-01')"
            )
        assert "Query blocked" in result

    def test_blocks_file_reading_functions(self, test_duckdb):
        with patch("src.tools.sql_tools.DUCKDB_PATH", test_duckdb):
            result = run_analytics_query.invoke(
                "SELECT * FROM read_csv_auto('/etc/passwd')"
            )
        assert "Query blocked" in result
        assert "File-reading" in result

    def test_blocks_read_parquet(self, test_duckdb):
        with patch("src.tools.sql_tools.DUCKDB_PATH", test_duckdb):
            result = run_analytics_query.invoke(
                "SELECT * FROM read_parquet('s3://bucket/data.parquet')"
            )
        assert "Query blocked" in result

    def test_enforces_length_limit(self, test_duckdb):
        long_query = "SELECT " + "x" * 2001
        with patch("src.tools.sql_tools.DUCKDB_PATH", test_duckdb):
            result = run_analytics_query.invoke(long_query)
        assert "Query blocked" in result
        assert "2000" in result

    def test_returns_max_50_rows(self, test_duckdb):
        # Create a table with >50 rows
        conn = duckdb.connect(test_duckdb)
        conn.execute("""
            CREATE TABLE analytics.big_table AS
            SELECT i as id, 'row_' || i as name FROM range(100) t(i)
        """)
        conn.close()

        with patch("src.tools.sql_tools.DUCKDB_PATH", test_duckdb):
            result = run_analytics_query.invoke("SELECT * FROM analytics.big_table")
        assert "first 50 rows" in result

    def test_opens_read_only(self, test_duckdb):
        """Verify DuckDB is opened in read-only mode."""
        with patch("src.tools.sql_tools.duckdb.connect") as mock_connect:
            mock_conn = MagicMock()
            mock_result = MagicMock()
            mock_result.description = [("col1",)]
            mock_result.fetchmany.return_value = [("val1",)]
            mock_conn.execute.return_value = mock_result
            mock_connect.return_value = mock_conn

            run_analytics_query.invoke("SELECT * FROM analytics.dim_users")

            mock_connect.assert_called_once()
            call_kwargs = mock_connect.call_args
            assert call_kwargs[1].get("read_only") is True or (
                len(call_kwargs[0]) > 1 and call_kwargs[0][1] is True
            )

    def test_marketing_schema_allowed(self, test_duckdb):
        with patch("src.tools.sql_tools.DUCKDB_PATH", test_duckdb):
            result = run_analytics_query.invoke(
                "SELECT * FROM marketing.mart_user_segments"
            )
        assert "high_value" in result


# ============================================
# SHAP Tools Tests
# ============================================

class TestGetShapExplanation:
    def test_formats_shap_with_percentages(self, mock_churn_response):
        mock_resp = MagicMock()
        mock_resp.json.return_value = mock_churn_response
        mock_resp.raise_for_status = MagicMock()

        mock_client = MagicMock()
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client.post.return_value = mock_resp

        with patch("src.tools.shap_tools.httpx.Client", return_value=mock_client):
            result = get_shap_explanation.invoke("user_123")

        assert "user_123" in result
        assert "%" in result
        assert "days_since_last_activity" in result
        assert "increases" in result

    def test_handles_missing_shap_data(self):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "user_id": "user_123",
            "churn_probability": 0.5,
            "top_factors": [],
        }
        mock_resp.raise_for_status = MagicMock()

        mock_client = MagicMock()
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client.post.return_value = mock_resp

        with patch("src.tools.shap_tools.httpx.Client", return_value=mock_client):
            result = get_shap_explanation.invoke("user_123")

        assert "No SHAP explanation" in result

    def test_calls_churn_endpoint(self, mock_churn_response):
        mock_resp = MagicMock()
        mock_resp.json.return_value = mock_churn_response
        mock_resp.raise_for_status = MagicMock()

        mock_client = MagicMock()
        mock_client.__enter__ = MagicMock(return_value=mock_client)
        mock_client.__exit__ = MagicMock(return_value=False)
        mock_client.post.return_value = mock_resp

        with patch("src.tools.shap_tools.httpx.Client", return_value=mock_client):
            get_shap_explanation.invoke("user_123")

        mock_client.post.assert_called_once()
        assert "/churn/user_123" in mock_client.post.call_args[0][0]
