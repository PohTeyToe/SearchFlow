"""LLM backend selection: ChatAnthropic or ClaudeCLI fallback."""

import json
import logging
import subprocess
from typing import Any, List, Optional

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.outputs import ChatGeneration, ChatResult

from src.config import ANTHROPIC_API_KEY, LLM_BACKEND

logger = logging.getLogger(__name__)


class ClaudeCLILLM(BaseChatModel):
    """LangChain wrapper around the `claude` CLI tool."""

    @property
    def _llm_type(self) -> str:
        return "claude-cli"

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> ChatResult:
        # Build prompt from messages
        prompt = "\n".join(m.content for m in messages if isinstance(m.content, str))

        try:
            result = subprocess.run(
                ["claude", "-p", prompt, "--output-format", "json"],
                capture_output=True,
                text=True,
                timeout=60,
            )
            output = result.stdout.strip()

            # Try to parse JSON
            try:
                data = json.loads(output)
                content = data.get("result", data.get("content", output))
            except json.JSONDecodeError:
                content = output

            message = AIMessage(content=str(content))
            return ChatResult(generations=[ChatGeneration(message=message)])

        except subprocess.TimeoutExpired:
            message = AIMessage(content="Error: Claude CLI timed out after 60 seconds.")
            return ChatResult(generations=[ChatGeneration(message=message)])
        except FileNotFoundError:
            message = AIMessage(content="Error: Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code")
            return ChatResult(generations=[ChatGeneration(message=message)])


def get_llm() -> BaseChatModel:
    """Factory function to get the configured LLM backend.

    Returns ChatAnthropic if ANTHROPIC_API_KEY is set (and LLM_BACKEND != 'claude-cli'),
    otherwise ClaudeCLILLM if LLM_BACKEND == 'claude-cli', else raises ValueError.
    """
    if LLM_BACKEND == "claude-cli":
        return ClaudeCLILLM()

    if ANTHROPIC_API_KEY:
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model="claude-sonnet-4-20250514", api_key=ANTHROPIC_API_KEY)

    raise ValueError(
        "No LLM backend configured. Set ANTHROPIC_API_KEY or LLM_BACKEND=claude-cli."
    )
