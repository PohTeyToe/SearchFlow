"""FastAPI application for the search analytics assistant."""

import logging
from typing import Optional, Callable

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from src.config import LLM_BACKEND

logger = logging.getLogger(__name__)

# Module-level callable — wired by agent.py on import
agent_invoke: Optional[Callable] = None


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str
    tools_used: list[str]


app = FastAPI(
    title="SearchFlow Search Assistant",
    description="LangChain-powered analytics assistant for SearchFlow",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "llm_backend": LLM_BACKEND,
        "version": "1.0.0",
    }


@app.post("/ask", response_model=AskResponse)
async def ask(request: AskRequest):
    """Ask the search analytics assistant a question."""
    import src.main as _self
    _invoke = _self.agent_invoke
    if _invoke is None:
        return AskResponse(answer="Agent not configured", tools_used=[])
    try:
        result = _invoke(request.question)
        return AskResponse(
            answer=result.get("answer", "No answer"),
            tools_used=result.get("tools_used", []),
        )
    except Exception as exc:
        logger.exception("Agent error")
        return JSONResponse(
            status_code=500,
            content={"error": str(exc)},
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
