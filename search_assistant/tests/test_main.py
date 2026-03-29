"""Tests for the FastAPI application endpoints."""

from contextlib import contextmanager
from unittest.mock import MagicMock


def _ask_globals(test_client):
    """Get the globals dict of the /ask endpoint handler from the live app.

    Uses the app bound to the TestClient so we always target the same
    module instance that will actually serve the request, regardless of
    pytest import-mode (importlib vs prepend).
    """
    app = test_client.app
    for route in app.routes:
        if hasattr(route, "path") and route.path == "/ask":
            return route.endpoint.__globals__
    raise RuntimeError("Could not find /ask route on app")


@contextmanager
def _patch_invoke_agent(test_client, replacement):
    """Temporarily replace invoke_agent in the /ask handler's global scope."""
    g = _ask_globals(test_client)
    original = g["invoke_agent"]
    g["invoke_agent"] = replacement
    try:
        yield replacement
    finally:
        g["invoke_agent"] = original


class TestHealthEndpoint:
    def test_health_returns_200(self, test_client):
        resp = test_client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert "llm_backend" in data
        assert data["version"] == "1.0.0"


class TestAskEndpoint:
    def test_ask_returns_200_with_agent(self, test_client):
        """POST /ask returns 200 with answer and tools_used when agent is configured."""
        mock_result = {
            "answer": "User 123 has a 45% churn risk.",
            "tools_used": ["query_churn_model"],
        }
        mock_fn = MagicMock(return_value=mock_result)
        with _patch_invoke_agent(test_client, mock_fn):
            resp = test_client.post("/ask", json={"question": "What is user 123's churn risk?"})
        assert resp.status_code == 200
        data = resp.json()
        assert "45%" in data["answer"]
        assert "query_churn_model" in data["tools_used"]

    def test_ask_returns_422_missing_question(self, test_client):
        """POST /ask returns 422 when question field is missing."""
        resp = test_client.post("/ask", json={})
        assert resp.status_code == 422

    def test_ask_handles_agent_error(self, test_client):
        """POST /ask returns 500 when agent raises an exception."""
        mock_fn = MagicMock(side_effect=RuntimeError("LLM connection failed"))
        with _patch_invoke_agent(test_client, mock_fn):
            resp = test_client.post("/ask", json={"question": "test"})
        assert resp.status_code == 500
        data = resp.json()
        assert "error" in data
