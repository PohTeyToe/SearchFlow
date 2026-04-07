"""Tests for distribution shift simulation scenarios."""

import sys
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.models.churn import ChurnPredictor, engineer_features
from src.monitoring.drift import DriftDetector
from src.monitoring.scenarios import (
    SCENARIOS,
    geographic_shift_scenario,
    pandemic_scenario,
    price_inflation_scenario,
    seasonal_peak_scenario,
)

HOTEL_CSV = str(Path(__file__).resolve().parent.parent.parent / "data" / "raw" / "hotel_bookings.csv")


@pytest.fixture
def raw_df():
    if not Path(HOTEL_CSV).exists():
        pytest.skip("hotel_bookings.csv not available")
    df = pd.read_csv(HOTEL_CSV)
    df["children"] = df["children"].fillna(0)
    total = df["adults"] + df["children"] + df["babies"]
    return df[total > 0].reset_index(drop=True)


@pytest.fixture
def ref_features(raw_df):
    return engineer_features(raw_df)


class TestPandemicScenario:
    def test_high_cancellation_rate(self, raw_df):
        result = pandemic_scenario(raw_df)
        assert result["is_canceled"].mean() > 0.80

    def test_compressed_lead_time(self, raw_df):
        result = pandemic_scenario(raw_df)
        assert result["lead_time"].median() < 14


class TestSeasonalPeakScenario:
    def test_higher_adr(self, raw_df):
        ref_mean = raw_df["adr"].mean()
        result = seasonal_peak_scenario(raw_df)
        assert result["adr"].mean() > ref_mean * 1.25

    def test_more_families(self, raw_df):
        ref_ratio = (raw_df["children"].fillna(0) > 0).mean()
        result = seasonal_peak_scenario(raw_df)
        result_ratio = (result["children"].fillna(0) > 0).mean()
        assert result_ratio > ref_ratio * 1.5


class TestGeographicShiftScenario:
    def test_top_country_not_prt(self, raw_df):
        result = geographic_shift_scenario(raw_df)
        top = result["country"].value_counts().index[0]
        assert top != "PRT"

    def test_different_market_segments(self, raw_df):
        result = geographic_shift_scenario(raw_df)
        assert (result["market_segment"] == "Online TA").mean() > 0.50


class TestPriceInflationScenario:
    def test_adr_scaled_up(self, raw_df):
        ref_mean = raw_df["adr"].mean()
        result = price_inflation_scenario(raw_df)
        ratio = result["adr"].mean() / ref_mean
        assert 1.30 < ratio < 1.60

    def test_deposit_shift(self, raw_df):
        result = price_inflation_scenario(raw_df)
        non_refund_rate = (result["deposit_type"] == "Non Refund").mean()
        assert non_refund_rate > 0.40


class TestAllScenarios:
    def test_valid_dataframes(self, raw_df):
        for name, fn in SCENARIOS.items():
            result = fn(raw_df)
            features = engineer_features(result)
            for col in ChurnPredictor.FEATURE_NAMES:
                assert col in features.columns, f"{name}: missing {col}"
                assert features[col].notna().all(), f"{name}: NaN in {col}"
            assert len(features) >= 1000, f"{name}: too few rows ({len(features)})"

    def test_all_trigger_drift_detection(self, raw_df, ref_features):
        detector = DriftDetector(share_threshold=0.15)
        ref = ref_features.drop(columns=["is_canceled"])
        for name, fn in SCENARIOS.items():
            shifted = engineer_features(fn(raw_df)).drop(columns=["is_canceled"])
            result = detector.check(ref, shifted)
            assert result.n_drifted_columns > 0, f"{name}: no drifted columns"
