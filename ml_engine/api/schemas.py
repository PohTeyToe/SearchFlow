"""
Pydantic schemas for ML API requests and responses.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from enum import Enum


# ============================================
# Enums
# ============================================

class SentimentLabel(str, Enum):
    positive = "positive"
    negative = "negative"
    neutral = "neutral"


class RiskLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


# ============================================
# Recommendations
# ============================================

class RecommendationRequest(BaseModel):
    """Request for personalized recommendations."""
    top_n: int = Field(default=10, ge=1, le=50, description="Number of recommendations")


class RecommendationItem(BaseModel):
    """Single recommendation item."""
    item_id: str
    destination: str
    score: float


class RecommendationResponse(BaseModel):
    """Response with recommendations."""
    user_id: str
    recommendations: List[RecommendationItem]
    algorithm: str = "hybrid"
    cached: bool = False


# ============================================
# Sentiment Analysis
# ============================================

class SentimentRequest(BaseModel):
    """Request for sentiment classification."""
    text: str = Field(..., min_length=1, max_length=5000, description="Review text")


class SentimentResponse(BaseModel):
    """Response with sentiment prediction."""
    text: str
    sentiment: SentimentLabel
    confidence: float = Field(..., ge=0, le=1)
    probabilities: Dict[str, float]


class BatchSentimentRequest(BaseModel):
    """Request for batch sentiment classification."""
    texts: List[str] = Field(..., max_length=100)


class BatchSentimentResponse(BaseModel):
    """Response with batch predictions."""
    results: List[SentimentResponse]
    count: int


# ============================================
# Churn Prediction
# ============================================

class ChurnFactor(BaseModel):
    """SHAP explanation factor."""
    feature: str
    impact: float
    direction: str
    value: float


class ChurnRequest(BaseModel):
    """Request for churn prediction (optional feature override)."""
    features: Optional[Dict[str, float]] = None


class ChurnResponse(BaseModel):
    """Response with churn prediction and explanations."""
    user_id: str
    churn_probability: float = Field(..., ge=0, le=1)
    risk_level: RiskLevel
    top_factors: List[ChurnFactor]
    cached: bool = False


# ============================================
# Health Check
# ============================================

class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "healthy"
    models_loaded: Dict[str, bool]
    version: str = "1.0.0"


class ModelInfo(BaseModel):
    """Information about a loaded model."""
    name: str
    loaded: bool
    path: str
    metrics: Optional[Dict[str, float]] = None
