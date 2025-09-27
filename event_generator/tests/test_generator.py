"""Tests for the event generator: generation logic, schema validation, output modes."""

import sys
import json
import tempfile
from pathlib import Path
from datetime import datetime
from unittest.mock import patch, MagicMock

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.config import Config
from src.generator import EventGenerator
from src.models import SearchEvent, ClickEvent, ConversionEvent
from src.publishers import (
    FilePublisher,
    ConsolePublisher,
    MultiPublisher,
    create_publisher,
)


# ------------------------------------------------------------------
# Fixtures
# ------------------------------------------------------------------


@pytest.fixture
def config() -> Config:
    return Config(
        user_pool_size=100,
        events_per_second=5,
        click_through_rate=0.5,
        conversion_rate=0.3,
        anonymous_rate=0.0,
    )


@pytest.fixture
def generator(config: Config) -> EventGenerator:
    return EventGenerator(config)


# ------------------------------------------------------------------
# EventGenerator tests
# ------------------------------------------------------------------


class TestEventGenerator:
    def test_generate_session_yields_events(self, generator: EventGenerator) -> None:
        events = list(generator.generate_session())
        assert len(events) > 0

    def test_session_starts_with_search(self, generator: EventGenerator) -> None:
        events = list(generator.generate_session())
        assert events[0]["event_type"] == "search"

    def test_all_events_have_required_fields(self, generator: EventGenerator) -> None:
        for event in generator.generate_session():
            assert "event_id" in event
            assert "event_type" in event
            assert "timestamp" in event
            assert "session_id" in event

    def test_event_types_are_valid(self, generator: EventGenerator) -> None:
        valid_types = {"search", "click", "conversion"}
        for event in generator.generate_session():
            assert event["event_type"] in valid_types

    def test_search_event_has_query(self, generator: EventGenerator) -> None:
        events = list(generator.generate_session())
        search_events = [e for e in events if e["event_type"] == "search"]
        for s in search_events:
            assert "query" in s
            assert len(s["query"]) > 0

    def test_click_event_has_search_id(self, generator: EventGenerator) -> None:
        # Run many sessions to get clicks
        for _ in range(20):
            events = list(generator.generate_session())
            clicks = [e for e in events if e["event_type"] == "click"]
            for c in clicks:
                assert "search_event_id" in c

    def test_conversion_event_has_value(self, generator: EventGenerator) -> None:
        for _ in range(50):
            events = list(generator.generate_session())
            conversions = [e for e in events if e["event_type"] == "conversion"]
            for cv in conversions:
                assert "booking_value" in cv
                assert cv["booking_value"] > 0

    def test_anonymous_users_when_configured(self) -> None:
        anon_config = Config(anonymous_rate=1.0, user_pool_size=10)
        gen = EventGenerator(anon_config)
        events = list(gen.generate_session())
        for e in events:
            assert e.get("user_id") is None

    def test_logged_in_users_when_configured(self) -> None:
        logged_config = Config(anonymous_rate=0.0, user_pool_size=10)
        gen = EventGenerator(logged_config)
        events = list(gen.generate_session())
        for e in events:
            assert e["user_id"] is not None


# ------------------------------------------------------------------
# Schema validation tests
# ------------------------------------------------------------------


class TestEventSchemas:
    def test_search_event_to_dict(self) -> None:
        se = SearchEvent(
            query="flights to Miami",
            session_id="sess_1",
            user_id="u1",
        )
        d = se.to_dict()
        assert d["event_type"] == "search"
        assert "event_id" in d
        assert d["query"] == "flights to Miami"

    def test_search_event_to_json(self) -> None:
        se = SearchEvent(query="test", session_id="s1")
        j = se.to_json()
        parsed = json.loads(j)
        assert parsed["event_type"] == "search"

    def test_click_event_to_dict(self) -> None:
        ce = ClickEvent(
            search_event_id="se1",
            session_id="s1",
            result_id="r1",
            result_position=1,
            result_type="flight",
            result_price=299.99,
            result_destination="Miami",
        )
        d = ce.to_dict()
        assert d["event_type"] == "click"
        assert d["result_price"] == 299.99

    def test_conversion_event_to_dict(self) -> None:
        cv = ConversionEvent(
            click_event_id="ce1",
            session_id="s1",
            booking_value=450.0,
            commission=45.0,
            product_type="flight",
        )
        d = cv.to_dict()
        assert d["event_type"] == "conversion"
        assert d["booking_value"] == 450.0
        assert d["currency"] == "CAD"

    def test_timestamp_format(self) -> None:
        se = SearchEvent(query="test", session_id="s1")
        d = se.to_dict()
        assert d["timestamp"].endswith("Z")


# ------------------------------------------------------------------
# Publisher tests
# ------------------------------------------------------------------


class TestPublishers:
    def test_file_publisher_writes(self, tmp_path: Path) -> None:
        pub = FilePublisher(output_dir=str(tmp_path))
        pub.publish({"event_type": "search", "data": "test"})
        pub.close()
        outfile = tmp_path / "search_events.jsonl"
        assert outfile.exists()
        lines = outfile.read_text().strip().split("\n")
        assert len(lines) == 1

    def test_console_publisher_no_error(self) -> None:
        pub = ConsolePublisher(pretty=False)
        pub.publish({"event_type": "search", "event_id": "abc12345", "query": "test"})
        pub.close()

    def test_create_publisher_file(self) -> None:
        with tempfile.TemporaryDirectory() as d:
            pub = create_publisher("file", output_dir=d)
            assert isinstance(pub, FilePublisher)
            pub.close()

    def test_create_publisher_console(self) -> None:
        pub = create_publisher("console")
        assert isinstance(pub, ConsolePublisher)

    def test_create_publisher_invalid(self) -> None:
        with pytest.raises(ValueError):
            create_publisher("invalid_type")
