"""Event generation logic for SearchFlow."""

import random
from datetime import datetime, timedelta
from typing import Generator, List, Dict, Any, Optional
from uuid import uuid4

from .models import SearchEvent, ClickEvent, ConversionEvent
from .config import Config


class EventGenerator:
    """Generates realistic search, click, and conversion events."""
    
    def __init__(self, config: Config):
        self.config = config
        self.user_pool = [f"user_{i}" for i in range(config.user_pool_size)]
        
        # Query templates
        self.query_templates = [
            "cheap flights to {dest}",
            "flights to {dest}",
            "{dest} flights",
            "hotels in {dest}",
            "{dest} hotels",
            "cheap hotels {dest}",
            "vacation packages {dest}",
            "{dest} vacation deals",
            "{dest} all inclusive",
            "car rental {dest}",
            "{dest} airbnb",
            "weekend getaway {dest}"
        ]
        
        # Product types
        self.product_types = ["flight", "hotel", "car", "package"]
        
        # Cities for geo
        self.cities = {
            "CA": ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"],
            "US": ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix"]
        }
    
    def generate_session(self) -> Generator[Dict[str, Any], None, None]:
        """
        Generate a complete user session with search, clicks, and conversions.
        
        Yields events in chronological order.
        """
        session_id = str(uuid4())
        
        # Determine if user is logged in or anonymous
        user_id = None
        if random.random() > self.config.anonymous_rate:
            user_id = random.choice(self.user_pool)
        
        # Session context (consistent across session)
        platform = random.choice(self.config.platforms)
        device_type = self._get_device_for_platform(platform)
        geo_country = random.choice(["CA", "US"])
        geo_city = random.choice(self.cities[geo_country])
        utm_source = random.choice(self.config.utm_sources)
        utm_campaign = self._get_campaign_for_source(utm_source)
        
        # Generate 1-5 searches per session
        num_searches = random.randint(1, self.config.max_searches_per_session)
        base_time = datetime.utcnow()
        
        for search_idx in range(num_searches):
            # Time between searches (30 sec to 5 min)
            time_offset = timedelta(seconds=random.randint(30, 300) * search_idx)
            search_time = base_time + time_offset
            
            # Generate search event
            search = self._generate_search(
                session_id=session_id,
                user_id=user_id,
                timestamp=search_time,
                platform=platform,
                device_type=device_type,
                geo_country=geo_country,
                geo_city=geo_city,
                utm_source=utm_source,
                utm_campaign=utm_campaign
            )
            yield search.to_dict()
            
            # Maybe generate clicks (CTR)
            if random.random() < self.config.click_through_rate:
                # 1-3 clicks per search
                num_clicks = random.randint(1, 3)
                
                for click_idx in range(num_clicks):
                    click_time = search_time + timedelta(seconds=random.randint(5, 60) * (click_idx + 1))
                    
                    click = self._generate_click(
                        search=search,
                        session_id=session_id,
                        user_id=user_id,
                        timestamp=click_time
                    )
                    yield click.to_dict()
                    
                    # Maybe generate conversion (conversion rate of clicks)
                    if random.random() < self.config.conversion_rate:
                        conversion_time = click_time + timedelta(seconds=random.randint(60, 300))
                        
                        conversion = self._generate_conversion(
                            click=click,
                            session_id=session_id,
                            user_id=user_id,
                            timestamp=conversion_time
                        )
                        yield conversion.to_dict()
    
    def _generate_search(
        self,
        session_id: str,
        user_id: Optional[str],
        timestamp: datetime,
        platform: str,
        device_type: str,
        geo_country: str,
        geo_city: str,
        utm_source: Optional[str],
        utm_campaign: Optional[str]
    ) -> SearchEvent:
        """Generate a search event."""
        destination = random.choice(self.config.destinations)
        query = random.choice(self.query_templates).format(dest=destination)
        
        # Generate filters based on query type
        filters = self._generate_filters(query)
        
        return SearchEvent(
            query=query,
            session_id=session_id,
            user_id=user_id,
            timestamp=timestamp,
            results_count=random.randint(10, 100),
            page=1,  # Most searches are page 1
            platform=platform,
            device_type=device_type,
            geo_country=geo_country,
            geo_city=geo_city,
            utm_source=utm_source,
            utm_campaign=utm_campaign,
            filters=filters
        )
    
    def _generate_click(
        self,
        search: SearchEvent,
        session_id: str,
        user_id: Optional[str],
        timestamp: datetime
    ) -> ClickEvent:
        """Generate a click event linked to a search."""
        # Extract destination from query (simplified)
        destination = self._extract_destination(search.query)
        
        # Position follows power law (most clicks on top results)
        position = self._weighted_position()
        
        # Determine product type from query
        product_type = self._infer_product_type(search.query)
        
        # Generate realistic price
        price = self._generate_price(product_type)
        
        return ClickEvent(
            search_event_id=search.event_id,
            session_id=session_id,
            user_id=user_id,
            timestamp=timestamp,
            result_id=f"result_{uuid4().hex[:8]}",
            result_position=position,
            result_type=product_type,
            result_price=price,
            result_provider=random.choice(self.config.providers),
            result_destination=destination
        )
    
    def _generate_conversion(
        self,
        click: ClickEvent,
        session_id: str,
        user_id: Optional[str],
        timestamp: datetime
    ) -> ConversionEvent:
        """Generate a conversion event linked to a click."""
        # Booking value is usually close to clicked price
        booking_value = click.result_price * random.uniform(0.95, 1.05)
        
        # Commission is typically 5-15% of booking value
        commission_rate = random.uniform(0.05, 0.15)
        commission = booking_value * commission_rate
        
        return ConversionEvent(
            click_event_id=click.event_id,
            session_id=session_id,
            user_id=user_id,
            timestamp=timestamp,
            booking_value=round(booking_value, 2),
            commission=round(commission, 2),
            product_type=click.result_type,
            provider=click.result_provider
        )
    
    def _get_device_for_platform(self, platform: str) -> str:
        """Get appropriate device type for platform."""
        if platform == "web":
            return random.choice(["desktop", "mobile", "tablet"])
        elif platform in ["ios", "android"]:
            return "mobile"
        return "desktop"
    
    def _get_campaign_for_source(self, utm_source: Optional[str]) -> Optional[str]:
        """Generate campaign name for utm source."""
        if utm_source is None:
            return None
        
        campaigns = {
            "google": ["brand_search", "generic_flights", "retargeting"],
            "facebook": ["summer_deals", "weekend_getaway", "lookalike"],
            "instagram": ["travel_inspo", "deals_stories"],
            "email": ["newsletter", "abandoned_cart", "loyalty"],
            "affiliate": ["cashback_partner", "travel_blog"],
            "tiktok": ["viral_deals", "travel_hack"],
            "direct": [None]
        }
        
        return random.choice(campaigns.get(utm_source, [None]))
    
    def _generate_filters(self, query: str) -> Dict[str, Any]:
        """Generate search filters based on query."""
        filters = {}
        
        if "cheap" in query.lower():
            filters["price_max"] = random.randint(300, 500)
        
        if "flight" in query.lower():
            filters["travelers"] = random.randint(1, 4)
            
        # Add dates for most searches
        if random.random() > 0.3:
            start_date = datetime.utcnow() + timedelta(days=random.randint(7, 90))
            end_date = start_date + timedelta(days=random.randint(3, 14))
            filters["dates"] = [
                start_date.strftime("%Y-%m-%d"),
                end_date.strftime("%Y-%m-%d")
            ]
        
        return filters
    
    def _extract_destination(self, query: str) -> str:
        """Extract destination from query string."""
        # Check if any destination is in the query
        for dest in self.config.destinations:
            if dest.lower() in query.lower():
                return dest
        return random.choice(self.config.destinations)
    
    def _weighted_position(self) -> int:
        """Generate click position with power law distribution."""
        # Most clicks happen on positions 1-5
        weights = [0.35, 0.25, 0.15, 0.10, 0.08, 0.04, 0.02, 0.01]
        positions = list(range(1, 9))
        return random.choices(positions, weights=weights)[0]
    
    def _infer_product_type(self, query: str) -> str:
        """Infer product type from search query."""
        query_lower = query.lower()
        
        if "flight" in query_lower:
            return "flight"
        elif "hotel" in query_lower or "airbnb" in query_lower:
            return "hotel"
        elif "car" in query_lower:
            return "car"
        elif "package" in query_lower or "vacation" in query_lower:
            return "package"
        
        # Default based on probability
        return random.choices(
            ["flight", "hotel", "car", "package"],
            weights=[0.5, 0.3, 0.1, 0.1]
        )[0]
    
    def _generate_price(self, product_type: str) -> float:
        """Generate realistic price based on product type."""
        price_ranges = {
            "flight": (150, 1500),
            "hotel": (80, 500),
            "car": (30, 150),
            "package": (500, 3000)
        }
        
        min_price, max_price = price_ranges.get(product_type, (100, 500))
        return round(random.uniform(min_price, max_price), 2)
