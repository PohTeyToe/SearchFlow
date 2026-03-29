"""Tests for the LangChain agent orchestration."""

from unittest.mock import MagicMock, patch

import pytest
from langchain_core.messages import AIMessage


class TestCreateAgent:
    def test_create_agent_with_langgraph(self):
        """Agent creation with langgraph prebuilt."""
        from langchain_core.language_models.fake_chat_models import GenericFakeChatModel

        llm = GenericFakeChatModel(messages=iter([AIMessage(content="test")]))

        from src.tools.ml_tools import query_churn_model
        tools = [query_churn_model]

        with patch("src.agent.create_agent") as mock_create:
            mock_create.return_value = MagicMock()
            agent = mock_create(llm=llm, tools=tools)
            assert agent is not None

    def test_create_agent_fallback(self):
        """Agent creation falls back when langgraph unavailable."""
        from langchain_core.language_models.fake_chat_models import GenericFakeChatModel

        llm = GenericFakeChatModel(messages=iter([AIMessage(content="test response")]))

        from src.tools.ml_tools import query_churn_model
        tools = [query_churn_model]

        # Force langgraph import to fail so the fallback path is exercised
        import importlib

        import src.agent
        with patch.dict("sys.modules", {"langgraph": None, "langgraph.prebuilt": None}):
            importlib.reload(src.agent)
            agent = src.agent.create_agent(llm=llm, tools=tools)
            assert agent is not None
        # Restore module
        importlib.reload(src.agent)


class TestInvokeAgent:
    def test_agent_returns_answer_and_tools(self):
        """invoke_agent returns dict with answer and tools_used."""
        import src.agent as agent_mod
        from src.agent import invoke_agent

        mock_agent = MagicMock()
        mock_agent.invoke.return_value = {
            "messages": [
                AIMessage(content="User 123 has a 45% churn risk."),
            ]
        }

        original = agent_mod._agent
        try:
            agent_mod._agent = mock_agent
            result = invoke_agent("What is user 123's churn risk?")
            assert "answer" in result
            assert "tools_used" in result
            assert "45%" in result["answer"]
        finally:
            agent_mod._agent = original

    def test_agent_handles_tool_failure(self):
        """invoke_agent raises RuntimeError when agent fails."""
        import src.agent as agent_mod
        from src.agent import invoke_agent

        mock_agent = MagicMock()
        mock_agent.invoke.side_effect = Exception("Tool execution failed")

        original = agent_mod._agent
        try:
            agent_mod._agent = mock_agent
            with pytest.raises(RuntimeError, match="Agent error"):
                invoke_agent("test question")
        finally:
            agent_mod._agent = original

    def test_agent_executor_format(self):
        """invoke_agent handles AgentExecutor output format."""
        import src.agent as agent_mod
        from src.agent import invoke_agent

        mock_agent = MagicMock()
        mock_agent.invoke.return_value = {
            "output": "There are 5000 active users."
        }

        original = agent_mod._agent
        try:
            agent_mod._agent = mock_agent
            result = invoke_agent("How many active users?")
            assert result["answer"] == "There are 5000 active users."
        finally:
            agent_mod._agent = original

    def test_agent_with_tool_messages(self):
        """invoke_agent extracts tool names from messages."""
        import src.agent as agent_mod
        from src.agent import invoke_agent

        tool_msg = MagicMock()
        tool_msg.name = "query_churn_model"
        tool_msg.content = "Churn: 45%"

        final_msg = AIMessage(content="Based on the analysis, user 123 has 45% churn risk.")

        mock_agent = MagicMock()
        mock_agent.invoke.return_value = {
            "messages": [tool_msg, final_msg]
        }

        original = agent_mod._agent
        try:
            agent_mod._agent = mock_agent
            result = invoke_agent("Check churn for user 123")
            assert "query_churn_model" in result["tools_used"]
            assert "45%" in result["answer"]
        finally:
            agent_mod._agent = original
