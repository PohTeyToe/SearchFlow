"""SHAP explanation tool for churn model interpretability."""

import httpx
from langchain_core.tools import tool

from src.config import ML_ENGINE_URL


@tool
def get_shap_explanation(user_id: str) -> str:
    """Get a natural-language SHAP explanation for a user's churn prediction.

    Returns the top factors driving the churn score with percentage contributions.
    """
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(f"{ML_ENGINE_URL}/churn/{user_id}")
            resp.raise_for_status()
            data = resp.json()

        factors = data.get("top_factors", [])
        prob = data.get("churn_probability", 0)

        if not factors:
            return f"No SHAP explanation available for user {user_id}."

        # Normalize absolute impacts to percentages
        total_impact = sum(abs(f["impact"]) for f in factors)
        if total_impact == 0:
            return f"No significant factors found for user {user_id}."

        lines = [
            f"SHAP explanation for user {user_id} (churn probability: {prob:.1%}):",
            "",
        ]
        for f in factors:
            pct = abs(f["impact"]) / total_impact * 100
            direction = f.get("direction", "affects")
            feature = f["feature"]
            lines.append(f"  - {feature} ({pct:.1f}%): {direction} churn risk")

        return "\n".join(lines)
    except Exception as exc:
        return f"Error getting SHAP explanation for user {user_id}: {exc}"
