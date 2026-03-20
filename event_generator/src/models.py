"""Event data models for SearchFlow.

Defines the three core event types that flow through the platform:
SearchEvent, ClickEvent, and ConversionEvent.  Each event supports
serialization to dict and JSON for publishing to files, Redis, or
the console.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, TypedDict
from uuid import uuid4

# ============================================
# Typed dict shapes for serialized events
# ============================================

class GeoDict(TypedDict):
    """Geographic location attached to a search event."""
    country: str
    city: str


class SearchEventDict(TypedDict):
    """Shape returned by SearchEvent.to_dict()."""
    event_id: str
    event_type: str
    timestamp: str
    user_id: str | None
    session_id: str
    query: str
    results_count: int
    page: int
    platform: str
    device_type: str
    geo: GeoDict
    utm_source: str | None
    utm_medium: str | None
    utm_campaign: str | None
    filters: dict[str, Any]


class ClickEventDict(TypedDict):
    """Shape returned by ClickEvent.to_dict()."""
    event_id: str
    event_type: str
    timestamp: str
    user_id: str | None
    session_id: str
    search_event_id: str
    result_position: int
    result_id: str
    result_type: str
    result_price: float
    result_provider: str
    result_destination: str


class ConversionEventDict(TypedDict):
    """Shape returned by ConversionEvent.to_dict()."""
    event_id: str
    event_type: str
    timestamp: str
    user_id: str | None
    session_id: str
    click_event_id: str
    booking_value: float
    commission: float
    currency: str
    product_type: str
    provider: str


# Union of all serialized event shapes
EventDict = SearchEventDict | ClickEventDict | ConversionEventDict


@dataclass
class SearchEvent:
    """Represents a user search event."""

    query: str
    session_id: str
    event_id: str = field(default_factory=lambda: str(uuid4()))
    event_type: str = "search"
    timestamp: datetime = field(default_factory=datetime.utcnow)
    user_id: str | None = None
    results_count: int = 0
    page: int = 1
    platform: str = "web"
    device_type: str = "desktop"
    geo_country: str = "CA"
    geo_city: str = "Toronto"
    utm_source: str | None = None
    utm_medium: str | None = None
    utm_campaign: str | None = None
    filters: dict[str, Any] | None = None

    def to_dict(self) -> SearchEventDict:
        """Convert to dictionary for JSON serialization."""
        return SearchEventDict(
            event_id=self.event_id,
            event_type=self.event_type,
            timestamp=self.timestamp.isoformat() + "Z",
            user_id=self.user_id,
            session_id=self.session_id,
            query=self.query,
            results_count=self.results_count,
            page=self.page,
            platform=self.platform,
            device_type=self.device_type,
            geo=GeoDict(country=self.geo_country, city=self.geo_city),
            utm_source=self.utm_source,
            utm_medium=self.utm_medium,
            utm_campaign=self.utm_campaign,
            filters=self.filters or {},
        )

    def to_json(self) -> str:
        """Convert to JSON string."""
        return json.dumps(self.to_dict())


@dataclass
class ClickEvent:
    """Represents a user clicking on a search result."""

    search_event_id: str
    session_id: str
    result_id: str
    result_position: int
    result_type: str
    result_price: float
    result_destination: str
    event_id: str = field(default_factory=lambda: str(uuid4()))
    event_type: str = "click"
    timestamp: datetime = field(default_factory=datetime.utcnow)
    user_id: str | None = None
    result_provider: str = "default"

    def to_dict(self) -> ClickEventDict:
        """Convert to dictionary for JSON serialization."""
        return ClickEventDict(
            event_id=self.event_id,
            event_type=self.event_type,
            timestamp=self.timestamp.isoformat() + "Z",
            user_id=self.user_id,
            session_id=self.session_id,
            search_event_id=self.search_event_id,
            result_position=self.result_position,
            result_id=self.result_id,
            result_type=self.result_type,
            result_price=self.result_price,
            result_provider=self.result_provider,
            result_destination=self.result_destination,
        )

    def to_json(self) -> str:
        """Convert to JSON string."""
        return json.dumps(self.to_dict())


@dataclass
class ConversionEvent:
    """Represents a completed booking/purchase."""

    click_event_id: str
    session_id: str
    booking_value: float
    commission: float
    product_type: str
    event_id: str = field(default_factory=lambda: str(uuid4()))
    event_type: str = "conversion"
    timestamp: datetime = field(default_factory=datetime.utcnow)
    user_id: str | None = None
    currency: str = "CAD"
    provider: str = "default"

    def to_dict(self) -> ConversionEventDict:
        """Convert to dictionary for JSON serialization."""
        return ConversionEventDict(
            event_id=self.event_id,
            event_type=self.event_type,
            timestamp=self.timestamp.isoformat() + "Z",
            user_id=self.user_id,
            session_id=self.session_id,
            click_event_id=self.click_event_id,
            booking_value=self.booking_value,
            commission=self.commission,
            currency=self.currency,
            product_type=self.product_type,
            provider=self.provider,
        )

    def to_json(self) -> str:
        """Convert to JSON string."""
        return json.dumps(self.to_dict())
