"""Tests for the FastAPI application endpoints."""

from unittest.mock import patch

import pytest


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
        mock_invoke = lambda q: {
            "answer": "User 123 has a 45% churn risk.",
            "tools_used": ["query_churn_model"],
        }
        with patch("src.main.agent_invoke", mock_invoke):
            resp = test_client.post("/ask", json={"question": "What is user 123's churn risk?"})
        assert resp.status_code == 200
        data = resp.json()
        assert "45%" in data["answer"]
        assert "query_churn_model" in data["tools_used"]

    def test_ask_returns_200_without_agent(self, test_client):
        """POST /ask returns 200 with stub when agent not configured."""
        with patch("src.main.agent_invoke", None):
            resp = test_client.post("/ask", json={"question": "Hello"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["answer"] == "Agent not configured"
        assert data["tools_used"] == []

    def test_ask_returns_422_missing_question(self, test_client):
        """POST /ask returns 422 when question field is missing."""
        resp = test_client.post("/ask", json={})
        assert resp.status_code == 422

    def test_ask_handles_agent_error(self, test_client):
        """POST /ask returns 500 when agent raises an exception."""
        def failing_agent(q):
            raise RuntimeError("LLM connection failed")

        with patch("src.main.agent_invoke", failing_agent):
            resp = test_client.post("/ask", json={"question": "test"})
        assert resp.status_code == 500
        data = resp.json()
        assert "error" in data
