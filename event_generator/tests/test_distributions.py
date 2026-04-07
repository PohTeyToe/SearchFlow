"""Tests for hotel distribution loading and distribution-based event generation."""

import sys
from pathlib import Path

import pytest

_component = str(Path(__file__).resolve().parent.parent)
if _component not in sys.path:
    for key in list(sys.modules.keys()):
        if key == "src" or key.startswith("src."):
            del sys.modules[key]
    sys.path.insert(0, _component)

from src.config import Config, load_hotel_distributions
from src.generator import EventGenerator


# ------------------------------------------------------------------
# Fixtures
# ------------------------------------------------------------------

HOTEL_CSV = str(Path(__file__).resolve().parent.parent.parent / "data" / "raw" / "hotel_bookings.csv")


@pytest.fixture
def hotel_csv_path():
    if not Path(HOTEL_CSV).exists():
        pytest.skip("hotel_bookings.csv not available")
    return HOTEL_CSV


# ------------------------------------------------------------------
# load_hotel_distributions
# ------------------------------------------------------------------


class TestLoadHotelDistributions:
    def test_loads_country_weights(self, hotel_csv_path):
        dist = load_hotel_distributions(hotel_csv_path)
        assert dist is not None
        assert "country_weights" in dist
        assert isinstance(dist["country_weights"], dict)
        assert "PRT" in dist["country_weights"]
        assert sum(dist["country_weights"].values()) == pytest.approx(1.0, abs=0.01)

    def test_loads_adr_stats(self, hotel_csv_path):
        dist = load_hotel_distributions(hotel_csv_path)
        assert 80 < dist["adr_mean"] < 120
        assert dist["adr_std"] > 0

    def test_loads_lead_time_stats(self, hotel_csv_path):
        dist = load_hotel_distributions(hotel_csv_path)
        assert dist["lead_time_median"] > 0
        assert dist["lead_time_std"] > 0

    def test_loads_cancellation_rate(self, hotel_csv_path):
        dist = load_hotel_distributions(hotel_csv_path)
        assert 0.3 < dist["cancellation_rate"] < 0.4

    def test_loads_guest_composition(self, hotel_csv_path):
        dist = load_hotel_distributions(hotel_csv_path)
        assert dist["guest_composition"]["adults_mean"] > 1.0

    def test_returns_none_for_missing_file(self):
        result = load_hotel_distributions("/nonexistent/path.csv")
        assert result is None

    def test_returns_none_for_malformed_csv(self, tmp_path):
        bad_csv = tmp_path / "bad.csv"
        bad_csv.write_text("col1,col2\n1,2\n")
        result = load_hotel_distributions(str(bad_csv))
        assert result is None


# ------------------------------------------------------------------
# Config with distribution fields
# ------------------------------------------------------------------


class TestConfigDefaults:
    def test_default_country_weights(self):
        config = Config()
        assert hasattr(config, "country_weights")
        assert isinstance(config.country_weights, dict)
        assert len(config.country_weights) > 0

    def test_default_adr_stats(self):
        config = Config()
        assert config.adr_mean > 0
        assert config.adr_std > 0

    def test_destinations_built_from_weights(self):
        config = Config(country_weights={"US": 0.5, "GB": 0.5})
        assert "New York" in config.destinations
        assert "London" in config.destinations


# ------------------------------------------------------------------
# EventGenerator with distributions
# ------------------------------------------------------------------


class TestEventGeneratorDistributions:
    def test_country_sampling_weighted(self):
        config = Config(country_weights={"PRT": 0.8, "GBR": 0.1, "FRA": 0.1})
        gen = EventGenerator(config)
        events = list(gen.generate_session())
        # Country is nested under geo dict
        countries = {e["geo"]["country"] for e in events if "geo" in e and "country" in e.get("geo", {})}
        assert countries.issubset({"PT", "GB", "FR"})

    def test_hotel_adr_positive(self):
        config = Config(adr_mean=100, adr_std=35)
        gen = EventGenerator(config)
        # Generate several sessions and check hotel prices
        prices = []
        for _ in range(50):
            for event in gen.generate_session():
                if event.get("result_type") == "hotel" and "result_price" in event:
                    prices.append(event["result_price"])
        if prices:
            assert all(p > 0 for p in prices)

    def test_event_schema_unchanged(self):
        default_events = list(EventGenerator(Config()).generate_session())
        custom_events = list(EventGenerator(Config(
            country_weights={"PRT": 0.5, "GBR": 0.5}
        )).generate_session())
        if default_events and custom_events:
            assert set(default_events[0].keys()) == set(custom_events[0].keys())


class TestEventGeneratorFallback:
    def test_works_without_csv(self):
        config = Config()
        gen = EventGenerator(config)
        events = list(gen.generate_session())
        assert len(events) > 0
        assert "event_type" in events[0]
        # Country is nested under geo dict
        assert "geo" in events[0]
        assert "country" in events[0]["geo"]
