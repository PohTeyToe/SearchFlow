"""Main entry point for the SearchFlow Reverse-ETL service."""

import logging
import sys
from typing import Optional

import click

from .config import config
from .syncs.user_segments_sync import UserSegmentsSync
from .syncs.email_triggers_sync import EmailTriggersSync
from .syncs.recommendations_sync import RecommendationsSync

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


SYNC_TYPES = {
    'user_segments': UserSegmentsSync,
    'email_triggers': EmailTriggersSync,
    'recommendations': RecommendationsSync,
}


@click.command()
@click.option(
    '--sync',
    type=click.Choice(list(SYNC_TYPES.keys()) + ['all']),
    default='all',
    help='Which sync to run'
)
@click.option(
    '--dry-run',
    is_flag=True,
    default=False,
    help='Run without making changes'
)
def main(sync: str, dry_run: bool):
    """
    SearchFlow Reverse-ETL Service
    
    Syncs transformed data from the warehouse to operational systems
    (CRM, email, cache, etc.)
    """
    logger.info("🔄 SearchFlow Reverse-ETL Service")
    logger.info(f"   Sync type: {sync}")
    logger.info(f"   Warehouse: {config.duckdb_path}")
    logger.info(f"   Postgres: {config.postgres_host}:{config.postgres_port}/{config.postgres_db}")
    logger.info(f"   Redis: {config.redis_host}:{config.redis_port}")
    
    if dry_run:
        logger.info("   Mode: DRY RUN (no changes will be made)")
    
    # Build postgres config dict
    postgres_config = {
        'host': config.postgres_host,
        'port': config.postgres_port,
        'database': config.postgres_db,
        'user': config.postgres_user,
        'password': config.postgres_password,
    }
    
    results = []
    syncs_to_run = list(SYNC_TYPES.keys()) if sync == 'all' else [sync]
    
    for sync_name in syncs_to_run:
        logger.info(f"\n{'='*50}")
        logger.info(f"Running {sync_name} sync...")
        logger.info('='*50)
        
        try:
            sync_class = SYNC_TYPES[sync_name]
            
            # RecommendationsSync uses Redis, others use Postgres
            if sync_name == 'recommendations':
                sync_instance = sync_class(
                    warehouse_path=config.duckdb_path,
                    redis_host=config.redis_host,
                    redis_port=config.redis_port
                )
            else:
                sync_instance = sync_class(
                    warehouse_path=config.duckdb_path,
                    postgres_config=postgres_config
                )
            
            if not dry_run:
                result = sync_instance.run()
                results.append(result)
                
                if result.get('status') == 'success':
                    logger.info(f"✅ {sync_name}: {result.get('rows_upserted', 0)} rows synced")
                else:
                    logger.error(f"❌ {sync_name}: {result.get('error', 'Unknown error')}")
            else:
                logger.info(f"[DRY RUN] Would run {sync_name} sync")
                results.append({'sync_type': sync_name, 'status': 'dry_run'})
                
        except Exception as e:
            logger.error(f"❌ {sync_name} failed: {e}")
            results.append({'sync_type': sync_name, 'status': 'failed', 'error': str(e)})
    
    # Summary
    logger.info(f"\n{'='*50}")
    logger.info("SYNC SUMMARY")
    logger.info('='*50)
    
    success_count = sum(1 for r in results if r.get('status') == 'success')
    failed_count = sum(1 for r in results if r.get('status') == 'failed')
    
    for result in results:
        status_icon = '✅' if result.get('status') == 'success' else '❌' if result.get('status') == 'failed' else '⏸️'
        logger.info(f"  {status_icon} {result.get('sync_type')}: {result.get('status')}")
    
    logger.info(f"\nTotal: {success_count} succeeded, {failed_count} failed")
    
    # Exit with error if any syncs failed
    if failed_count > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
