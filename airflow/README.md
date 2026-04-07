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
| `searchflow_training` | `0 0 * * 0` (weekly) | Retrain all ML models with MLflow |
| `searchflow_model_monitoring` | `0 6 * * *` (daily) | Drift detection, conditional retraining |

## File Structure

```
airflow/
├── config/            # Airflow configuration
├── dags/
│   ├── ingestion_dag.py        # Raw data ingestion
│   ├── transformation_dag.py   # dbt run + test
│   ├── reverse_etl_dag.py      # Sync to Redis/Postgres
│   ├── training_dag.py          # Weekly ML model retraining
│   └── monitoring_dag.py        # Daily drift detection
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

### 4. Training DAG

**File**: `dags/training_dag.py`

```
train_churn → train_sentiment → train_recommender
```

- Runs models via `docker exec` into ml-engine container
- MLflow tracking for all training runs
- SLA: 30 minutes per task

### 5. Monitoring DAG

**File**: `dags/monitoring_dag.py`

```
check_drift → evaluate_drift → [trigger_retrain | skip_retrain]
```

- Evidently AI drift detection on hotel booking features
- Conditional retraining when drift_score > 0.3
- SLA: 20 minutes

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DUCKDB_PATH` | `/data/searchflow.duckdb` | Warehouse path |
| `AIRFLOW__CORE__EXECUTOR` | `LocalExecutor` | Executor type |
| `AIRFLOW_UID` | `50000` | Airflow user ID |
| `AIRFLOW__METRICS__STATSD_ON` | `true` | Enable StatsD metrics |
| `AIRFLOW__METRICS__STATSD_HOST` | `statsd-exporter` | StatsD target |
| `MLFLOW_TRACKING_URI` | `http://mlflow:5000` | MLflow server |

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
