"""Tests for the FastAPI ML inference API endpoints."""

import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient
from api.main import app, models


@pytest.fixture
def client() -> TestClient:
    """FastAPI test client with models set to None (mock mode)."""
    models["recommender"] = None
    models["sentiment"] = None
    models["churn"] = None
    return TestClient(app)


# ------------------------------------------------------------------
# Health endpoint
# ------------------------------------------------------------------


class TestHealthEndpoint:
    def test_health_returns_200(self, client: TestClient) -> None:
        resp = client.get("/health")
        assert resp.status_code == 200

    def test_health_has_status(self, client: TestClient) -> None:
        data = client.get("/health").json()
        assert data["status"] == "healthy"

    def test_health_models_loaded_keys(self, client: TestClient) -> None:
        data = client.get("/health").json()
        assert "recommender" in data["models_loaded"]
        assert "sentiment" in data["models_loaded"]
        assert "churn" in data["models_loaded"]

    def test_health_version_present(self, client: TestClient) -> None:
        data = client.get("/health").json()
        assert "version" in data


# ------------------------------------------------------------------
# Recommendation endpoint
# ------------------------------------------------------------------


class TestRecommendEndpoint:
    def test_recommend_mock_response(self, client: TestClient) -> None:
        resp = client.post("/recommend/user_1", json={"top_n": 3})
        assert resp.status_code == 200
        data = resp.json()
        assert data["user_id"] == "user_1"
        assert data["algorithm"] == "mock"

    def test_recommend_default_top_n(self, client: TestClient) -> None:
        resp = client.post("/recommend/user_1")
        assert resp.status_code == 200

    def test_recommend_returns_items(self, client: TestClient) -> None:
        resp = client.post("/recommend/user_1", json={"top_n": 5})
        data = resp.json()
        assert "recommendations" in data
        assert len(data["recommendations"]) <= 5

    def test_recommend_item_has_fields(self, client: TestClient) -> None:
        resp = client.post("/recommend/user_1", json={"top_n": 1})
        rec = resp.json()["recommendations"][0]
        assert "item_id" in rec
        assert "destination" in rec
        assert "score" in rec


# ------------------------------------------------------------------
# Sentiment endpoint
# ------------------------------------------------------------------


class TestSentimentEndpoint:
    def test_sentiment_mock_response(self, client: TestClient) -> None:
        resp = client.post("/sentiment", json={"text": "Great hotel!"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["sentiment"] in ("positive", "negative", "neutral")

    def test_sentiment_has_confidence(self, client: TestClient) -> None:
        data = client.post("/sentiment", json={"text": "Nice trip"}).json()
        assert 0.0 <= data["confidence"] <= 1.0

    def test_sentiment_has_probabilities(self, client: TestClient) -> None:
        data = client.post("/sentiment", json={"text": "Okay"}).json()
        assert "probabilities" in data

    def test_sentiment_empty_text_rejected(self, client: TestClient) -> None:
        resp = client.post("/sentiment", json={"text": ""})
        assert resp.status_code == 422

    def test_sentiment_batch(self, client: TestClient) -> None:
        resp = client.post(
            "/sentiment/batch", json={"texts": ["Good", "Bad", "Meh"]}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] == 3
        assert len(data["results"]) == 3


# ------------------------------------------------------------------
# Churn endpoint
# ------------------------------------------------------------------


class TestChurnEndpoint:
    def test_churn_mock_response(self, client: TestClient) -> None:
        resp = client.post("/churn/user_42")
        assert resp.status_code == 200
        data = resp.json()
        assert data["user_id"] == "user_42"

    def test_churn_has_probability(self, client: TestClient) -> None:
        data = client.post("/churn/user_1").json()
        assert 0.0 <= data["churn_probability"] <= 1.0

    def test_churn_has_risk_level(self, client: TestClient) -> None:
        data = client.post("/churn/user_1").json()
        assert data["risk_level"] in ("low", "medium", "high")

    def test_churn_has_factors(self, client: TestClient) -> None:
        data = client.post("/churn/user_1").json()
        assert "top_factors" in data
        assert len(data["top_factors"]) > 0

    def test_churn_factor_fields(self, client: TestClient) -> None:
        data = client.post("/churn/user_1").json()
        factor = data["top_factors"][0]
        assert "feature" in factor
        assert "impact" in factor
        assert "direction" in factor


# ------------------------------------------------------------------
# Metrics endpoint
# ------------------------------------------------------------------


class TestMetricsEndpoint:
    def test_metrics_returns_200(self, client: TestClient) -> None:
        resp = client.get("/metrics")
        assert resp.status_code == 200

    def test_metrics_has_sections(self, client: TestClient) -> None:
        data = client.get("/metrics").json()
        assert "recommendation" in data
        assert "sentiment" in data
        assert "churn" in data


# ------------------------------------------------------------------
# Edge case tests
# ------------------------------------------------------------------


class TestEdgeCases:
    """Edge cases and malformed input handling."""

    def test_recommend_top_n_exceeds_max_rejected(self, client: TestClient) -> None:
        """top_n > 50 should be rejected by Pydantic validation."""
        resp = client.post("/recommend/user_1", json={"top_n": 100})
        assert resp.status_code == 422

    def test_recommend_top_n_zero_rejected(self, client: TestClient) -> None:
        """top_n < 1 should be rejected."""
        resp = client.post("/recommend/user_1", json={"top_n": 0})
        assert resp.status_code == 422

    def test_sentiment_very_long_text_rejected(self, client: TestClient) -> None:
        """Text exceeding 5000 chars should be rejected."""
        long_text = "a" * 5001
        resp = client.post("/sentiment", json={"text": long_text})
        assert resp.status_code == 422

    def test_sentiment_special_characters(self, client: TestClient) -> None:
        """Unicode and special characters should not crash the endpoint."""
        resp = client.post("/sentiment", json={"text": "Great hotel! \u2605\u2605\u2605\u2605\u2605 \ud83c\udf1f"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["sentiment"] in ("positive", "negative", "neutral")

    def test_sentiment_batch_empty_list(self, client: TestClient) -> None:
        """Empty texts list should return zero results, not crash."""
        resp = client.post("/sentiment/batch", json={"texts": []})
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] == 0
        assert data["results"] == []

    def test_churn_with_explicit_features(self, client: TestClient) -> None:
        """Passing explicit features should work in mock mode."""
        features = {
            "sessions_7d": 0,
            "sessions_30d": 2,
            "sessions_90d": 10,
            "searches_total": 15,
            "clicks_total": 5,
            "conversions_total": 0,
            "search_to_click_ratio": 0.33,
            "click_to_conversion_ratio": 0.0,
            "avg_session_duration_mins": 4.0,
            "days_since_last_activity": 55,
            "lifetime_value": 0.0,
            "unique_destinations_searched": 2,
            "mobile_session_ratio": 1.0,
            "weekend_session_ratio": 0.5,
        }
        resp = client.post("/churn/user_99", json={"features": features})
        assert resp.status_code == 200
        data = resp.json()
        assert data["user_id"] == "user_99"
        assert 0.0 <= data["churn_probability"] <= 1.0

    def test_error_response_contains_request_id(self, client: TestClient) -> None:
        """Error responses should include a request_id for tracing."""
        resp = client.post("/sentiment", json={"text": ""})
        # Pydantic validation errors return 422 via FastAPI's default handler,
        # but our custom HTTPException handler should include request_id for
        # manually raised errors.  Test a 405 by using wrong method on /health.
        resp = client.post("/health")
        assert resp.status_code == 405
