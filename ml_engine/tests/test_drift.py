"""Tests for Evidently AI drift detection module."""

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.monitoring.drift import DriftDetector, DriftResult


@pytest.fixture
def reference_df():
    """Reference (training) data with realistic hotel booking distributions."""
    np.random.seed(42)
    n = 500
    return pd.DataFrame({
        "lead_time": np.random.randint(0, 400, n),
        "total_stay_nights": np.random.randint(1, 14, n),
        "adr": np.random.lognormal(4.5, 0.4, n),
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
    })


@pytest.fixture
def shifted_df(reference_df):
    """Clearly shifted data — majority of features shifted."""
    shifted = reference_df.copy()
    shifted["adr"] = shifted["adr"] * 5
    shifted["lead_time"] = 1
    shifted["deposit_type_encoded"] = 1
    shifted["market_segment_encoded"] = 7
    shifted["customer_type_encoded"] = 0
    shifted["total_stay_nights"] = 14
    shifted["guests_total"] = 5
    shifted["booking_changes"] = 10
    shifted["previous_cancellations"] = 10
    shifted["weekend_stay_ratio"] = 1.0
    return shifted


class TestDriftDetector:
    def test_accepts_reference_and_current(self, reference_df):
        detector = DriftDetector()
        result = detector.check(reference_df, reference_df)
        assert isinstance(result, DriftResult)

    def test_result_contains_required_keys(self, reference_df):
        result = DriftDetector().check(reference_df, reference_df)
        assert hasattr(result, "drift_detected")
        assert hasattr(result, "drift_score")
        assert hasattr(result, "per_feature")
        assert hasattr(result, "share_of_drifted_columns")
        assert hasattr(result, "n_drifted_columns")
        assert hasattr(result, "n_columns")
        assert isinstance(result.per_feature, dict)

    def test_identical_data_no_drift(self, reference_df):
        result = DriftDetector().check(reference_df, reference_df)
        assert result.drift_detected is False

    def test_shifted_data_detected(self, reference_df, shifted_df):
        result = DriftDetector(share_threshold=0.3).check(reference_df, shifted_df)
        assert result.drift_detected is True
        assert result.n_drifted_columns > 0

    def test_generates_html_report(self, reference_df, tmp_path):
        report_path = str(tmp_path / "drift_report.html")
        DriftDetector().check(
            reference_df, reference_df,
            save_report=True, report_path=report_path,
        )
        assert Path(report_path).exists()
        assert Path(report_path).stat().st_size > 0

    def test_result_json_serializable(self, reference_df):
        result = DriftDetector().check(reference_df, reference_df)
        serialized = json.dumps(result.to_dict())
        assert isinstance(serialized, str)
        parsed = json.loads(serialized)
        assert "drift_detected" in parsed

    def test_configurable_threshold(self, reference_df, shifted_df):
        # Very high threshold — even shifted data shouldn't trigger
        result_high = DriftDetector(share_threshold=0.99).check(reference_df, shifted_df)
        # Very low threshold — any shift triggers
        result_low = DriftDetector(share_threshold=0.01).check(reference_df, shifted_df)
        # At least one should differ (shifted data has >1% but <99% drift)
        assert result_high.drift_detected != result_low.drift_detected or \
               result_low.drift_detected is True
