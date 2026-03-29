"""LangChain tools for the search analytics assistant."""

from src.tools.ml_tools import query_churn_model, query_recommendations, query_sentiment
from src.tools.shap_tools import get_shap_explanation
from src.tools.sql_tools import run_analytics_query

ALL_TOOLS = [
    query_churn_model,
    query_sentiment,
    query_recommendations,
    run_analytics_query,
    get_shap_explanation,
]

__all__ = [
    "ALL_TOOLS",
    "get_shap_explanation",
    "query_churn_model",
    "query_recommendations",
    "query_sentiment",
    "run_analytics_query",
]
