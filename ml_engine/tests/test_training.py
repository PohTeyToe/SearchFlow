"""Tests for training data loaders and evaluation metrics."""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.training.train_sentiment import load_reviews
from src.training.train_recommender import load_booking_com_trips
from src.evaluation.metrics import ndcg_at_k


# ------------------------------------------------------------------
# load_reviews tests
# ------------------------------------------------------------------


class TestLoadReviews:
    def test_loads_csv_with_text_and_rating(self, tmp_path):
        csv_path = tmp_path / "reviews.csv"
        csv_path.write_text(
            "text,rating\n"
            "Great hotel,5\n"
            "Terrible stay,1\n"
            "It was okay,3\n"
        )
        df = load_reviews(str(tmp_path))
        assert df is not None
        assert "text" in df.columns
        assert "sentiment" in df.columns
        assert df.loc[df["text"] == "Great hotel", "sentiment"].iloc[0] == "positive"
        assert df.loc[df["text"] == "Terrible stay", "sentiment"].iloc[0] == "negative"
        assert df.loc[df["text"] == "It was okay", "sentiment"].iloc[0] == "neutral"

    def test_loads_csv_with_text_and_sentiment(self, tmp_path):
        csv_path = tmp_path / "reviews.csv"
        csv_path.write_text(
            "text,sentiment\n"
            "Loved it,positive\n"
            "Hated it,negative\n"
        )
        df = load_reviews(str(tmp_path))
        assert df is not None
        assert len(df) == 2
        assert set(df["sentiment"].unique()) == {"positive", "negative"}

    def test_star_rating_boundaries(self, tmp_path):
        csv_path = tmp_path / "reviews.csv"
        csv_path.write_text("text,rating\nr1,1\nr2,2\nr3,3\nr4,4\nr5,5\n")
        df = load_reviews(str(tmp_path))
        sentiments = dict(zip(df["text"], df["sentiment"]))
        assert sentiments["r1"] == "negative"
        assert sentiments["r2"] == "negative"
        assert sentiments["r3"] == "neutral"
        assert sentiments["r4"] == "positive"
        assert sentiments["r5"] == "positive"

    def test_returns_none_when_no_csv(self, tmp_path):
        result = load_reviews(str(tmp_path))
        assert result is None

    def test_skips_csv_without_text_column(self, tmp_path):
        csv_path = tmp_path / "other.csv"
        csv_path.write_text("name,value\nfoo,1\nbar,2\n")
        result = load_reviews(str(tmp_path))
        assert result is None


# ------------------------------------------------------------------
# load_booking_com_trips tests
# ------------------------------------------------------------------


class TestLoadBookingComTrips:
    def test_loads_simple_trips_csv(self, tmp_path):
        csv_path = tmp_path / "trips.csv"
        csv_path.write_text(
            "user_id,city_id,checkin,checkout\n"
            "u1,c1,2024-01-01,2024-01-03\n"
            "u1,c2,2024-01-05,2024-01-07\n"
            "u2,c1,2024-02-01,2024-02-03\n"
        )
        interactions = load_booking_com_trips(str(tmp_path))
        assert interactions is not None
        assert "user_id" in interactions.columns
        assert "item_id" in interactions.columns
        assert len(interactions) == 3

    def test_returns_none_when_no_data(self, tmp_path):
        result = load_booking_com_trips(str(tmp_path))
        assert result is None


# ------------------------------------------------------------------
# NDCG@K tests
# ------------------------------------------------------------------


class TestNDCG:
    def test_perfect_ranking(self):
        relevant = ["a", "b", "c"]
        recommended = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]
        score = ndcg_at_k(recommended, relevant, k=10)
        assert score == 1.0

    def test_empty_recommendations(self):
        score = ndcg_at_k([], ["a", "b"], k=10)
        assert score == 0.0

    def test_no_relevant_items_in_recommendations(self):
        score = ndcg_at_k(["d", "e", "f"], ["a", "b", "c"], k=10)
        assert score == 0.0

    def test_partial_match(self):
        score = ndcg_at_k(["a", "d", "e"], ["a", "b", "c"], k=10)
        assert 0.0 < score < 1.0
