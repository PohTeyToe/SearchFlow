"""Sync abandoned search triggers to email queue."""

from datetime import datetime
from typing import Dict, Any, List
import json
import logging

import duckdb
import psycopg2

logger = logging.getLogger(__name__)


class EmailTriggersSync:
    """
    Identifies users with abandoned searches and queues re-engagement emails.
    
    This enables:
    - Automated abandoned cart/search recovery campaigns
    - Personalized re-engagement with search context
    - Timely follow-ups (within 24-48h of search)
    """
    
    def __init__(self, warehouse_path: str, postgres_config: Dict[str, Any]):
        self.warehouse_path = warehouse_path
        self.postgres_config = postgres_config
    
    def run(self) -> Dict[str, Any]:
        """Execute the sync and return metrics."""
        start_time = datetime.utcnow()
        logger.info("Starting email triggers sync...")
        
        try:
            # Find users with abandoned searches
            abandoned_users = self._find_abandoned_searches()
            logger.info(f"Found {len(abandoned_users)} users with abandoned searches")
            
            # Queue emails (avoid duplicates)
            queued = self._queue_emails(abandoned_users)
            
            elapsed = (datetime.utcnow() - start_time).total_seconds()
            
            return {
                "sync_type": "email_triggers",
                "status": "success",
                "users_identified": len(abandoned_users),
                "emails_queued": queued,
                "duration_seconds": elapsed
            }
            
        except Exception as e:
            logger.error(f"Sync failed: {e}")
            return {
                "sync_type": "email_triggers",
                "status": "failed",
                "error": str(e)
            }
    
    def _find_abandoned_searches(self) -> List[Dict[str, Any]]:
        """Find users who searched but didn't convert in last 48h."""
        conn = duckdb.connect(self.warehouse_path, read_only=True)
        
        result = conn.execute("""
            WITH recent_searches AS (
                SELECT 
                    user_id,
                    search_query,
                    event_timestamp,
                    session_id
                FROM main_staging.stg_search_events
                WHERE user_id IS NOT NULL
                  AND event_timestamp >= CURRENT_TIMESTAMP - INTERVAL '48 hours'
            ),
            recent_conversions AS (
                SELECT DISTINCT user_id
                FROM main_staging.stg_conversion_events
                WHERE event_timestamp >= CURRENT_TIMESTAMP - INTERVAL '48 hours'
                  AND user_id IS NOT NULL
            ),
            abandoned AS (
                SELECT 
                    rs.user_id,
                    rs.search_query AS last_search_query,
                    MAX(rs.event_timestamp) AS last_search_time,
                    COUNT(*) AS search_count
                FROM recent_searches rs
                LEFT JOIN recent_conversions rc ON rs.user_id = rc.user_id
                WHERE rc.user_id IS NULL  -- No conversion
                GROUP BY rs.user_id, rs.search_query
            )
            SELECT 
                user_id,
                last_search_query,
                last_search_time,
                search_count
            FROM abandoned
            WHERE last_search_time >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
            ORDER BY last_search_time DESC
            LIMIT 1000
        """).fetchall()
        
        conn.close()
        
        return [
            {
                "user_id": row[0],
                "last_search_query": row[1],
                "last_search_time": row[2],
                "search_count": row[3]
            }
            for row in result
        ]
    
    def _queue_emails(self, users: List[Dict[str, Any]]) -> int:
        """Queue abandoned search emails, avoiding duplicates."""
        if not users:
            return 0
        
        conn = psycopg2.connect(**self.postgres_config)
        cursor = conn.cursor()
        
        queued = 0
        for user in users:
            # Check if email already queued for this user recently
            cursor.execute("""
                SELECT 1 FROM email_queue 
                WHERE user_id = %s 
                  AND email_template = 'abandoned_search'
                  AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
                  AND status IN ('pending', 'sent')
            """, (user["user_id"],))
            
            if cursor.fetchone() is None:
                # Queue new email
                payload = {
                    "search_query": user["last_search_query"],
                    "search_count": user["search_count"],
                    "personalized_link": f"/search?q={user['last_search_query']}"
                }
                
                cursor.execute("""
                    INSERT INTO email_queue (user_id, email_template, payload, priority)
                    VALUES (%s, %s, %s, %s)
                """, (
                    user["user_id"],
                    "abandoned_search",
                    json.dumps(payload),
                    3  # Higher priority for abandoned search emails
                ))
                queued += 1
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return queued
