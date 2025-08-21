"""Sync recommendation scores to Redis for real-time personalization."""

from datetime import datetime
from typing import Dict, Any, List
import json
import logging

import duckdb
import redis

logger = logging.getLogger(__name__)


class RecommendationsSync:
    """
    Syncs recommendation scores to Redis for real-time search personalization.
    
    This enables:
    - Personalized search result ranking
    - "Recommended for you" sections
    - Real-time lookup during search (O(1) with Redis)
    """
    
    def __init__(self, warehouse_path: str, redis_host: str, redis_port: int):
        self.warehouse_path = warehouse_path
        self.redis_client = redis.Redis(
            host=redis_host,
            port=redis_port,
            decode_responses=True
        )
    
    def run(self) -> Dict[str, Any]:
        """Execute the sync and return metrics."""
        start_time = datetime.utcnow()
        logger.info("Starting recommendations sync...")
        
        try:
            # Extract recommendations from warehouse
            recommendations = self._extract_recommendations()
            logger.info(f"Extracted {len(recommendations)} recommendation records")
            
            # Load to Redis
            users_updated = self._load_to_redis(recommendations)
            
            elapsed = (datetime.utcnow() - start_time).total_seconds()
            
            return {
                "sync_type": "recommendations",
                "status": "success",
                "records_extracted": len(recommendations),
                "users_updated": users_updated,
                "duration_seconds": elapsed
            }
            
        except Exception as e:
            logger.error(f"Sync failed: {e}")
            return {
                "sync_type": "recommendations",
                "status": "failed",
                "error": str(e)
            }
    
    def _extract_recommendations(self) -> List[Dict[str, Any]]:
        """Extract recommendation scores from warehouse."""
        conn = duckdb.connect(self.warehouse_path, read_only=True)
        
        result = conn.execute("""
            SELECT 
                user_id,
                recommended_destination,
                recommendation_score,
                rank
            FROM main_marketing.mart_recommendations
            WHERE recommendation_score > 0.5
              AND rank <= 10
            ORDER BY user_id, rank
        """).fetchall()
        
        conn.close()
        
        return [
            {
                "user_id": row[0],
                "destination": row[1],
                "score": row[2],
                "rank": row[3]
            }
            for row in result
        ]
    
    def _load_to_redis(self, recommendations: List[Dict[str, Any]]) -> int:
        """
        Load recommendations to Redis.
        
        Storage format:
        - Key: searchflow:reco:{user_id}
        - Value: Hash of {destination: score}
        
        This allows O(1) lookup during search.
        """
        if not recommendations:
            return 0
        
        # Group by user
        users_data: Dict[str, Dict[str, float]] = {}
        for rec in recommendations:
            user_id = rec["user_id"]
            if user_id not in users_data:
                users_data[user_id] = {}
            users_data[user_id][rec["destination"]] = rec["score"]
        
        # Write to Redis using pipeline for efficiency
        pipe = self.redis_client.pipeline()
        
        for user_id, destinations in users_data.items():
            key = f"searchflow:reco:{user_id}"
            
            # Delete old recommendations
            pipe.delete(key)
            
            # Set new recommendations
            if destinations:
                pipe.hset(key, mapping=destinations)
                # Set TTL of 7 days (refresh before expiry)
                pipe.expire(key, 60 * 60 * 24 * 7)
        
        pipe.execute()
        
        return len(users_data)
    
    def get_recommendations(self, user_id: str) -> Dict[str, float]:
        """
        Get recommendations for a user (for search personalization).
        
        This method would be called by the search service.
        """
        key = f"searchflow:reco:{user_id}"
        return self.redis_client.hgetall(key)
