"""Tests for ML model inference: recommendation, sentiment, churn."""

import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

import numpy as np
import pandas as pd
import pytest

# Ensure ml_engine is importable
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.models.recommendation import (
    CollaborativeFilter,
    ContentBasedFilter,
    HybridRecommender,
    RecommendationResult,
)
from src.models.sentiment import (
    TfidfSentimentModel,
    SentimentAnalyzer,
    SentimentResult,
)
from src.models.churn import (
    ChurnPredictor,
    ChurnPrediction,
    ChurnModelMetrics,
    build_churn_features,
)


# ------------------------------------------------------------------
# Fixtures
# ------------------------------------------------------------------


@pytest.fixture
def interactions_df() -> pd.DataFrame:
    """Small interaction dataset for testing."""
    np.random.seed(42)
    rows = []
    users = [f"user_{i}" for i in range(20)]
    items = [f"item_{i}" for i in range(10)]
    for u in users:
        for it in np.random.choice(items, size=5, replace=False):
            rows.append({"user_id": u, "item_id": it, "rating": float(np.random.randint(1, 6))})
    return pd.DataFrame(rows)


@pytest.fixture
def items_df() -> pd.DataFrame:
    """Item features for content-based filtering."""
    np.random.seed(42)
    items = [f"item_{i}" for i in range(10)]
    return pd.DataFrame(
        {
            "item_id": items,
            "price_level": np.random.uniform(1, 5, 10),
            "popularity": np.random.uniform(0, 1, 10),
        }
    )


@pytest.fixture
def churn_features_df() -> pd.DataFrame:
    """Feature matrix for churn model tests."""
    np.random.seed(42)
    n = 200
    return pd.DataFrame(
        {
            "sessions_7d": np.random.poisson(2, n),
            "sessions_30d": np.random.poisson(7, n),
            "sessions_90d": np.random.poisson(15, n),
            "searches_total": np.random.poisson(20, n),
            "clicks_total": np.random.poisson(8, n),
            "conversions_total": np.random.poisson(1, n),
            "search_to_click_ratio": np.random.uniform(0.1, 0.5, n),
            "click_to_conversion_ratio": np.random.uniform(0, 0.3, n),
            "avg_session_duration_mins": np.random.uniform(5, 30, n),
            "days_since_last_activity": np.random.exponential(20, n),
            "lifetime_value": np.random.uniform(0, 2000, n),
            "unique_destinations_searched": np.random.randint(1, 10, n),
            "mobile_session_ratio": np.random.uniform(0, 1, n),
            "weekend_session_ratio": np.random.uniform(0.2, 0.4, n),
        }
    )


@pytest.fixture
def churn_labels(churn_features_df: pd.DataFrame) -> pd.Series:
    np.random.seed(42)
    return pd.Series(np.random.choice([0, 1], size=len(churn_features_df), p=[0.6, 0.4]))


@pytest.fixture
def sentiment_training_data() -> tuple:
    """Small labelled text dataset."""
    texts = [
        "Amazing hotel, loved the beach!",
        "Terrible service, will never return.",
        "It was okay, nothing special.",
        "Best vacation ever in Cancun!",
        "Dirty room and rude staff.",
        "Average trip, some good some bad.",
        "Fantastic views and great food!",
        "Worst experience. Total waste of money.",
        "The hotel was fine, fairly standard.",
        "Wonderful trip, highly recommend!",
    ]
    labels = [
        "positive", "negative", "neutral", "positive", "negative",
        "neutral", "positive", "negative", "neutral", "positive",
    ]
    return texts, labels


# ------------------------------------------------------------------
# Collaborative filtering tests
# ------------------------------------------------------------------


class TestCollaborativeFilter:
    def test_fit_creates_factors(self, interactions_df: pd.DataFrame) -> None:
        cf = CollaborativeFilter(n_factors=5)
        cf.fit(interactions_df)
        assert cf.user_factors is not None
        assert cf.item_factors is not None

    def test_predict_returns_list(self, interactions_df: pd.DataFrame) -> None:
        cf = CollaborativeFilter(n_factors=5)
        cf.fit(interactions_df)
        recs = cf.predict("user_0", top_n=3)
        assert isinstance(recs, list)
        assert len(recs) <= 3

    def test_predict_unknown_user(self, interactions_df: pd.DataFrame) -> None:
        cf = CollaborativeFilter(n_factors=5)
        cf.fit(interactions_df)
        recs = cf.predict("nonexistent_user", top_n=3)
        assert recs == []


# ------------------------------------------------------------------
# Content-based filtering tests
# ------------------------------------------------------------------


class TestContentBasedFilter:
    def test_fit_builds_similarity(self, items_df: pd.DataFrame) -> None:
        cb = ContentBasedFilter()
        cb.fit(items_df, ["price_level", "popularity"])
        assert cb.similarity_matrix is not None
        assert cb.similarity_matrix.shape == (10, 10)

    def test_predict_excludes_liked(self, items_df: pd.DataFrame) -> None:
        cb = ContentBasedFilter()
        cb.fit(items_df, ["price_level", "popularity"])
        recs = cb.predict(["item_0"], top_n=5)
        rec_ids = [r[0] for r in recs]
        assert "item_0" not in rec_ids

    def test_predict_empty_liked(self, items_df: pd.DataFrame) -> None:
        cb = ContentBasedFilter()
        cb.fit(items_df, ["price_level", "popularity"])
        assert cb.predict([], top_n=5) == []


# ------------------------------------------------------------------
# Hybrid recommender tests
# ------------------------------------------------------------------


class TestHybridRecommender:
    def test_fit_and_predict(
        self, interactions_df: pd.DataFrame, items_df: pd.DataFrame
    ) -> None:
        rec = HybridRecommender(n_factors=5)
        rec.fit(interactions_df, items_df, ["price_level", "popularity"])
        result = rec.predict("user_0", top_n=3)
        assert isinstance(result, RecommendationResult)
        assert len(result.recommendations) <= 3
        assert result.algorithm == "hybrid"

    def test_save_and_load(
        self, interactions_df: pd.DataFrame, items_df: pd.DataFrame, tmp_path
    ) -> None:
        rec = HybridRecommender(n_factors=5)
        rec.fit(interactions_df, items_df, ["price_level", "popularity"])
        rec.save(str(tmp_path / "model"))
        loaded = HybridRecommender.load(str(tmp_path / "model"))
        result = loaded.predict("user_0", top_n=3)
        assert len(result.recommendations) <= 3


# ------------------------------------------------------------------
# Sentiment model tests
# ------------------------------------------------------------------


class TestTfidfSentimentModel:
    def test_fit_and_predict(self, sentiment_training_data: tuple) -> None:
        texts, labels = sentiment_training_data
        model = TfidfSentimentModel()
        model.fit(texts, labels)
        result = model.predict("Great hotel!")
        assert isinstance(result, SentimentResult)
        assert result.sentiment in ("positive", "negative", "neutral")
        assert 0.0 <= result.confidence <= 1.0

    def test_predict_batch(self, sentiment_training_data: tuple) -> None:
        texts, labels = sentiment_training_data
        model = TfidfSentimentModel()
        model.fit(texts, labels)
        results = model.predict_batch(["Good", "Bad"])
        assert len(results) == 2

    def test_probabilities_sum_to_one(self, sentiment_training_data: tuple) -> None:
        texts, labels = sentiment_training_data
        model = TfidfSentimentModel()
        model.fit(texts, labels)
        result = model.predict("Nice place")
        total = sum(result.probabilities.values())
        assert abs(total - 1.0) < 1e-6


# ------------------------------------------------------------------
# Churn predictor tests
# ------------------------------------------------------------------


class TestChurnPredictor:
    def test_fit_and_predict(
        self, churn_features_df: pd.DataFrame, churn_labels: pd.Series
    ) -> None:
        predictor = ChurnPredictor(n_estimators=10, max_depth=3)
        predictor.fit(churn_features_df, churn_labels)
        pred = predictor.predict("user_0", churn_features_df.iloc[0].to_dict())
        assert isinstance(pred, ChurnPrediction)
        assert 0.0 <= pred.churn_probability <= 1.0
        assert pred.risk_level in ("low", "medium", "high")

    def test_evaluate_returns_metrics(
        self, churn_features_df: pd.DataFrame, churn_labels: pd.Series
    ) -> None:
        predictor = ChurnPredictor(n_estimators=10, max_depth=3)
        predictor.fit(churn_features_df, churn_labels)
        metrics = predictor.evaluate(churn_features_df, churn_labels)
        assert isinstance(metrics, ChurnModelMetrics)
        assert 0.0 <= metrics.auc <= 1.0
        assert 0.0 <= metrics.accuracy <= 1.0

    def test_feature_importance(
        self, churn_features_df: pd.DataFrame, churn_labels: pd.Series
    ) -> None:
        predictor = ChurnPredictor(n_estimators=10, max_depth=3)
        predictor.fit(churn_features_df, churn_labels)
        imp = predictor.get_feature_importance()
        assert len(imp) == 14
        assert "feature" in imp.columns
        assert "importance" in imp.columns

    def test_shap_factors_present(
        self, churn_features_df: pd.DataFrame, churn_labels: pd.Series
    ) -> None:
        predictor = ChurnPredictor(n_estimators=10, max_depth=3)
        predictor.fit(churn_features_df, churn_labels)
        pred = predictor.predict("u1", churn_features_df.iloc[0].to_dict())
        assert len(pred.top_factors) == 5
        assert all("feature" in f for f in pred.top_factors)
