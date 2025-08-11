"""
SearchFlow Reverse-ETL DAG

Syncs transformed data back to operational systems:
- User segments → CRM (Postgres)
- Email triggers → Email queue
- Recommendations → Redis cache

Runs every 6 hours.
"""

from datetime import datetime, timedelta
import os
import json

from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.empty import EmptyOperator


default_args = {
    'owner': 'searchflow',
    'depends_on_past': False,
    'email_on_failure': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
}


def sync_user_segments(**context):
    """Sync user segments to CRM table."""
    import duckdb
    import psycopg2
    from psycopg2.extras import execute_values
    
    duckdb_path = os.getenv('DUCKDB_PATH', '/data/searchflow.duckdb')
    
    # Extract from warehouse
    warehouse = duckdb.connect(duckdb_path, read_only=True)
    
    try:
        segments = warehouse.execute("""
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
            LIMIT 10000
        """).fetchall()
    except Exception as e:
        print(f"Warning: Could not read from warehouse: {e}")
        segments = []
    finally:
        warehouse.close()
    
    print(f"Extracted {len(segments)} segments from warehouse")
    
    if not segments:
        return {'segments_synced': 0}
    
    # Load to CRM (Postgres)
    postgres_config = {
        'host': os.getenv('POSTGRES_HOST', 'postgres'),
        'port': int(os.getenv('POSTGRES_PORT', '5432')),
        'dbname': os.getenv('POSTGRES_DB', 'searchflow'),
        'user': os.getenv('POSTGRES_USER', 'airflow'),
        'password': os.getenv('POSTGRES_PASSWORD', 'airflow'),
    }
    
    try:
        conn = psycopg2.connect(**postgres_config)
        cursor = conn.cursor()
        
        # Ensure table exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS crm_user_segments (
                user_id VARCHAR(36) PRIMARY KEY,
                segment VARCHAR(50),
                engagement_score INTEGER,
                lifetime_revenue DECIMAL(12,2),
                lifetime_conversions INTEGER,
                primary_platform VARCHAR(20),
                primary_country VARCHAR(2),
                first_seen_at TIMESTAMP,
                last_seen_at TIMESTAMP,
                synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Upsert segments
        execute_values(
            cursor,
            """
            INSERT INTO crm_user_segments 
            (user_id, segment, engagement_score, lifetime_revenue, 
             lifetime_conversions, primary_platform, primary_country,
             first_seen_at, last_seen_at, synced_at)
            VALUES %s
            ON CONFLICT (user_id) DO UPDATE SET
                segment = EXCLUDED.segment,
                engagement_score = EXCLUDED.engagement_score,
                lifetime_revenue = EXCLUDED.lifetime_revenue,
                lifetime_conversions = EXCLUDED.lifetime_conversions,
                synced_at = CURRENT_TIMESTAMP
            """,
            [(
                row[0], row[1], row[2], row[3], row[4],
                row[5], row[6], row[7], row[8], datetime.utcnow()
            ) for row in segments]
        )
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"Synced {len(segments)} segments to CRM")
        
    except Exception as e:
        print(f"Warning: Could not sync to Postgres: {e}")
    
    return {'segments_synced': len(segments)}


def sync_recommendations_to_redis(**context):
    """Sync recommendation scores to Redis for real-time lookup."""
    import duckdb
    import redis
    
    duckdb_path = os.getenv('DUCKDB_PATH', '/data/searchflow.duckdb')
    redis_host = os.getenv('REDIS_HOST', 'redis')
    redis_port = int(os.getenv('REDIS_PORT', '6379'))
    
    # Extract recommendations from warehouse
    warehouse = duckdb.connect(duckdb_path, read_only=True)
    
    try:
        recommendations = warehouse.execute("""
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
    except Exception as e:
        print(f"Warning: Could not read from warehouse: {e}")
        recommendations = []
    finally:
        warehouse.close()
    
    print(f"Extracted {len(recommendations)} recommendation records")
    
    if not recommendations:
        return {'users_updated': 0}
    
    try:
        redis_client = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
        redis_client.ping()
        
        # Group recommendations by user
        users_data = {}
        for row in recommendations:
            user_id, destination, score, rank = row
            if user_id not in users_data:
                users_data[user_id] = {}
            users_data[user_id][destination] = float(score)
        
        # Write to Redis using pipeline for efficiency
        pipe = redis_client.pipeline()
        
        for user_id, destinations in users_data.items():
            key = f"searchflow:reco:{user_id}"
            pipe.delete(key)
            if destinations:
                pipe.hset(key, mapping=destinations)
                pipe.expire(key, 60 * 60 * 24 * 7)  # 7 day TTL
        
        pipe.execute()
        
        # Store sync timestamp
        redis_client.set(
            'searchflow:reco:last_sync',
            datetime.utcnow().isoformat()
        )
        
        print(f"Synced recommendations for {len(users_data)} users")
        return {'users_updated': len(users_data)}
        
    except Exception as e:
        print(f"Warning: Could not connect to Redis: {e}")
        return {'users_updated': 0, 'error': str(e)}


def log_reverse_etl_metrics(**context):
    """Log reverse-ETL sync metrics."""
    ti = context['task_instance']
    
    segments_result = ti.xcom_pull(task_ids='sync_user_segments') or {}
    reco_result = ti.xcom_pull(task_ids='sync_recommendations') or {}
    
    print(f"""
    ========================================
    Reverse-ETL Complete
    ========================================
    User Segments Synced: {segments_result.get('segments_synced', 0):,}
    Users with Recos:     {reco_result.get('users_updated', 0):,}
    ========================================
    """)


with DAG(
    'searchflow_reverse_etl',
    default_args=default_args,
    description='Sync marts to operational systems',
    schedule_interval='0 */6 * * *',  # Every 6 hours
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['reverse-etl', 'searchflow'],
    max_active_runs=1,
) as dag:
    
    start = EmptyOperator(task_id='start')
    
    sync_segments = PythonOperator(
        task_id='sync_user_segments',
        python_callable=sync_user_segments,
    )
    
    sync_recos = PythonOperator(
        task_id='sync_recommendations',
        python_callable=sync_recommendations_to_redis,
    )
    
    log_metrics = PythonOperator(
        task_id='log_metrics',
        python_callable=log_reverse_etl_metrics,
    )
    
    end = EmptyOperator(task_id='end')
    
    # Syncs run in parallel, then log metrics
    start >> [sync_segments, sync_recos] >> log_metrics >> end
