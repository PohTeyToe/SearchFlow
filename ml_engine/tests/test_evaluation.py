"""Tests for evaluation metrics (precision@k, recall@k, ndcg@k, etc.)."""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.evaluation.metrics import (
    coverage,
    hit_rate,
    mean_average_precision,
    ndcg_at_k,
    precision_at_k,
    recall_at_k,
)

# ------------------------------------------------------------------
# precision@k
# ------------------------------------------------------------------


class TestPrecisionAtK:
    def test_perfect_precision(self) -> None:
        predicted = ["a", "b", "c"]
        actual = ["a", "b", "c"]
        assert precision_at_k(predicted, actual, k=3) == 1.0

    def test_zero_precision(self) -> None:
        predicted = ["x", "y", "z"]
        actual = ["a", "b", "c"]
        assert precision_at_k(predicted, actual, k=3) == 0.0

    def test_partial_precision(self) -> None:
        predicted = ["a", "x", "b"]
        actual = ["a", "b", "c"]
        assert precision_at_k(predicted, actual, k=3) == pytest.approx(2 / 3)

    def test_empty_predicted(self) -> None:
        assert precision_at_k([], ["a"], k=5) == 0.0

    def test_empty_actual(self) -> None:
        assert precision_at_k(["a"], [], k=5) == 0.0

    def test_k_larger_than_predicted(self) -> None:
        # k=10, only 3 predictions. Precision = hits / k = 2/10
        predicted = ["a", "b", "c"]
        actual = ["a", "b"]
        assert precision_at_k(predicted, actual, k=10) == pytest.approx(0.2)


# ------------------------------------------------------------------
# recall@k
# ------------------------------------------------------------------


class TestRecallAtK:
    def test_perfect_recall(self) -> None:
        predicted = ["a", "b", "c"]
        actual = ["a", "b"]
        assert recall_at_k(predicted, actual, k=3) == 1.0

    def test_zero_recall(self) -> None:
        predicted = ["x", "y"]
        actual = ["a", "b"]
        assert recall_at_k(predicted, actual, k=2) == 0.0

    def test_partial_recall(self) -> None:
        predicted = ["a", "x"]
        actual = ["a", "b"]
        assert recall_at_k(predicted, actual, k=2) == 0.5

    def test_empty_lists(self) -> None:
        assert recall_at_k([], [], k=5) == 0.0


# ------------------------------------------------------------------
# ndcg@k
# ------------------------------------------------------------------


class TestNdcgAtK:
    def test_perfect_ranking(self) -> None:
        predicted = ["a", "b"]
        actual = ["a", "b"]
        assert ndcg_at_k(predicted, actual, k=2) == pytest.approx(1.0)

    def test_zero_ndcg(self) -> None:
        predicted = ["x", "y"]
        actual = ["a", "b"]
        assert ndcg_at_k(predicted, actual, k=2) == 0.0

    def test_empty_lists(self) -> None:
        assert ndcg_at_k([], ["a"], k=5) == 0.0

    def test_single_hit_at_position_1(self) -> None:
        # DCG = 1/log2(2) = 1.0, IDCG = 1/log2(2) = 1.0
        predicted = ["a", "x"]
        actual = ["a"]
        assert ndcg_at_k(predicted, actual, k=2) == pytest.approx(1.0)


# ------------------------------------------------------------------
# MAP@k
# ------------------------------------------------------------------


class TestMeanAveragePrecision:
    def test_perfect_map(self) -> None:
        predicted_lists = [["a", "b"]]
        actual_lists = [["a", "b"]]
        assert mean_average_precision(predicted_lists, actual_lists, k=2) == pytest.approx(1.0)

    def test_empty_input(self) -> None:
        assert mean_average_precision([], [], k=5) == 0.0

    def test_no_hits(self) -> None:
        predicted_lists = [["x", "y"]]
        actual_lists = [["a", "b"]]
        assert mean_average_precision(predicted_lists, actual_lists, k=2) == 0.0


# ------------------------------------------------------------------
# hit_rate
# ------------------------------------------------------------------


class TestHitRate:
    def test_all_hit(self) -> None:
        predicted_lists = [["a", "b"], ["c", "d"]]
        actual_lists = [["a"], ["c"]]
        assert hit_rate(predicted_lists, actual_lists, k=2) == 1.0

    def test_no_hit(self) -> None:
        predicted_lists = [["x", "y"]]
        actual_lists = [["a"]]
        assert hit_rate(predicted_lists, actual_lists, k=2) == 0.0

    def test_partial_hit(self) -> None:
        predicted_lists = [["a"], ["x"]]
        actual_lists = [["a"], ["b"]]
        assert hit_rate(predicted_lists, actual_lists, k=1) == 0.5


# ------------------------------------------------------------------
# coverage
# ------------------------------------------------------------------


class TestCoverage:
    def test_full_coverage(self) -> None:
        predicted_lists = [["a", "b"], ["c"]]
        all_items = {"a", "b", "c"}
        assert coverage(predicted_lists, all_items, k=5) == 1.0

    def test_partial_coverage(self) -> None:
        predicted_lists = [["a"]]
        all_items = {"a", "b", "c"}
        assert coverage(predicted_lists, all_items, k=5) == pytest.approx(1 / 3)

    def test_empty_coverage(self) -> None:
        assert coverage([], {"a"}, k=5) == 0.0
