"""Tests for the LLM backend selection and ClaudeCLILLM."""

import json
from unittest.mock import patch, MagicMock

import pytest
from langchain_core.messages import HumanMessage

from src.llm_backend import ClaudeCLILLM, get_llm


class TestClaudeCLILLM:
    def test_llm_type(self):
        llm = ClaudeCLILLM()
        assert llm._llm_type == "claude-cli"

    def test_calls_subprocess(self):
        llm = ClaudeCLILLM()
        mock_result = MagicMock()
        mock_result.stdout = json.dumps({"result": "Hello from Claude CLI"})

        with patch("src.llm_backend.subprocess.run", return_value=mock_result) as mock_run:
            result = llm._generate([HumanMessage(content="Hello")])

        mock_run.assert_called_once()
        call_args = mock_run.call_args
        assert "claude" in call_args[0][0]
        assert "--output-format" in call_args[0][0]
        assert "json" in call_args[0][0]

    def test_parses_json_response(self):
        llm = ClaudeCLILLM()
        mock_result = MagicMock()
        mock_result.stdout = json.dumps({"result": "Analysis complete"})

        with patch("src.llm_backend.subprocess.run", return_value=mock_result):
            result = llm._generate([HumanMessage(content="Analyze")])

        assert result.generations[0].message.content == "Analysis complete"

    def test_handles_timeout(self):
        import subprocess
        llm = ClaudeCLILLM()

        with patch("src.llm_backend.subprocess.run", side_effect=subprocess.TimeoutExpired("claude", 60)):
            result = llm._generate([HumanMessage(content="Hello")])

        assert "timed out" in result.generations[0].message.content

    def test_handles_plain_text_response(self):
        llm = ClaudeCLILLM()
        mock_result = MagicMock()
        mock_result.stdout = "Just plain text response"

        with patch("src.llm_backend.subprocess.run", return_value=mock_result):
            result = llm._generate([HumanMessage(content="Hello")])

        assert result.generations[0].message.content == "Just plain text response"


class TestGetLLM:
    def test_returns_claude_cli_when_configured(self):
        with patch("src.llm_backend.LLM_BACKEND", "claude-cli"):
            llm = get_llm()
        assert isinstance(llm, ClaudeCLILLM)

    def test_returns_chat_anthropic_with_api_key(self):
        with patch("src.llm_backend.ANTHROPIC_API_KEY", "sk-test-key"), \
             patch("src.llm_backend.LLM_BACKEND", "anthropic"):
            with patch("langchain_anthropic.ChatAnthropic") as mock_cls:
                mock_cls.return_value = MagicMock()
                llm = get_llm()
                mock_cls.assert_called_once_with(
                    model="claude-sonnet-4-20250514", api_key="sk-test-key"
                )

    def test_raises_when_no_backend_configured(self):
        with patch("src.llm_backend.ANTHROPIC_API_KEY", ""), \
             patch("src.llm_backend.LLM_BACKEND", "anthropic"):
            with pytest.raises(ValueError, match="No LLM backend configured"):
                get_llm()
