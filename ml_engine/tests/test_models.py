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
    engineer_features,
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
    """Feature matrix for churn model tests (hotel booking features)."""
    np.random.seed(42)
    n = 200
    return pd.DataFrame(
        {
            "lead_time": np.random.randint(0, 400, n),
            "total_stay_nights": np.random.randint(1, 14, n),
            "adr": np.random.uniform(30, 300, n),
            "is_repeated_guest": np.random.choice([0, 1], n, p=[0.9, 0.1]),
            "previous_cancellations": np.random.poisson(0.3, n),
            "previous_bookings_not_canceled": np.random.poisson(1, n),
            "booking_changes": np.random.poisson(0.5, n),
            "total_of_special_requests": np.random.poisson(1, n),
            "days_in_waiting_list": np.random.exponential(3, n).astype(int),
            "guests_total": np.random.randint(1, 6, n),
            "deposit_type_encoded": np.random.choice([0, 1, 2], n, p=[0.8, 0.15, 0.05]),
            "market_segment_encoded": np.random.randint(0, 8, n),
            "customer_type_encoded": np.random.randint(0, 4, n),
            "weekend_stay_ratio": np.random.uniform(0, 1, n),
        }
    )


@pytest.fixture
def churn_labels(churn_features_df: pd.DataFrame) -> pd.Series:
    np.random.seed(42)
    return pd.Series(np.random.choice([0, 1], size=len(churn_features_df), p=[0.63, 0.37]))


@pytest.fixture
def raw_bookings_df() -> pd.DataFrame:
    """Minimal raw hotel bookings DataFrame for engineer_features() tests."""
    return pd.DataFrame({
        "lead_time": [50, 200, 10],
        "stays_in_weekend_nights": [1, 0, 2],
        "stays_in_week_nights": [2, 7, 0],
        "adr": [120.0, 85.5, 200.0],
        "is_repeated_guest": [0, 1, 0],
        "previous_cancellations": [0, 2, 0],
        "previous_bookings_not_canceled": [0, 5, 0],
        "booking_changes": [1, 0, 3],
        "total_of_special_requests": [2, 0, 1],
        "days_in_waiting_list": [0, 15, 0],
        "adults": [2, 1, 2],
        "children": [0.0, 0.0, 1.0],
        "babies": [0, 0, 0],
        "deposit_type": ["No Deposit", "Non Refund", "Refundable"],
        "market_segment": ["Direct", "Online TA", "Corporate"],
        "customer_type": ["Transient", "Contract", "Group"],
        "is_canceled": [0, 1, 0],
    })


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
    def test_model_version(self):
        assert ChurnPredictor.MODEL_VERSION == "2.0"

    def test_feature_names_count(self):
        assert len(ChurnPredictor.FEATURE_NAMES) == 14

    def test_feature_names_content(self):
        expected = [
            "lead_time", "total_stay_nights", "adr", "is_repeated_guest",
            "previous_cancellations", "previous_bookings_not_canceled",
            "booking_changes", "total_of_special_requests",
            "days_in_waiting_list", "guests_total", "deposit_type_encoded",
            "market_segment_encoded", "customer_type_encoded", "weekend_stay_ratio",
        ]
        assert ChurnPredictor.FEATURE_NAMES == expected

    def test_fit_and_predict(
        self, churn_features_df: pd.DataFrame, churn_labels: pd.Series
    ) -> None:
        predictor = ChurnPredictor(n_estimators=10, max_depth=3)
        predictor.fit(churn_features_df, churn_labels)
        pred = predictor.predict("user_0", churn_features_df.iloc[0].to_dict())
        assert isinstance(pred, ChurnPrediction)
        assert 0.0 <= pred.churn_probability <= 1.0
        assert pred.risk_level in ("low", "medium", "high")

    def test_predict_proba(
        self, churn_features_df: pd.DataFrame, churn_labels: pd.Series
    ) -> None:
        predictor = ChurnPredictor(n_estimators=10, max_depth=3)
        predictor.fit(churn_features_df, churn_labels)
        probs = predictor.predict_proba(churn_features_df)
        assert len(probs) == len(churn_features_df)
        assert all(0 <= p <= 1 for p in probs)

    def test_predict_without_fit_raises(self):
        predictor = ChurnPredictor(n_estimators=10)
        with pytest.raises(Exception):
            predictor.predict_proba(pd.DataFrame({"lead_time": [1]}))

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

    def test_no_use_label_encoder_param(self):
        """Verify deprecated use_label_encoder=False is removed."""
        import inspect
        source = inspect.getsource(ChurnPredictor)
        assert "use_label_encoder" not in source


class TestEngineerFeatures:
    def test_output_columns(self, raw_bookings_df):
        result = engineer_features(raw_bookings_df)
        for col in ChurnPredictor.FEATURE_NAMES + ["is_canceled"]:
            assert col in result.columns

    def test_total_stay_nights(self, raw_bookings_df):
        result = engineer_features(raw_bookings_df)
        expected = raw_bookings_df["stays_in_weekend_nights"] + raw_bookings_df["stays_in_week_nights"]
        pd.testing.assert_series_equal(result["total_stay_nights"], expected.astype(int), check_names=False)

    def test_guests_total(self, raw_bookings_df):
        result = engineer_features(raw_bookings_df)
        expected = (raw_bookings_df["adults"] + raw_bookings_df["children"].fillna(0) + raw_bookings_df["babies"])
        pd.testing.assert_series_equal(result["guests_total"], expected.astype(int), check_names=False)

    def test_deposit_type_encoding(self, raw_bookings_df):
        result = engineer_features(raw_bookings_df)
        valid_values = {0, 1, 2}
        assert set(result["deposit_type_encoded"].unique()).issubset(valid_values)

    def test_weekend_stay_ratio_bounds(self, raw_bookings_df):
        result = engineer_features(raw_bookings_df)
        assert result["weekend_stay_ratio"].between(0, 1).all()

    def test_zero_night_stay_ratio(self):
        """When total_stay_nights is 0, weekend_stay_ratio should be 0."""
        df = pd.DataFrame({
            "lead_time": [10], "stays_in_weekend_nights": [0], "stays_in_week_nights": [0],
            "adr": [100.0], "is_repeated_guest": [0], "previous_cancellations": [0],
            "previous_bookings_not_canceled": [0], "booking_changes": [0],
            "total_of_special_requests": [0], "days_in_waiting_list": [0],
            "adults": [1], "children": [0], "babies": [0],
            "deposit_type": ["No Deposit"], "market_segment": ["Direct"],
            "customer_type": ["Transient"], "is_canceled": [0],
        })
        result = engineer_features(df)
        assert result["weekend_stay_ratio"].iloc[0] == 0.0
