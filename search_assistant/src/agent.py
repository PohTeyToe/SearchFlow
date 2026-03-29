"""LangChain agent orchestration for the search analytics assistant."""

import logging

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.tools import BaseTool

logger = logging.getLogger(__name__)

# Cached agent instance
_agent = None

SYSTEM_PROMPT = (
    "You are a search analytics assistant for SearchFlow, a travel search platform. "
    "You help analysts understand user behavior, churn risk, sentiment, and recommendations. "
    "Use the available tools to query ML models and the analytics warehouse. "
    "Always provide clear, actionable insights based on the data."
)


def create_agent(llm: BaseChatModel | None = None, tools: list[BaseTool] | None = None):
    """Create a LangChain agent with the given LLM and tools.

    Tries langgraph's create_react_agent first, falls back to
    langchain AgentExecutor with create_tool_calling_agent.
    """
    if llm is None:
        from src.llm_backend import get_llm
        llm = get_llm()

    if tools is None:
        from src.tools import ALL_TOOLS
        tools = ALL_TOOLS

    # Try langgraph first
    try:
        from langgraph.prebuilt import create_react_agent as _create_react
        agent = _create_react(llm, tools, prompt=SYSTEM_PROMPT)
        logger.info("Created langgraph react agent")
        return agent
    except ImportError:
        logger.info("langgraph not available, falling back to AgentExecutor")
    except Exception as exc:
        logger.warning("langgraph agent creation failed: %s", exc)

    # Fallback to langchain AgentExecutor
    try:
        from langchain.agents import AgentExecutor, create_tool_calling_agent
        from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

        prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

        agent_core = create_tool_calling_agent(llm, tools, prompt)
        executor = AgentExecutor(agent=agent_core, tools=tools, verbose=False)
        logger.info("Created langchain AgentExecutor")
        return executor
    except ImportError:
        logger.info("create_tool_calling_agent not available, using simple tool-calling wrapper")

    # Minimal fallback: just wrap llm with tools if possible
    from langchain_core.runnables import RunnableLambda

    try:
        llm_with_tools = llm.bind_tools(tools) if tools else llm
    except NotImplementedError:
        llm_with_tools = llm

    def _simple_invoke(input_dict):
        messages = input_dict.get("messages", [])
        result = llm_with_tools.invoke(messages)
        return {"messages": [*messages, result]}

    logger.info("Created simple tool-calling wrapper")
    return RunnableLambda(_simple_invoke)


def invoke_agent(question: str) -> dict:
    """Invoke the agent with a question and return the answer.

    Returns dict with 'answer' (str) and 'tools_used' (list[str]).
    """
    global _agent
    if _agent is None:
        _agent = create_agent()

    try:
        # langgraph agent returns dict with "messages" key
        result = _agent.invoke({"messages": [("human", question)]})

        if isinstance(result, dict):
            # langgraph format
            if "messages" in result:
                messages = result["messages"]
                answer = messages[-1].content if messages else "No response"
                tools_used = [
                    m.name for m in messages
                    if hasattr(m, "name") and m.name
                ]
                return {"answer": answer, "tools_used": tools_used}

            # AgentExecutor format
            answer = result.get("output", str(result))
            return {"answer": answer, "tools_used": []}

        return {"answer": str(result), "tools_used": []}

    except Exception as exc:
        logger.exception("Agent invocation failed")
        raise RuntimeError(f"Agent error: {exc}") from exc
