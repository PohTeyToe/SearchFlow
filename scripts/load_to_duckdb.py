#!/usr/bin/env python3
"""
Load raw JSONL event files into DuckDB for dbt transformation.

This script reads the generated event files and loads them into
the raw schema that dbt models expect.
"""

import duckdb
import json
from pathlib import Path


def load_jsonl_to_duckdb():
    """Load JSONL event files into DuckDB raw tables."""
    
    # Paths relative to project root
    db_path = Path("data/searchflow.duckdb")
    data_dir = Path("data/raw")
    
    print(f"[INFO] Database: {db_path.absolute()}")
    print(f"[INFO] Data directory: {data_dir.absolute()}")
    print()
    
    # Connect to DuckDB (creates file if not exists)
    conn = duckdb.connect(str(db_path))
    
    # Create schemas
    conn.execute("CREATE SCHEMA IF NOT EXISTS raw")
    conn.execute("CREATE SCHEMA IF NOT EXISTS staging")
    conn.execute("CREATE SCHEMA IF NOT EXISTS intermediate")
    conn.execute("CREATE SCHEMA IF NOT EXISTS analytics")
    conn.execute("CREATE SCHEMA IF NOT EXISTS marketing")
    print("[OK] Created schemas: raw, staging, intermediate, analytics, marketing")
    print()
    
    # Event types to load
    event_types = ['search_events', 'click_events', 'conversion_events']
    
    results = {}
    
    for event_type in event_types:
        jsonl_file = data_dir / f"{event_type}.jsonl"
        
        if not jsonl_file.exists():
            print(f"[WARN] File not found: {jsonl_file}")
            results[event_type] = 0
            continue
        
        print(f"[LOAD] Loading {event_type}...")
        
        # Use DuckDB's native JSON reading capability
        # Convert Windows path to forward slashes for DuckDB
        file_path_str = str(jsonl_file.absolute()).replace('\\', '/')
        
        try:
            # Create table from JSONL file
            # Use read_text to get raw JSON lines, then parse them
            conn.execute(f"""
                CREATE OR REPLACE TABLE raw.{event_type} AS
                WITH raw_lines AS (
                    SELECT content as line_content
                    FROM read_csv('{file_path_str}', 
                        header=false, 
                        columns={{'content': 'VARCHAR'}},
                        quote='',
                        escape='',
                        delim='\x01'
                    )
                    WHERE line_content IS NOT NULL 
                      AND TRIM(line_content) != ''
                )
                SELECT 
                    json_extract_string(line_content, '$.event_id') as event_id,
                    line_content::JSON as payload,
                    CURRENT_TIMESTAMP as ingested_at
                FROM raw_lines
            """)
            
            # Get row count
            count = conn.execute(f"SELECT COUNT(*) FROM raw.{event_type}").fetchone()[0]
            results[event_type] = count
            print(f"   [OK] Loaded {count:,} rows into raw.{event_type}")
            
        except Exception as e:
            print(f"   [ERROR] Error loading {event_type}: {e}")
            results[event_type] = 0
    
    print()
    
    # Verify data
    print("[INFO] Data verification:")
    for event_type in event_types:
        try:
            # Show sample data
            sample = conn.execute(f"""
                SELECT event_id, json_extract_string(payload, '$.event_type') as type
                FROM raw.{event_type}
                LIMIT 3
            """).fetchall()
            print(f"   {event_type}: {results.get(event_type, 0):,} rows")
            for row in sample:
                print(f"      - {row[0]} ({row[1]})")
        except Exception as e:
            print(f"   {event_type}: Error - {e}")
    
    conn.close()
    print()
    print("[OK] Data loading complete!")
    
    return results


if __name__ == "__main__":
    load_jsonl_to_duckdb()
