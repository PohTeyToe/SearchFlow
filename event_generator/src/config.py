"""Configuration for the event generator."""

import os
from dataclasses import dataclass, field
from typing import Optional

import pandas as pd

# ── Country code mapping (ISO 3166 alpha-3 → alpha-2) ───────────────

COUNTRY_CODE_MAP = {
    "PRT": "PT", "GBR": "GB", "FRA": "FR", "ESP": "ES",
    "DEU": "DE", "ITA": "IT", "NLD": "NL", "USA": "US",
    "BRA": "BR", "CAN": "CA", "CHN": "CN", "AUT": "AT",
    "BEL": "BE", "CHE": "CH", "SWE": "SE", "IRL": "IE",
    "AUS": "AU", "AGO": "AO", "MOZ": "MZ", "ISR": "IL",
    "RUS": "RU", "POL": "PL", "NOR": "NO", "FIN": "FI",
    "ROU": "RO", "MAR": "MA", "ARG": "AR", "KOR": "KR",
    "JPN": "JP", "IND": "IN", "ZAF": "ZA", "TUR": "TR",
}

# ── Destination mapping by country ──────────────────────────────────

COUNTRY_DESTINATION_MAP = {
    "PT": ["Lisbon", "Porto"],
    "GB": ["London", "Manchester", "Edinburgh"],
    "FR": ["Paris", "Nice", "Lyon"],
    "ES": ["Madrid", "Barcelona", "Seville"],
    "DE": ["Berlin", "Munich", "Frankfurt"],
    "IT": ["Rome", "Milan", "Florence"],
    "NL": ["Amsterdam", "Rotterdam"],
    "US": ["New York", "Los Angeles", "Miami", "Las Vegas", "Chicago",
           "San Francisco", "Seattle", "Denver", "Orlando", "Boston"],
    "CA": ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"],
    "BR": ["Rio de Janeiro", "Sao Paulo"],
    "CN": ["Beijing", "Shanghai"],
    "JP": ["Tokyo", "Osaka"],
    "AU": ["Sydney", "Melbourne"],
}


def load_hotel_distributions(csv_path: str) -> Optional[dict]:
    """Extract statistical distributions from hotel_bookings.csv.

    Returns dict with keys: country_weights, adr_mean, adr_std,
    lead_time_median, lead_time_std, cancellation_rate, guest_composition.
    Returns None if file is missing or malformed.
    """
    try:
        df = pd.read_csv(csv_path)
    except (FileNotFoundError, pd.errors.EmptyDataError, Exception):
        return None

    required_cols = {"country", "adr", "lead_time", "is_canceled", "adults", "children", "babies"}
    if not required_cols.issubset(df.columns):
        return None

    # Country weights (normalized)
    country_counts = df["country"].value_counts(normalize=True)
    country_weights = country_counts.to_dict()

    # ADR statistics (exclude outliers: 0 < adr < 1000)
    valid_adr = df["adr"][(df["adr"] > 0) & (df["adr"] < 1000)]
    adr_mean = float(valid_adr.mean())
    adr_std = float(valid_adr.std())

    # Lead time
    lead_time_median = float(df["lead_time"].median())
    lead_time_std = float(df["lead_time"].std())

    # Cancellation rate
    cancellation_rate = float(df["is_canceled"].mean())

    # Guest composition
    guest_composition = {
        "adults_mean": float(df["adults"].mean()),
        "adults_std": float(df["adults"].std()),
        "children_ratio": float((df["children"].fillna(0) > 0).mean()),
        "babies_ratio": float((df["babies"] > 0).mean()),
    }

    return {
        "country_weights": country_weights,
        "adr_mean": adr_mean,
        "adr_std": adr_std,
        "lead_time_median": lead_time_median,
        "lead_time_std": lead_time_std,
        "cancellation_rate": cancellation_rate,
        "guest_composition": guest_composition,
    }


@dataclass
class Config:
    """Event generator configuration."""

    # Redis connection
    redis_host: str = os.getenv("REDIS_HOST", "localhost")
    redis_port: int = int(os.getenv("REDIS_PORT", "6379"))

    # Output directory for file-based output
    output_dir: str = os.getenv("OUTPUT_DIR", "/data/raw")

    # Kafka connection
    kafka_bootstrap_servers: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")

    # Generation rates
    events_per_second: int = int(os.getenv("EVENTS_PER_SECOND", "10"))

    # Funnel rates (industry benchmarks)
    click_through_rate: float = float(os.getenv("CLICK_THROUGH_RATE", "0.30"))
    conversion_rate: float = float(os.getenv("CONVERSION_RATE", "0.10"))

    # User simulation
    user_pool_size: int = int(os.getenv("USER_POOL_SIZE", "10000"))
    anonymous_rate: float = float(os.getenv("ANONYMOUS_RATE", "0.40"))

    # Session parameters
    max_searches_per_session: int = 5
    session_timeout_minutes: int = 30

    # Content variety
    destinations: list = None
    platforms: list = None
    device_types: list = None
    utm_sources: list = None
    providers: list = None

    # ── Distribution fields (from hotel_bookings.csv or defaults) ───
    country_weights: dict = field(default_factory=lambda: {
        "US": 0.30, "GB": 0.15, "DE": 0.10, "FR": 0.10,
        "ES": 0.08, "IT": 0.07, "CA": 0.05, "BR": 0.05,
        "PT": 0.05, "NL": 0.05,
    })
    adr_mean: float = 100.0
    adr_std: float = 35.0
    lead_time_median: float = 70.0
    lead_time_std: float = 100.0
    cancellation_rate: float = 0.37
    guest_composition: dict = field(default_factory=lambda: {
        "adults_mean": 1.85, "adults_std": 0.5,
        "children_ratio": 0.08, "babies_ratio": 0.008,
    })

    def __post_init__(self):
        """Set default lists after initialization."""
        if self.destinations is None:
            # Build destination list from country weights
            dests = set()
            for code in self.country_weights:
                code2 = COUNTRY_CODE_MAP.get(code, code)
                dests.update(COUNTRY_DESTINATION_MAP.get(code2, []))
            # Fallback if no matches
            if not dests:
                dests = {
                    "Miami", "Toronto", "NYC", "Los Angeles", "Las Vegas",
                    "Cancun", "Vancouver", "Montreal", "Chicago", "Boston",
                    "San Francisco", "Seattle", "Denver", "Orlando", "Hawaii",
                }
            self.destinations = sorted(dests)

        if self.platforms is None:
            self.platforms = ["web", "ios", "android"]

        if self.device_types is None:
            self.device_types = ["desktop", "mobile", "tablet"]

        if self.utm_sources is None:
            self.utm_sources = [
                "google", "facebook", "instagram", "tiktok",
                "email", "affiliate", "direct", None,
            ]

        if self.providers is None:
            self.providers = [
                "expedia", "booking", "kayak", "priceline",
                "hotels.com", "airbnb", "vrbo", "tripadvisor",
            ]


# Global config instance
cfg = Config()
