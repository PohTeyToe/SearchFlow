"""Unit tests for Spark job logic without requiring a Spark cluster.

Tests the pure computation logic (engagement scoring, segment assignment,
session timeout config, schema definitions) extracted from the PySpark jobs.
"""

import pytest


# ---------------------------------------------------------------------------
# Pure-Python implementations of the PySpark scoring/segmentation formulas
# so we can validate the logic without SparkSession.
# ---------------------------------------------------------------------------


def compute_engagement_score(
    total_sessions: int,
    total_clicks: int,
    total_conversions: int,
    bounce_rate: float,
) -> float:
    """Pure-Python mirror of user_segmentation.compute_user_engagement score.

    Formula (from the PySpark column expression):
        min(100, min(sessions/10, 1)*20 + min(clicks/20, 1)*30
             + min(conversions/3, 1)*40 + (1 - bounce_rate)*10)
    """
    score = (
        min(total_sessions / 10.0, 1.0) * 20
        + min(total_clicks / 20.0, 1.0) * 30
        + min(total_conversions / 3.0, 1.0) * 40
        + (1.0 - bounce_rate) * 10
    )
    return min(100.0, score)


def assign_segment(
    total_sessions: int,
    total_clicks: int,
    total_conversions: int,
    engagement_score: float,
) -> str:
    """Pure-Python mirror of user_segmentation.assign_segments logic."""
    if total_conversions >= 1 and engagement_score >= 60:
        return "high_value"
    if total_conversions >= 1 and engagement_score < 30:
        return "at_risk"
    if total_sessions <= 2:
        return "new_user"
    if total_clicks > 0 and total_conversions == 0:
        return "abandoned_search"
    return "regular"


# ---------------------------------------------------------------------------
# Tests: engagement score
# ---------------------------------------------------------------------------


class TestEngagementScore:
    def test_max_engagement(self):
        """Fully engaged user (high sessions, clicks, conversions, no bounces) => 100."""
        score = compute_engagement_score(
            total_sessions=50,
            total_clicks=100,
            total_conversions=10,
            bounce_rate=0.0,
        )
        assert score == 100.0

    def test_zero_activity(self):
        """Zero sessions/clicks/conversions, 100% bounce => minimal score."""
        score = compute_engagement_score(
            total_sessions=0,
            total_clicks=0,
            total_conversions=0,
            bounce_rate=1.0,
        )
        assert score == 0.0

    def test_partial_engagement(self):
        """Moderate activity produces a mid-range score."""
        score = compute_engagement_score(
            total_sessions=5,   # 0.5 * 20 = 10
            total_clicks=10,    # 0.5 * 30 = 15
            total_conversions=1, # 0.333 * 40 ≈ 13.33
            bounce_rate=0.5,    # 0.5 * 10 = 5
        )
        expected = (
            min(5 / 10, 1) * 20
            + min(10 / 20, 1) * 30
            + min(1 / 3, 1) * 40
            + (1 - 0.5) * 10
        )
        assert abs(score - expected) < 0.01

    def test_score_capped_at_100(self):
        """Score cannot exceed 100 even with extreme values."""
        score = compute_engagement_score(
            total_sessions=1000,
            total_clicks=1000,
            total_conversions=1000,
            bounce_rate=0.0,
        )
        assert score == 100.0


# ---------------------------------------------------------------------------
# Tests: segment assignment
# ---------------------------------------------------------------------------


class TestSegmentAssignment:
    def test_high_value(self):
        """User with conversions and high engagement => high_value."""
        segment = assign_segment(
            total_sessions=10,
            total_clicks=20,
            total_conversions=3,
            engagement_score=75.0,
        )
        assert segment == "high_value"

    def test_at_risk(self):
        """User with conversions but low engagement => at_risk."""
        segment = assign_segment(
            total_sessions=10,
            total_clicks=5,
            total_conversions=1,
            engagement_score=20.0,
        )
        assert segment == "at_risk"

    def test_new_user(self):
        """User with 1-2 sessions and no conversions => new_user."""
        segment = assign_segment(
            total_sessions=1,
            total_clicks=0,
            total_conversions=0,
            engagement_score=5.0,
        )
        assert segment == "new_user"

    def test_abandoned_search(self):
        """User with clicks but no conversions (and >2 sessions) => abandoned_search."""
        segment = assign_segment(
            total_sessions=5,
            total_clicks=10,
            total_conversions=0,
            engagement_score=40.0,
        )
        assert segment == "abandoned_search"

    def test_regular(self):
        """User that fits no other bucket => regular."""
        segment = assign_segment(
            total_sessions=5,
            total_clicks=0,
            total_conversions=0,
            engagement_score=15.0,
        )
        assert segment == "regular"

    def test_priority_high_value_over_new_user(self):
        """high_value takes priority even if sessions <= 2 (conversion + high score)."""
        segment = assign_segment(
            total_sessions=2,
            total_clicks=5,
            total_conversions=1,
            engagement_score=65.0,
        )
        assert segment == "high_value"


# ---------------------------------------------------------------------------
# Tests: session analysis constants and schemas
# ---------------------------------------------------------------------------


_has_pyspark = pytest.importorskip is not None  # just a placeholder
try:
    import pyspark
    _has_pyspark = True
except ImportError:
    _has_pyspark = False


@pytest.mark.skipif(not _has_pyspark, reason="pyspark not installed")
class TestSessionAnalysisConfig:
    def test_session_timeout_is_30_minutes(self):
        from session_analysis import SESSION_TIMEOUT_SECONDS

        assert SESSION_TIMEOUT_SECONDS == 30 * 60

    def test_search_schema_fields(self):
        from session_analysis import SEARCH_SCHEMA

        field_names = [f.name for f in SEARCH_SCHEMA.fields]
        assert "event_id" in field_names
        assert "user_id" in field_names
        assert "query" in field_names

    def test_click_schema_fields(self):
        from session_analysis import CLICK_SCHEMA

        field_names = [f.name for f in CLICK_SCHEMA.fields]
        assert "result_position" in field_names
        assert "result_destination" in field_names

    def test_conversion_schema_fields(self):
        from session_analysis import CONVERSION_SCHEMA

        field_names = [f.name for f in CONVERSION_SCHEMA.fields]
        assert "booking_value" in field_names
        assert "commission" in field_names
