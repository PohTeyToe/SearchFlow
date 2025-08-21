"""
SearchFlow Ingestion DAG

Ingests events from raw files to the DuckDB warehouse.
Runs every 5 minutes.
"""

from datetime import datetime, timedelta
from pathlib import Path

from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.empty import EmptyOperator


default_args = {
    'owner': 'searchflow',
    'depends_on_past': False,
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 3,
    'retry_delay': timedelta(minutes=2),
}


def ingest_events(event_type: str, **context):
    """
    Load events from JSONL files to raw tables.
    
    This function is idempotent - running it multiple times
    won't create duplicate records.
    """
    import duckdb
    import json
    import os
    
    duckdb_path = os.getenv('DUCKDB_PATH', '/data/searchflow.duckdb')
    source_dir = Path('/data/raw')
    source_file = source_dir / f'{event_type}_events.jsonl'
    
    if not source_file.exists():
        print(f"No file found at {source_file}, skipping...")
        return {'rows_ingested': 0}
    
    # Connect to DuckDB
    conn = duckdb.connect(duckdb_path)
    
    # Ensure schema exists
    conn.execute("CREATE SCHEMA IF NOT EXISTS raw")
    
    # Ensure table exists
    conn.execute(f"""
        CREATE TABLE IF NOT EXISTS raw.{event_type}_events (
            event_id VARCHAR PRIMARY KEY,
            payload JSON,
            ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            source_file VARCHAR,
            batch_id VARCHAR
        )
    """)
    
    # Read and insert events
    batch_id = context['run_id']
    rows_ingested = 0
    
    with open(source_file, 'r') as f:
        for line in f:
            try:
                event = json.loads(line.strip())
                event_id = event.get('event_id')
                
                if event_id:
                    # Use INSERT OR IGNORE for idempotency
                    conn.execute(f"""
                        INSERT OR IGNORE INTO raw.{event_type}_events 
                        (event_id, payload, source_file, batch_id)
                        VALUES (?, ?, ?, ?)
                    """, [event_id, json.dumps(event), str(source_file), batch_id])
                    rows_ingested += 1
                    
            except json.JSONDecodeError:
                print(f"Skipping invalid JSON line")
                continue
    
    conn.close()
    
    print(f"Ingested {rows_ingested} {event_type} events")
    
    # Push metrics to XCom for downstream tasks
    context['task_instance'].xcom_push(
        key=f'{event_type}_rows',
        value=rows_ingested
    )
    
    return {'rows_ingested': rows_ingested}


def log_ingestion_metrics(**context):
    """Log total ingestion metrics."""
    ti = context['task_instance']
    
    search_rows = ti.xcom_pull(key='search_rows', task_ids='ingest_search_events') or 0
    click_rows = ti.xcom_pull(key='click_rows', task_ids='ingest_click_events') or 0
    conversion_rows = ti.xcom_pull(key='conversion_rows', task_ids='ingest_conversion_events') or 0
    
    total = search_rows + click_rows + conversion_rows
    
    print(f"""
    ========================================
    Ingestion Complete
    ========================================
    Search events:     {search_rows:,}
    Click events:      {click_rows:,}
    Conversion events: {conversion_rows:,}
    ----------------------------------------
    Total:             {total:,}
    ========================================
    """)


with DAG(
    'searchflow_ingestion',
    default_args=default_args,
    description='Ingest events from sources to raw tables',
    schedule_interval='*/5 * * * *',  # Every 5 minutes
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['ingestion', 'searchflow'],
    max_active_runs=1,
) as dag:
    
    start = EmptyOperator(task_id='start')
    
    ingest_searches = PythonOperator(
        task_id='ingest_search_events',
        python_callable=ingest_events,
        op_kwargs={'event_type': 'search'},
    )
    
    ingest_clicks = PythonOperator(
        task_id='ingest_click_events',
        python_callable=ingest_events,
        op_kwargs={'event_type': 'click'},
    )
    
    ingest_conversions = PythonOperator(
        task_id='ingest_conversion_events',
        python_callable=ingest_events,
        op_kwargs={'event_type': 'conversion'},
    )
    
    log_metrics = PythonOperator(
        task_id='log_metrics',
        python_callable=log_ingestion_metrics,
    )
    
    end = EmptyOperator(task_id='end')
    
    # DAG structure: sequential ingestion (DuckDB single-writer limitation), then log metrics
    start >> ingest_searches >> ingest_clicks >> ingest_conversions >> log_metrics >> end
