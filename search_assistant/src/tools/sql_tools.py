"""SQL analytics tool with hardened input validation."""

import re

import duckdb
from langchain_core.tools import tool

from src.config import DUCKDB_PATH

# Allowed schemas and tables
ALLOWED_TABLES = {
    "analytics.dim_users",
    "analytics.fct_search_funnel",
    "marketing.mart_user_segments",
    "marketing.mart_recommendations",
}

ALLOWED_SCHEMAS = {"analytics", "marketing"}

# DDL / mutation keywords (case-insensitive word boundaries)
_DDL_PATTERN = re.compile(
    r"\b(CREATE|DROP|ALTER|INSERT|UPDATE|DELETE|TRUNCATE|GRANT|REVOKE)\b",
    re.IGNORECASE,
)

# DuckDB file-reading functions
_FILE_FUNC_PATTERN = re.compile(
    r"\b(read_csv_auto|read_csv|read_parquet|read_json|read_json_auto|glob|read_text)\b",
    re.IGNORECASE,
)

MAX_QUERY_LENGTH = 2000
MAX_ROWS = 50


def _validate_query(sql: str) -> str | None:
    """Validate SQL query. Returns error message or None if valid."""
    if len(sql) > MAX_QUERY_LENGTH:
        return f"Query exceeds {MAX_QUERY_LENGTH} character limit ({len(sql)} chars)."

    if _DDL_PATTERN.search(sql):
        return "DDL and mutation statements are not allowed. Only SELECT queries are permitted."

    if _FILE_FUNC_PATTERN.search(sql):
        return "File-reading functions are not allowed."

    # Check that only allowed schemas are referenced
    # Match schema.table patterns
    table_refs = re.findall(r"(\w+)\.(\w+)", sql)
    for schema, _table in table_refs:
        if schema.lower() not in ALLOWED_SCHEMAS:
            return f"Schema '{schema}' is not in the allowlist. Allowed: {', '.join(sorted(ALLOWED_SCHEMAS))}."

    return None


@tool
def run_analytics_query(sql: str) -> str:
    """Execute a read-only SQL query against the SearchFlow analytics warehouse.

    Only SELECT queries against analytics.* and marketing.* schemas are allowed.
    Available tables: analytics.dim_users, analytics.fct_search_funnel,
    marketing.mart_user_segments, marketing.mart_recommendations.
    """
    error = _validate_query(sql)
    if error:
        return f"Query blocked: {error}"

    conn = None
    try:
        conn = duckdb.connect(DUCKDB_PATH, read_only=True)
        result = conn.execute(sql)
        columns = [desc[0] for desc in result.description]
        rows = result.fetchmany(MAX_ROWS)

        if not rows:
            return "Query returned no results."

        # Format as text table
        lines = [" | ".join(columns)]
        lines.append("-" * len(lines[0]))
        for row in rows:
            lines.append(" | ".join(str(v) for v in row))

        total = len(rows)
        if total == MAX_ROWS:
            lines.append(f"(showing first {MAX_ROWS} rows)")

        return "\n".join(lines)
    except Exception as exc:
        return f"SQL execution error: {exc}"
    finally:
        if conn is not None:
            conn.close()
