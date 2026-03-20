"""Tests for event data models and funnel simulation."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.config import Config
from src.generator import EventGenerator
from src.models import ClickEvent, ConversionEvent, SearchEvent

# ------------------------------------------------------------------
# SearchEvent tests
# ------------------------------------------------------------------


class TestSearchEvent:
    def test_default_event_type(self) -> None:
        se = SearchEvent(query="flights to Miami", session_id="s1")
        assert se.event_type == "search"

    def test_event_id_unique(self) -> None:
        a = SearchEvent(query="a", session_id="s1")
        b = SearchEvent(query="b", session_id="s1")
        assert a.event_id != b.event_id

    def test_geo_in_dict(self) -> None:
        se = SearchEvent(query="test", session_id="s1", geo_country="US", geo_city="NYC")
        d = se.to_dict()
        assert d["geo"]["country"] == "US"
        assert d["geo"]["city"] == "NYC"

    def test_filters_default_empty(self) -> None:
        se = SearchEvent(query="test", session_id="s1")
        d = se.to_dict()
        assert d["filters"] == {}

    def test_json_roundtrip(self) -> None:
        se = SearchEvent(query="hotels in Toronto", session_id="s1", user_id="u1")
        j = se.to_json()
        parsed = json.loads(j)
        assert parsed["query"] == "hotels in Toronto"
        assert parsed["user_id"] == "u1"


# ------------------------------------------------------------------
# ClickEvent tests
# ------------------------------------------------------------------


class TestClickEvent:
    def test_default_event_type(self) -> None:
        ce = ClickEvent(
            search_event_id="se1",
            session_id="s1",
            result_id="r1",
            result_position=1,
            result_type="flight",
            result_price=200.0,
            result_destination="Miami",
        )
        assert ce.event_type == "click"

    def test_price_preserved(self) -> None:
        ce = ClickEvent(
            search_event_id="se1", session_id="s1",
            result_id="r1", result_position=3,
            result_type="hotel", result_price=149.99,
            result_destination="Toronto",
        )
        d = ce.to_dict()
        assert d["result_price"] == 149.99
        assert d["result_position"] == 3


# ------------------------------------------------------------------
# ConversionEvent tests
# ------------------------------------------------------------------


class TestConversionEvent:
    def test_default_currency(self) -> None:
        cv = ConversionEvent(
            click_event_id="ce1", session_id="s1",
            booking_value=500.0, commission=50.0,
            product_type="flight",
        )
        assert cv.currency == "CAD"

    def test_commission_in_dict(self) -> None:
        cv = ConversionEvent(
            click_event_id="ce1", session_id="s1",
            booking_value=1000.0, commission=120.0,
            product_type="package",
        )
        d = cv.to_dict()
        assert d["commission"] == 120.0


# ------------------------------------------------------------------
# Funnel simulation tests
# ------------------------------------------------------------------


class TestFunnelSimulation:
    """Verify funnel ratios roughly match configured rates over many sessions."""

    def test_funnel_produces_search_click_conversion(self) -> None:
        """With high rates, a batch of sessions should contain all event types."""
        cfg = Config(
            click_through_rate=0.9,
            conversion_rate=0.9,
            anonymous_rate=0.0,
            user_pool_size=10,
        )
        gen = EventGenerator(cfg)
        all_events = []
        for _ in range(50):
            all_events.extend(gen.generate_session())

        types = {e["event_type"] for e in all_events}
        assert "search" in types
        assert "click" in types
        assert "conversion" in types

    def test_zero_click_rate_produces_no_clicks(self) -> None:
        cfg = Config(
            click_through_rate=0.0,
            conversion_rate=0.5,
            anonymous_rate=0.0,
            user_pool_size=10,
        )
        gen = EventGenerator(cfg)
        all_events = []
        for _ in range(30):
            all_events.extend(gen.generate_session())

        clicks = [e for e in all_events if e["event_type"] == "click"]
        conversions = [e for e in all_events if e["event_type"] == "conversion"]
        assert len(clicks) == 0
        assert len(conversions) == 0

    def test_session_events_share_session_id(self) -> None:
        cfg = Config(anonymous_rate=0.0, user_pool_size=10)
        gen = EventGenerator(cfg)
        events = list(gen.generate_session())
        session_ids = {e["session_id"] for e in events}
        assert len(session_ids) == 1


# ------------------------------------------------------------------
# Config tests
# ------------------------------------------------------------------


class TestConfig:
    def test_default_destinations(self) -> None:
        cfg = Config()
        assert len(cfg.destinations) > 0
        assert "Miami" in cfg.destinations

    def test_default_platforms(self) -> None:
        cfg = Config()
        assert "web" in cfg.platforms

    def test_custom_pool_size(self) -> None:
        cfg = Config(user_pool_size=50)
        assert cfg.user_pool_size == 50
