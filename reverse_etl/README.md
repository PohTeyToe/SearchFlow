# Reverse-ETL Service

Syncs transformed data from the warehouse back to operational systems.

## Overview

The Reverse-ETL service reads analytics-ready data from dbt marts in DuckDB and syncs it to operational systems:

- **Redis**: Real-time recommendation scores for search personalization
- **Postgres**: User segments for CRM and email targeting

## File Structure

```
reverse_etl/
├── Dockerfile
├── requirements.txt
├── src/
│   ├── __init__.py
│   ├── config.py           # Connection configuration
│   ├── main.py             # CLI entry point
│   ├── syncs/
│   │   ├── user_segments_sync.py     # → Postgres CRM
│   │   ├── email_triggers_sync.py    # → Postgres email queue
│   │   └── recommendations_sync.py   # → Redis cache
│   └── destinations/
│       └── (destination connectors)
└── tests/
```

## Sync Types

| Sync | Source Mart | Destination | Purpose |
|------|-------------|-------------|---------|
| `user_segments` | `mart_user_segments` | Postgres | CRM segmentation |
| `email_triggers` | `mart_user_segments` | Postgres | Email automation |
| `recommendations` | `mart_recommendations` | Redis | Real-time personalization |

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DUCKDB_PATH` | `/data/searchflow.duckdb` | Warehouse path |
| `POSTGRES_HOST` | `postgres` | Postgres hostname |
| `POSTGRES_PORT` | `5432` | Postgres port |
| `POSTGRES_DB` | `searchflow` | Database name |
| `POSTGRES_USER` | `airflow` | Database user |
| `POSTGRES_PASSWORD` | `airflow` | Database password |
| `REDIS_HOST` | `redis` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |

## Usage

### CLI

```bash
# Run all syncs
python -m src.main

# Run specific sync
python -m src.main --sync user_segments

# Dry run (no changes)
python -m src.main --dry-run
```

### Docker

```bash
# Via docker-compose
docker-compose exec reverse-etl python -m src.main --sync all

# Via Make
make run-reverse-etl
```

### Via Airflow

The `searchflow_reverse_etl` DAG triggers all syncs on schedule.

## Output

### User Segments → Postgres

```sql
-- Table: crm.user_segments
user_id | segment | total_searches | total_conversions | lifetime_value
--------|---------|----------------|-------------------|---------------
user_1  | power   | 45             | 12                | 2450.00
user_2  | casual  | 3              | 0                 | 0.00
```

### Recommendations → Redis

```
Key: reco:user_123
Value: {"destinations": ["Miami", "Cancun"], "score": 0.85}
TTL: 24 hours
```

## Idempotency

All syncs are idempotent:

- **Postgres**: Uses `INSERT ... ON CONFLICT DO UPDATE`
- **Redis**: Overwrites existing keys with fresh data
