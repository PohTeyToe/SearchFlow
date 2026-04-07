# Data Pipeline Documentation

## Overview

SearchFlow's data pipeline moves events from generation through transformation to operational activation. The pipeline is orchestrated by Apache Airflow and uses dbt for SQL-based transformations against a DuckDB warehouse.

End-to-end latency from event creation to mart availability is approximately 68 seconds under default settings.

---

## Pipeline Architecture

```
Event Generator  -->  JSONL files  -->  Airflow Ingestion DAG
    (10 evt/s)       data/raw/           (every 5 min)
                                              |
                                              v
                                       DuckDB raw schema
                                       (raw.search_events,
                                        raw.click_events,
                                        raw.conversion_events)
                                              |
                                              v
                                    Airflow Transformation DAG
                                          (hourly)
                                              |
                            +-----------------+-----------------+
                            |                 |                 |
                            v                 v                 v
                    dbt staging         dbt intermediate    dbt marts
                    (views)             (views)             (tables)
                                                                |
                                                                v
                                                    Airflow Reverse-ETL DAG
                                                        (every 6 hours)
                                                                |
                                    +---------------------------+---------------------------+
                                    |                           |                           |
                                    v                           v                           v
                            PostgreSQL CRM              Redis Cache                 Email Queue
                         (crm_user_segments)       (searchflow:reco:*)          (email_queue table)
```

---

## Airflow DAGs

### 1. Ingestion DAG (`searchflow_ingestion`)

**File**: `airflow/dags/ingestion_dag.py`
**Schedule**: Every 5 minutes (`*/5 * * * *`)
**Max Active Runs**: 1

Reads JSONL files from `data/raw/` and inserts events into DuckDB raw tables. Uses `INSERT OR IGNORE` keyed on `event_id` for idempotent writes.

**Task flow**:
```
start --> ingest_search_events --> ingest_click_events --> ingest_conversion_events --> log_metrics --> end
```

Tasks run sequentially because DuckDB uses a single-writer lock.

**Configuration**:
- `DUCKDB_PATH`: Path to warehouse file (default `/data/searchflow.duckdb`)
- Source directory: `/data/raw/`
- Retries: 3, retry delay 2 minutes

### 2. Transformation DAG (`searchflow_transformation`)

**File**: `airflow/dags/transformation_dag.py`
**Schedule**: Hourly (`0 * * * *`)
**Max Active Runs**: 1

Runs dbt models in layer order: staging, intermediate, marts. Then runs `dbt test` and generates documentation.

**Task flow**:
```
start --> dbt_deps --> dbt_run_staging --> dbt_run_intermediate --> dbt_run_marts --> dbt_test --> dbt_docs_generate --> end
```

**dbt Models**:

| Layer | Models | Materialization |
|-|-|
| Staging | `stg_search_events`, `stg_click_events`, `stg_conversion_events` | View |
| Intermediate | `int_search_sessions`, `int_user_journeys` | View |
| Marts (analytics) | `fct_search_funnel`, `dim_users` | Table |
| Marts (marketing) | `mart_user_segments`, `mart_recommendations` | Table |
| Marts (ML) | `mart_ml_features` | Table |

### 3. Reverse-ETL DAG (`searchflow_reverse_etl`)

**File**: `airflow/dags/reverse_etl_dag.py`
**Schedule**: Every 6 hours (`0 */6 * * *`)
**Max Active Runs**: 1

Syncs mart tables back to operational systems. User segments and email triggers sync to PostgreSQL; recommendation scores sync to Redis.

**Task flow**:
```
start --> [sync_user_segments, sync_recommendations] --> log_metrics --> end
```

Segment and recommendation syncs run in parallel since they write to different destinations.

### 4. Training DAG (`searchflow_training`)

**File**: `airflow/dags/training_dag.py`
**Schedule**: Weekly on Sundays (`0 0 * * 0`)
**Max Active Runs**: 1

Orchestrates retraining of all 3 ML models via `docker exec` into the ml-engine container. Each model logs to MLflow.

**Task flow**:
```
train_churn → train_sentiment → train_recommender
```

**SLA**: 30 minutes per task.

### 5. Monitoring DAG (`searchflow_model_monitoring`)

**File**: `airflow/dags/monitoring_dag.py`
**Schedule**: Daily at 6 AM (`0 6 * * *`)

Runs Evidently drift detection against hotel booking reference data. If drift exceeds threshold (score > 0.3), triggers the training DAG for automatic retraining.

**Task flow**:
```
check_drift → evaluate_drift → [trigger_retrain | skip_retrain]
```

**SLA**: 20 minutes.

---

## Kafka Streaming Pipeline

In addition to file-based ingestion, SearchFlow supports real-time streaming via Apache Kafka 4.0 (KRaft mode — no ZooKeeper).

**Producer**: Event generator publishes to `search_events` topic via `confluent-kafka`.
**Consumer**: `kafka_consumer/` reads from Kafka, batch-inserts into DuckDB with write-lock retry and exponential backoff.

```
Event Generator → Kafka (search_events topic) → Kafka Consumer → DuckDB raw tables
```

**Configuration**: `KAFKA_BOOTSTRAP_SERVERS=kafka:9092`, consumer group `searchflow-consumers`.

---

## dbt Configuration

**Project file**: `dbt_transform/dbt_project.yml`
**Profile**: `searchflow` (DuckDB adapter)
**Packages**: Listed in `dbt_transform/packages.yml`

### Variables

| Variable | Default | Description |
|-|-|-|
| `conversion_window_hours` | 24 | How long after a search a conversion can be attributed |
| `session_timeout_minutes` | 30 | Inactivity period that ends a session |
| `min_events_for_analysis` | 100 | Minimum events required before running analysis |

### Schema Layout

```
raw.*                 -- Append-only event storage
staging.*             -- Cleaned and typed views
intermediate.*        -- Business logic (sessions, journeys)
main_analytics.*      -- Fact and dimension tables
main_marketing.*      -- Reverse-ETL source tables
```

### Running dbt Manually

```bash
# Inside the Airflow container
docker-compose exec airflow-scheduler bash

cd /dbt

# Install packages
dbt deps

# Run all models
dbt run

# Run a specific layer
dbt run --select staging
dbt run --select marts.analytics

# Test everything
dbt test

# Generate docs (viewable at :8081)
dbt docs generate
dbt docs serve --port 8081
```

---

## Data Quality

dbt tests enforce data quality at every layer:

- **Unique and not null** on all primary keys
- **Accepted values** for enums (`event_type`, `platform`, `device_type`)
- **Referential integrity** between staging tables (e.g., `click.search_event_id` references `stg_search_events`)
- **Row count thresholds** on mart tables via custom tests
- **Freshness checks** on raw sources (warn after 1 hour, error after 6 hours)
- **Unit tests** on transformation logic (12 YAML-based dbt unit tests)
- **Custom generic tests**: `test_positive_value`, `test_valid_ratio`, `test_referential_integrity`
- **Model contracts** with `contract: {enforced: true}` on mart models
- **SLA monitoring** on all DAG tasks (5-30 min thresholds)

Total: 71 dbt tests + 12 unit tests + 3 custom generic tests.

---

## Event Schemas

### Search Event

| Field | Type | Description |
|-|-|-|
| `event_id` | UUID | Unique event identifier |
| `event_type` | string | Always `"search"` |
| `timestamp` | ISO 8601 | When the search occurred |
| `user_id` | string or null | Null for anonymous users |
| `session_id` | UUID | Groups events in a browsing session |
| `query` | string | Search query text |
| `results_count` | int | Number of results returned |
| `platform` | string | `web`, `ios`, or `android` |
| `device_type` | string | `desktop`, `mobile`, or `tablet` |
| `geo.country` | string | Two-letter country code |
| `geo.city` | string | City name |
| `utm_source` | string or null | Marketing source |
| `filters` | object | Price, date, and traveler filters |

### Click Event

| Field | Type | Description |
|-|-|-|
| `event_id` | UUID | Unique event identifier |
| `search_event_id` | UUID | Links to the parent search |
| `result_position` | int | Position in search results (1-8) |
| `result_type` | string | `flight`, `hotel`, `car`, or `package` |
| `result_price` | float | Displayed price |
| `result_provider` | string | Provider name (e.g., `expedia`) |
| `result_destination` | string | Destination name |

### Conversion Event

| Field | Type | Description |
|-|-|-|
| `event_id` | UUID | Unique event identifier |
| `click_event_id` | UUID | Links to the parent click |
| `booking_value` | float | Total booking amount |
| `commission` | float | Platform commission (5-15% of value) |
| `product_type` | string | `flight`, `hotel`, `car`, or `package` |
| `provider` | string | Provider name |
| `currency` | string | Currency code (default `CAD`) |

---

## Troubleshooting

### Ingestion DAG fails with "database locked"

DuckDB only allows one writer at a time. Ensure `max_active_runs: 1` is set and no other process holds the database file open.

### dbt models fail with "relation does not exist"

Run ingestion first to create the raw tables. Models depend on raw data being present.

```bash
make run-ingest
# Wait for completion
make run-transform
```

### Reverse-ETL shows 0 rows synced

The mart tables may be empty. Verify data exists:

```bash
make shell-airflow
python -c "import duckdb; c=duckdb.connect('/data/searchflow.duckdb'); print(c.sql('SELECT COUNT(*) FROM main_marketing.mart_user_segments'))"
```

### Events not appearing in raw files

Check the event generator container is running:

```bash
docker-compose logs event-generator
```

Verify files exist in `data/raw/`:

```bash
ls -la data/raw/*.jsonl
```
