"""Test fixtures for search assistant tests."""

import sys
from pathlib import Path

_component = str(Path(__file__).resolve().parent.parent)
if _component not in sys.path:
    for key in list(sys.modules.keys()):
        if key == "src" or key.startswith("src."):
            del sys.modules[key]
    sys.path.insert(0, _component)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from src.main import app  # noqa: E402


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
            {"feature": "lead_time", "impact": 0.15, "direction": "increases", "value": 120},
            {"feature": "deposit_type_encoded", "impact": 0.12, "direction": "increases", "value": 1},
            {"feature": "adr", "impact": -0.08, "direction": "decreases", "value": 85.0},
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
