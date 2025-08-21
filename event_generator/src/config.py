"""Configuration for the event generator."""

import os
from dataclasses import dataclass


@dataclass
class Config:
    """Event generator configuration."""
    
    # Redis connection
    redis_host: str = os.getenv("REDIS_HOST", "localhost")
    redis_port: int = int(os.getenv("REDIS_PORT", "6379"))
    
    # Output directory for file-based output
    output_dir: str = os.getenv("OUTPUT_DIR", "/data/raw")
    
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
    
    def __post_init__(self):
        """Set default lists after initialization."""
        if self.destinations is None:
            self.destinations = [
                "Miami", "Toronto", "NYC", "Los Angeles", "Las Vegas",
                "Cancun", "Vancouver", "Montreal", "Chicago", "Boston",
                "San Francisco", "Seattle", "Denver", "Orlando", "Hawaii"
            ]
        
        if self.platforms is None:
            self.platforms = ["web", "ios", "android"]
        
        if self.device_types is None:
            self.device_types = ["desktop", "mobile", "tablet"]
        
        if self.utm_sources is None:
            self.utm_sources = [
                "google", "facebook", "instagram", "tiktok",
                "email", "affiliate", "direct", None
            ]
        
        if self.providers is None:
            self.providers = [
                "expedia", "booking", "kayak", "priceline",
                "hotels.com", "airbnb", "vrbo", "tripadvisor"
            ]


# Global config instance
config = Config()
