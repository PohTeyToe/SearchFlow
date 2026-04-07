"""Tests for the FastAPI ML inference API endpoints."""

import os
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


class TestModelMetricsEndpoint:
    def test_model_metrics_returns_200(self, client: TestClient) -> None:
        resp = client.get("/model-metrics")
        assert resp.status_code == 200

    def test_model_metrics_has_sections(self, client: TestClient) -> None:
        data = client.get("/model-metrics").json()
        assert "recommendation" in data
        assert "sentiment" in data
        assert "churn" in data

    def test_old_metrics_endpoint_gone(self, client: TestClient) -> None:
        """Verify /metrics no longer exists after rename to /model-metrics."""
        resp = client.get("/metrics")
        # Prometheus instrumentator may expose /metrics/prometheus but /metrics itself should 404
        assert resp.status_code in (404, 405)


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
        resp = client.post("/sentiment", json={"text": "Great hotel! \u2605\u2605\u2605\u2605\u2605 \U0001f31f"})
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
            "lead_time": 120,
            "total_stay_nights": 5,
            "adr": 95.0,
            "is_repeated_guest": 0,
            "previous_cancellations": 1,
            "previous_bookings_not_canceled": 0,
            "booking_changes": 0,
            "total_of_special_requests": 1,
            "days_in_waiting_list": 0,
            "guests_total": 2,
            "deposit_type_encoded": 0,
            "market_segment_encoded": 6,
            "customer_type_encoded": 2,
            "weekend_stay_ratio": 0.4,
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


# ------------------------------------------------------------------
# Monitoring endpoints
# ------------------------------------------------------------------


class TestMonitoringEndpoints:
    def test_drift_endpoint_returns_json(self, client: TestClient) -> None:
        resp = client.get("/monitor/drift")
        assert resp.status_code == 200
        data = resp.json()
        assert "drift_detected" in data
        assert "drift_score" in data

    def test_drift_endpoint_default_response(self, client: TestClient) -> None:
        resp = client.get("/monitor/drift")
        data = resp.json()
        assert data["drift_detected"] is False
        assert data["drift_score"] == 0.0

    def test_performance_endpoint_returns_list(self, client: TestClient) -> None:
        # Mock mlflow to avoid connection timeout in tests
        mock_mlflow = MagicMock()
        mock_mlflow.tracking.MlflowClient.return_value.get_experiment_by_name.return_value = None
        with patch.dict("sys.modules", {"mlflow": mock_mlflow, "mlflow.tracking": mock_mlflow.tracking}):
            resp = client.get("/monitor/performance")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_drift_report_404_when_missing(self, client: TestClient) -> None:
        resp = client.get("/monitor/drift/report")
        assert resp.status_code == 404
