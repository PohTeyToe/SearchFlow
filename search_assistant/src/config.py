"""Environment configuration for the search assistant."""

import os

ML_ENGINE_URL = os.getenv("ML_ENGINE_URL", "http://ml-engine:8000")
DUCKDB_PATH = os.getenv("DUCKDB_PATH", "/data/searchflow.duckdb")
LLM_BACKEND = os.getenv("LLM_BACKEND", "anthropic")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
SEARCH_ASSISTANT_PORT = int(os.getenv("SEARCH_ASSISTANT_PORT", "8001"))
