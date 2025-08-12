# Airflow DAGs

Orchestration layer for the SearchFlow data pipeline.

## Overview

Three DAGs manage the complete data pipeline:

```
Ingestion → Transformation → Reverse-ETL
```

## DAG Inventory

| DAG | Schedule | Description |
|-----|----------|-------------|
| `searchflow_ingestion` | `*/5 * * * *` (every 5 min) | Load events from JSONL → raw tables |
| `searchflow_transformation` | `0 * * * *` (hourly) | Run dbt models + tests |
| `searchflow_reverse_etl` | `0 */6 * * *` (every 6 hrs) | Sync marts → operational systems |

## File Structure

```
airflow/
├── config/            # Airflow configuration
├── dags/
│   ├── ingestion_dag.py        # Raw data ingestion
│   ├── transformation_dag.py   # dbt run + test
│   └── reverse_etl_dag.py      # Sync to Redis/Postgres
└── plugins/           # Custom operators (if any)
```

## DAG Details

### 1. Ingestion DAG

**File**: `dags/ingestion_dag.py`

```
start → ingest_search_events → ingest_click_events → ingest_conversion_events → log_metrics → end
```

- Reads JSONL files from `/data/raw/`
- Loads to DuckDB `raw.*` tables
- **Idempotent**: Uses `INSERT OR IGNORE` with event_id as key

### 2. Transformation DAG

**File**: `dags/transformation_dag.py`

```
start → dbt_deps → dbt_run_staging → dbt_run_marts → dbt_test → end
```

- Runs dbt models in dependency order
- Executes 78 data quality tests
- Tags: `transformation`, `dbt`

### 3. Reverse-ETL DAG

**File**: `dags/reverse_etl_dag.py`

```
start → sync_user_segments → sync_recommendations → end
```

- Syncs `mart_user_segments` → Postgres CRM
- Syncs `mart_recommendations` → Redis cache

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DUCKDB_PATH` | `/data/searchflow.duckdb` | Warehouse path |
| `AIRFLOW__CORE__EXECUTOR` | `LocalExecutor` | Executor type |
| `AIRFLOW_UID` | `50000` | Airflow user ID |

## Usage

### Trigger DAGs Manually

```bash
# Via docker-compose
docker-compose exec airflow-scheduler airflow dags trigger searchflow_ingestion

# Via Make
make run-ingest
make run-transform
make run-reverse-etl
```

### View DAG Status

```bash
docker-compose exec airflow-scheduler airflow dags list
docker-compose exec airflow-scheduler airflow dags list-runs -d searchflow_ingestion
```

### Access Airflow UI

- **URL**: http://localhost:8080
- **Username**: `admin`
- **Password**: `admin`

## Troubleshooting

### DAG not appearing

```bash
# Check for import errors
docker-compose exec airflow-scheduler airflow dags list-import-errors
```

### Task failed

```bash
# View task logs
docker-compose logs airflow-scheduler | grep ERROR
```
