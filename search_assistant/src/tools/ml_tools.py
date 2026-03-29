"""ML API tools for querying churn, sentiment, and recommendations."""

import httpx
from langchain_core.tools import tool

from src.config import ML_ENGINE_URL


@tool
def query_churn_model(user_id: str) -> str:
    """Query the churn prediction model for a specific user.

    Returns the churn probability, risk level, and top contributing factors.
    """
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(f"{ML_ENGINE_URL}/churn/{user_id}")
            resp.raise_for_status()
            data = resp.json()

        prob = data.get("churn_probability", 0)
        risk = data.get("risk_level", "unknown")
        factors = data.get("top_factors", [])

        lines = [
            f"Churn prediction for user {user_id}:",
            f"  Probability: {prob:.1%}",
            f"  Risk level: {risk}",
        ]
        if factors:
            lines.append("  Top factors:")
            for f in factors[:5]:
                lines.append(
                    f"    - {f['feature']}: impact {f['impact']:.3f} ({f['direction']})"
                )
        return "\n".join(lines)
    except Exception as exc:
        return f"Error querying churn model for user {user_id}: {exc}"


@tool
def query_sentiment(text: str) -> str:
    """Analyze the sentiment of a piece of text.

    Returns the sentiment label (positive/negative/neutral) and confidence score.
    """
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(f"{ML_ENGINE_URL}/sentiment", json={"text": text})
            resp.raise_for_status()
            data = resp.json()

        sentiment = data.get("sentiment", "unknown")
        confidence = data.get("confidence", 0)
        return f"Sentiment: {sentiment} (confidence: {confidence:.1%})"
    except Exception as exc:
        return f"Error analyzing sentiment: {exc}"


@tool
def query_recommendations(user_id: str) -> str:
    """Get personalized travel recommendations for a user.

    Returns a ranked list of destinations with relevance scores.
    """
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(f"{ML_ENGINE_URL}/recommend/{user_id}")
            resp.raise_for_status()
            data = resp.json()

        recs = data.get("recommendations", [])
        if not recs:
            return f"No recommendations found for user {user_id}."

        lines = [f"Recommendations for user {user_id}:"]
        for r in recs:
            dest = r.get("destination", "Unknown")
            score = r.get("score", 0)
            lines.append(f"  - {dest} (score: {score:.2f})")
        return "\n".join(lines)
    except Exception as exc:
        return f"Error getting recommendations for user {user_id}: {exc}"
