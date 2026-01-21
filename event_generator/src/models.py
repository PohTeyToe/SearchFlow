"""Event data models for SearchFlow."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import uuid4
import json


@dataclass
class SearchEvent:
    """Represents a user search event."""
    
    query: str
    session_id: str
    event_id: str = field(default_factory=lambda: str(uuid4()))
    event_type: str = "search"
    timestamp: datetime = field(default_factory=datetime.utcnow)
    user_id: Optional[str] = None
    results_count: int = 0
    page: int = 1
    platform: str = "web"
    device_type: str = "desktop"
    geo_country: str = "CA"
    geo_city: str = "Toronto"
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "timestamp": self.timestamp.isoformat() + "Z",
            "user_id": self.user_id,
            "session_id": self.session_id,
            "query": self.query,
            "results_count": self.results_count,
            "page": self.page,
            "platform": self.platform,
            "device_type": self.device_type,
            "geo": {
                "country": self.geo_country,
                "city": self.geo_city
            },
            "utm_source": self.utm_source,
            "utm_medium": self.utm_medium,
            "utm_campaign": self.utm_campaign,
            "filters": self.filters or {}
        }
    
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
    user_id: Optional[str] = None
    result_provider: str = "default"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "timestamp": self.timestamp.isoformat() + "Z",
            "user_id": self.user_id,
            "session_id": self.session_id,
            "search_event_id": self.search_event_id,
            "result_position": self.result_position,
            "result_id": self.result_id,
            "result_type": self.result_type,
            "result_price": self.result_price,
            "result_provider": self.result_provider,
            "result_destination": self.result_destination
        }
    
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
    user_id: Optional[str] = None
    currency: str = "CAD"
    provider: str = "default"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "timestamp": self.timestamp.isoformat() + "Z",
            "user_id": self.user_id,
            "session_id": self.session_id,
            "click_event_id": self.click_event_id,
            "booking_value": self.booking_value,
            "commission": self.commission,
            "currency": self.currency,
            "product_type": self.product_type,
            "provider": self.provider
        }
    
    def to_json(self) -> str:
        """Convert to JSON string."""
        return json.dumps(self.to_dict())
