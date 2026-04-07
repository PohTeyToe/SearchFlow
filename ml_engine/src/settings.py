"""
Centralized configuration constants for the ML engine.

Keeps model hyperparameters, feature definitions, and serving
parameters in one place so they can be referenced by training
scripts, evaluation code, and the API server.
"""

import os
from dataclasses import dataclass, field
from typing import List


# ------------------------------------------------------------------
# Serving configuration
# ------------------------------------------------------------------

MODEL_PATH: str = os.getenv("MODEL_PATH", "./models")
REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
CACHE_TTL: int = int(os.getenv("CACHE_TTL", "3600"))
API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
API_PORT: int = int(os.getenv("API_PORT", "8000"))


# ------------------------------------------------------------------
# Recommendation model
# ------------------------------------------------------------------

@dataclass(frozen=True)
class RecommenderConfig:
    """Hyperparameters for the hybrid recommendation model."""

    # Collaborative filtering
    n_components: int = 50
    cf_weight: float = 0.6

    # Content-based filtering
    cb_weight: float = 0.4
    tfidf_max_features: int = 5000

    # Cold-start threshold: users with fewer interactions
    # fall back to popularity-based ranking
    cold_start_threshold: int = 5

    # Serving
    default_top_n: int = 10
    max_top_n: int = 50


RECOMMENDER = RecommenderConfig()


# ------------------------------------------------------------------
# Sentiment model
# ------------------------------------------------------------------

@dataclass(frozen=True)
class SentimentConfig:
    """Hyperparameters for the sentiment analysis model."""

    # TF-IDF fallback
    tfidf_max_features: int = 10000
    tfidf_ngram_range: tuple = (1, 2)

    # DistilBERT
    pretrained_model: str = "distilbert-base-uncased"
    max_sequence_length: int = 256
    learning_rate: float = 2e-5
    epochs: int = 3
    batch_size: int = 16

    # Labels
    labels: tuple = ("positive", "negative", "neutral")

    # Maximum text length accepted by the API
    max_text_length: int = 5000
    max_batch_size: int = 100


SENTIMENT = SentimentConfig()


# ------------------------------------------------------------------
# Churn model
# ------------------------------------------------------------------

CHURN_FEATURE_NAMES: List[str] = [
    "lead_time",
    "total_stay_nights",
    "adr",
    "is_repeated_guest",
    "previous_cancellations",
    "previous_bookings_not_canceled",
    "booking_changes",
    "total_of_special_requests",
    "days_in_waiting_list",
    "guests_total",
    "deposit_type_encoded",
    "market_segment_encoded",
    "customer_type_encoded",
    "weekend_stay_ratio",
]


@dataclass(frozen=True)
class ChurnConfig:
    """Hyperparameters for the churn prediction model."""

    feature_names: tuple = tuple(CHURN_FEATURE_NAMES)

    # XGBoost parameters
    n_estimators: int = 200
    max_depth: int = 6
    learning_rate: float = 0.1
    subsample: float = 0.8
    colsample_bytree: float = 0.8
    scale_pos_weight: float = 2.0

    # Risk level thresholds
    low_risk_threshold: float = 0.30
    high_risk_threshold: float = 0.70

    # SHAP
    top_factors_count: int = 5

    # Churn window: user is considered churned if no activity
    # within this many days
    churn_window_days: int = 30


CHURN = ChurnConfig()
