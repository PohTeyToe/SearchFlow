"""Test fixtures for search assistant tests."""

import pytest
from fastapi.testclient import TestClient

from src.main import app


@pytest.fixture
def test_client():
    """FastAPI TestClient fixture."""
    return TestClient(app)


@pytest.fixture
def mock_churn_response():
    """Standard churn API response for testing."""
    return {
        "user_id": "user_123",
        "churn_probability": 0.45,
        "risk_level": "medium",
        "top_factors": [
            {"feature": "days_since_last_activity", "impact": 0.15, "direction": "increases", "value": 45},
            {"feature": "sessions_7d", "impact": -0.12, "direction": "decreases", "value": 0},
            {"feature": "conversions_total", "impact": -0.08, "direction": "decreases", "value": 0},
        ],
        "cached": False,
    }


@pytest.fixture
def mock_sentiment_response():
    """Standard sentiment API response for testing."""
    return {
        "text": "Great hotel with amazing views",
        "sentiment": "positive",
        "confidence": 0.92,
        "probabilities": {"positive": 0.92, "negative": 0.04, "neutral": 0.04},
    }


@pytest.fixture
def mock_recommendation_response():
    """Standard recommendation API response for testing."""
    return {
        "user_id": "user_123",
        "recommendations": [
            {"item_id": "dest_0", "destination": "Miami", "score": 0.90},
            {"item_id": "dest_1", "destination": "Cancun", "score": 0.85},
            {"item_id": "dest_2", "destination": "Las Vegas", "score": 0.80},
        ],
        "algorithm": "hybrid",
        "cached": False,
    }
