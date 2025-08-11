"""Sync user segments from warehouse to CRM table."""

from datetime import datetime
from typing import Dict, Any, List
import logging

import duckdb
import psycopg2
from psycopg2.extras import execute_values

logger = logging.getLogger(__name__)


class UserSegmentsSync:
    """
    Syncs mart_user_segments to CRM for sales/marketing use.
    
    This enables:
    - Sales team to see high-value user segments
    - Marketing to target specific segments with campaigns
    - Support to understand user context
    """
    
    def __init__(self, warehouse_path: str, postgres_config: Dict[str, Any]):
        self.warehouse_path = warehouse_path
        self.postgres_config = postgres_config
    
    def run(self) -> Dict[str, Any]:
        """
        Execute the sync and return metrics.
        
        Returns:
            Dict with sync metrics (rows extracted, upserted, etc.)
        """
        start_time = datetime.utcnow()
        logger.info("Starting user segments sync...")
        
        try:
            # Extract from warehouse
            segments = self._extract_segments()
            logger.info(f"Extracted {len(segments)} segments from warehouse")
            
            # Load to CRM
            upserted, unchanged = self._load_to_crm(segments)
            
            elapsed = (datetime.utcnow() - start_time).total_seconds()
            
            metrics = {
                "sync_type": "user_segments",
                "status": "success",
                "rows_extracted": len(segments),
                "rows_upserted": upserted,
                "rows_unchanged": unchanged,
                "duration_seconds": elapsed
            }
            
            logger.info(f"Sync complete: {metrics}")
            return metrics
            
        except Exception as e:
            logger.error(f"Sync failed: {e}")
            return {
                "sync_type": "user_segments",
                "status": "failed",
                "error": str(e),
                "duration_seconds": (datetime.utcnow() - start_time).total_seconds()
            }
    
    def _extract_segments(self) -> List[tuple]:
        """Extract user segments from warehouse."""
        conn = duckdb.connect(self.warehouse_path, read_only=True)
        
        result = conn.execute("""
            SELECT 
                user_id,
                segment,
                engagement_score,
                lifetime_revenue,
                lifetime_conversions,
                primary_platform,
                primary_country,
                first_seen_at,
                last_seen_at
            FROM main_marketing.mart_user_segments
            WHERE user_id IS NOT NULL
        """).fetchall()
        
        conn.close()
        return result
    
    def _load_to_crm(self, segments: List[tuple]) -> tuple:
        """
        Upsert segments to CRM table.
        
        Returns:
            Tuple of (upserted_count, unchanged_count)
        """
        if not segments:
            return 0, 0
        
        conn = psycopg2.connect(**self.postgres_config)
        cursor = conn.cursor()
        
        # Upsert query with conflict handling
        upsert_sql = """
            INSERT INTO crm_user_segments (
                user_id, segment, engagement_score, lifetime_revenue,
                lifetime_conversions, primary_platform, primary_country,
                first_seen_at, last_seen_at, synced_at
            ) VALUES %s
            ON CONFLICT (user_id) DO UPDATE SET
                previous_segment = crm_user_segments.segment,
                segment = EXCLUDED.segment,
                engagement_score = EXCLUDED.engagement_score,
                lifetime_revenue = EXCLUDED.lifetime_revenue,
                lifetime_conversions = EXCLUDED.lifetime_conversions,
                primary_platform = EXCLUDED.primary_platform,
                primary_country = EXCLUDED.primary_country,
                first_seen_at = EXCLUDED.first_seen_at,
                last_seen_at = EXCLUDED.last_seen_at,
                synced_at = CURRENT_TIMESTAMP,
                segment_changed_at = CASE 
                    WHEN crm_user_segments.segment != EXCLUDED.segment 
                    THEN CURRENT_TIMESTAMP 
                    ELSE crm_user_segments.segment_changed_at 
                END
        """
        
        # Add synced_at timestamp to each row
        rows_with_timestamp = [
            (*row, datetime.utcnow()) for row in segments
        ]
        
        execute_values(cursor, upsert_sql, rows_with_timestamp)
        upserted = cursor.rowcount
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return upserted, len(segments) - upserted
