# Scaling SearchFlow to 10M Events/Day

This document analyzes the concrete changes required to scale SearchFlow from its current
development footprint (~5K events/day, single-node Docker Compose) to a production deployment
handling 10 million events per day. Each subsystem is examined independently with specific
numbers, migration paths, and tradeoffs.

---

## 1. Kafka Scaling

### Current State

SearchFlow runs a single Kafka 4.0 broker with a single partition per topic
(`search_events`, `click_events`, `conversion_events`). The Kafka consumer reads from
all three topics sequentially and batch-inserts into DuckDB. At development load (~5K
events/day), a single partition with a single consumer keeps up trivially.

### Target Load

10M events/day breaks down to:

- 10,000,000 / 24 / 60 = ~6,944 events/minute sustained
- Peak hours (assume 3x average): ~20,833 events/minute
- Per-second peak: ~347 events/second

A single Kafka partition can handle 10K+ messages/second, so raw throughput is not the
bottleneck. The bottleneck is consumer parallelism -- a single consumer cannot process,
validate, and insert 347 events/second while maintaining ordering guarantees.

### Strategy: 12 Partitions, 4-Consumer Group

Partition the `search_events` topic into 12 partitions, keyed by `hash(user_id) % 12`.
This ensures all events for a given user land on the same partition, preserving per-user
ordering (critical for session reconstruction and funnel analysis).

Deploy a consumer group with 4 consumers:

- Each consumer handles 3 partitions (12 / 4 = 3)
- Each consumer processes ~1,736 events/minute at sustained load
- Each consumer processes ~5,208 events/minute at peak
- This provides 4x headroom before needing additional consumers

Partition count of 12 was chosen because:

- It is divisible by 2, 3, 4, and 6, allowing flexible consumer scaling
- 12 partitions x 1MB segment size = 12MB memory overhead per broker (negligible)
- Rebalancing with 12 partitions completes in <2 seconds with cooperative sticky assignor

### Broker Scaling

At 10M events/day with an average event size of 512 bytes:

- Daily throughput: 10M x 512B = ~4.8 GB/day
- With replication factor 3: ~14.4 GB/day disk
- 7-day retention: ~100 GB total disk

A 3-broker cluster handles this comfortably. Each broker stores ~33 GB with replication.
KRaft mode (already in use) eliminates ZooKeeper, so the 3 brokers self-coordinate via
the Raft consensus protocol.

### Configuration Changes

```properties
# server.properties (per broker)
num.partitions=12
default.replication.factor=3
min.insync.replicas=2

# consumer group
group.id=searchflow-analytics
partition.assignment.strategy=org.apache.kafka.clients.consumer.CooperativeStickyAssignor
max.poll.records=500
fetch.min.bytes=16384
```

The `fetch.min.bytes=16384` setting batches small fetches, reducing round-trips at the
cost of up to 500ms additional latency (acceptable for analytics workloads).

---

## 2. DuckDB to ClickHouse Migration

### Current State

DuckDB serves as the analytics warehouse. It handles the current dataset (~170 sessions,
1,607 users, ~100K rows across staging/intermediate/mart tables) in single-digit
milliseconds. DuckDB is the correct choice at this scale: zero operational overhead,
embedded in the Python process, columnar storage with vectorized execution.

### Why DuckDB Breaks at Scale

DuckDB is single-writer by design. The file-based storage uses a write-ahead log with
exclusive locks. At 10M events/day:

- Kafka consumers cannot write concurrently (lock contention)
- dbt transformations block while consumers hold the write lock
- Read queries during write transactions see stale snapshots
- File size grows to ~50 GB, exceeding comfortable single-node memory

The single-writer model is a feature for embedded analytics but a hard constraint for
concurrent pipeline workloads.

### Migration Target: ClickHouse

ClickHouse is the natural graduation path because:

1. **Columnar storage** -- same query patterns as DuckDB, similar SQL dialect
2. **MergeTree engine** -- append-optimized with background merges, no write locks
3. **Distributed tables** -- horizontal scaling across shards with automatic routing
4. **Materialized views** -- incremental aggregations replace some dbt models
5. **Native Kafka engine** -- ClickHouse can consume directly from Kafka topics

### SQL Compatibility

Most DuckDB SQL translates directly. Key differences:

```sql
-- DuckDB (current)
CREATE TABLE stg_search_events AS
SELECT * FROM read_parquet('data/search_events/*.parquet');

-- ClickHouse (target)
CREATE TABLE stg_search_events
ENGINE = MergeTree()
ORDER BY (event_timestamp, user_id)
PARTITION BY toYYYYMM(event_timestamp)
AS SELECT * FROM kafka_search_events;
```

The `ORDER BY` clause in ClickHouse defines the primary index (sparse, not B-tree).
Partitioning by month enables efficient data lifecycle management (drop old partitions
instead of DELETE).

### Capacity Planning

At 10M events/day with 20 columns averaging 40 bytes each:

- Raw data: 10M x 800B = ~7.5 GB/day
- ClickHouse compression ratio (LZ4): ~5:1
- Compressed daily: ~1.5 GB/day
- 90-day retention: ~135 GB compressed
- With 2x replication: ~270 GB total

A 3-node ClickHouse cluster with 256 GB disk each handles this with room to grow to
50M events/day before adding nodes.

### Migration Path

DuckDB remains in development and testing environments. ClickHouse deploys only when
the data volume justifies the operational overhead. The switchover is behind a
`WAREHOUSE_BACKEND` environment variable in the consumer and dbt profile.

---

## 3. Airflow Executor Scaling

### Current State

Airflow runs with LocalExecutor, executing all tasks in subprocesses on the scheduler
node. Four DAGs run on different schedules:

| DAG | Schedule | Tasks | Typical Duration |
|-|-|-|-|
| ingestion | every 5 min | 3 | ~15 seconds |
| transformation | hourly | 5 | ~45 seconds |
| reverse_etl | every 6 hours | 4 | ~30 seconds |
| training | weekly | 6 | ~8 minutes |

LocalExecutor handles this fine because tasks are lightweight and non-overlapping.
At scale, the training DAG becomes the bottleneck: training 3 ML models sequentially
takes 8+ minutes, and concurrent DAG runs (backfills, retraining) contend for CPU.

### Strategy: CeleryExecutor with Redis Broker

Redis is already in the Docker Compose stack (used for ML prediction caching). Adding
Celery workers requires:

1. Setting `executor = CeleryExecutor` in `airflow.cfg`
2. Pointing `broker_url` to the existing Redis instance (db 1 to avoid cache collisions)
3. Deploying dedicated worker containers with queue assignments

### Worker Pool Design

```
airflow-worker-etl:
  command: celery worker -q etl_queue -c 4
  deploy:
    replicas: 2

airflow-worker-ml:
  command: celery worker -q ml_queue -c 2
  deploy:
    replicas: 2
    resources:
      reservations:
        devices:
          - capabilities: [gpu]
```

Two worker pools with distinct resource profiles:

- **etl_queue** (ingestion, transformation, reverse-ETL): 4 concurrent tasks per worker,
  CPU-bound, 2 replicas = 8 task slots total
- **ml_queue** (model training, prediction batch jobs): 2 concurrent tasks per worker,
  memory-intensive, GPU-capable, 2 replicas = 4 task slots total

### Parallelized Training DAG

With CeleryExecutor, the training DAG can train all 3 models in parallel:

```
training_dag (current sequential): 8 minutes
training_dag (parallel):
  - churn_xgboost:   3 min  \
  - sentiment_bert:  5 min   |-- parallel --> 5 min total
  - recommendations: 2 min  /
```

Wall-clock time drops from 8 minutes to 5 minutes (1.6x speedup). At scale with
hyperparameter sweeps, the savings compound: 10 XGBoost configs x 3 min = 30 min
sequential vs 3 min with 10 parallel workers.

### When to Migrate

Stay on LocalExecutor until:

- Task concurrency regularly exceeds 8 simultaneous tasks
- Training DAG runtime exceeds 15 minutes
- Multiple users trigger ad-hoc DAG runs simultaneously

---

## 4. ML Serving Scaling

### Current State

The ML Engine runs a single FastAPI instance behind Uvicorn with Redis caching
(TTL 3600 seconds). Prediction flow:

1. Request arrives (e.g., `POST /churn/user_456`)
2. Check Redis for cached prediction (`churn:user_456`)
3. Cache hit: return cached result (~1ms)
4. Cache miss: load model, run inference (~50ms for XGBoost, ~200ms for DistilBERT)
5. Store result in Redis with TTL

At development load, the single instance handles all requests with sub-100ms p99 latency.

### Cache Hit Rate Analysis

With 1,607 users and TTL of 3600 seconds:

- If each user is queried once per hour: 100% hit rate after warmup
- If user features change every 30 minutes: ~50% hit rate
- Estimated production hit rate: ~60% (features update with new events)

At 60% hit rate with 10M events/day generating ~1M prediction requests/day:

- 600K cache hits: 600K x 1ms = 600 seconds of compute
- 400K cache misses: 400K x 100ms average = 40,000 seconds of compute
- Total: ~40,600 seconds / 86,400 seconds in a day = ~47% CPU utilization on one core

A single instance with 4 Uvicorn workers can handle this, but with zero headroom
for spikes.

### Horizontal Scaling Strategy

Deploy 3 FastAPI replicas behind an Nginx load balancer:

```yaml
ml-engine:
  deploy:
    replicas: 3
  environment:
    UVICORN_WORKERS: 4

nginx:
  upstream ml_backend {
    least_conn;
    server ml-engine-1:8000;
    server ml-engine-2:8000;
    server ml-engine-3:8000;
  }
```

- 3 replicas x 4 workers = 12 concurrent prediction slots
- Redis cache is shared across replicas (already external)
- `least_conn` routing distributes load to least-busy replica
- Stateless design: any replica can serve any request

### GPU Inference for Sentiment

The DistilBERT sentiment model is the most compute-intensive endpoint (~200ms on CPU).
At scale:

- CPU inference: 200ms x 100K daily sentiment requests = 20,000 seconds
- GPU inference (T4): ~15ms per request = 1,500 seconds (13x speedup)

GPU serving makes sense when sentiment volume exceeds 50K requests/day. Below that
threshold, CPU inference with 3 replicas has sufficient capacity.

### Model Loading Optimization

Each replica loads all 3 models into memory at startup:

- XGBoost churn model: ~5 MB
- DistilBERT sentiment: ~260 MB
- SVD recommendations: ~15 MB

Total per replica: ~280 MB. With 3 replicas: ~840 MB. This is acceptable for a
dedicated ML serving node with 4+ GB RAM. Models are loaded once at startup and
shared across requests via the FastAPI app state.

---

## 5. dbt Incremental Models

### Current State

All dbt models use `materialized='table'`, meaning every run drops and recreates
the table from scratch. The full DAG (staging, intermediate, marts) processes the
entire dataset on every hourly run.

At current scale (~100K rows), a full refresh completes in under 2 seconds. There
is no performance reason to add incremental complexity yet.

### When Full Refresh Breaks

Full refresh becomes problematic when:

- The source tables exceed 10M rows (full scan takes >30 seconds)
- The hourly transformation window is consumed by dbt alone
- Downstream consumers (dashboard, ML engine) see stale data during rebuilds

At 10M events/day, the `stg_search_events` table accumulates 300M rows in a month.
A full table scan at that volume takes 2-3 minutes in ClickHouse, which is tolerable
but wasteful when only the last hour of data changed.

### Incremental Strategy

```sql
-- models/staging/stg_search_events.sql
{{
  config(
    materialized='incremental',
    unique_key='event_id',
    incremental_strategy='merge'
  )
}}

SELECT
  event_id,
  user_id,
  search_query,
  event_timestamp,
  session_id
FROM {{ source('raw', 'search_events') }}

{% if is_incremental() %}
  WHERE event_timestamp > (SELECT max(event_timestamp) FROM {{ this }})
{% endif %}
```

This processes only new events since the last run. With hourly scheduling:

- Full refresh: scan 300M rows, rebuild entire table (~3 minutes)
- Incremental: scan ~416K new rows (10M / 24), merge into existing table (~5 seconds)

### Partial DAG Runs

Not all models need to run on every schedule. Split the dbt DAG:

```bash
# Hourly: only staging and intermediate models
dbt run --select staging intermediate

# Daily: full DAG including marts and metrics
dbt run

# On-demand: single model and its downstream dependents
dbt run --select stg_search_events+
```

### Tradeoffs

Incremental models add complexity:

- Late-arriving data requires a lookback window (`event_timestamp > max - interval '2 hours'`)
- Schema changes require `--full-refresh` to rebuild
- Debugging is harder because you cannot reproduce state by re-running
- The `unique_key` must be truly unique or merges produce duplicates

The recommendation: stay with full refresh until dbt run time exceeds 60 seconds.
Add incremental materialization to the 3 largest staging models first, leave marts
as full refresh (they are small aggregations over already-filtered intermediates).

---

## 6. Backfill Strategy

### The Problem

When a model definition changes (new column, different aggregation, bug fix), historical
data must be reprocessed. At 10M events/day with 90 days of history, a naive backfill
reprocesses 900M events.

### Backfill Architecture

The backfill process follows a snapshot-run-validate-swap pattern:

**Step 1: Snapshot current state**

```bash
# Create backup of current mart tables
dbt run-operation snapshot_marts --args '{suffix: _backup_20260407}'
```

**Step 2: Run backfill DAG with date range**

```bash
# Airflow backfill command
airflow dags backfill transformation_dag \
  --start-date 2026-01-07 \
  --end-date 2026-04-07 \
  --reset-dagruns
```

This triggers the transformation DAG for each historical interval. With CeleryExecutor,
multiple date ranges process in parallel across workers.

**Step 3: Validate backfill output**

```bash
# Run dbt tests on backfilled tables
dbt test --select mart_ml_features mart_user_segments

# Compare row counts and key metrics against backup
dbt run-operation validate_backfill --args '{
  table: mart_ml_features,
  backup: mart_ml_features_backup_20260407,
  tolerance: 0.05
}'
```

The 5% tolerance accounts for legitimate changes from the model update. Flag tables
where metrics diverge by more than the tolerance for manual review.

**Step 4: Swap tables**

```sql
-- Atomic swap (ClickHouse)
RENAME TABLE
  mart_ml_features TO mart_ml_features_old,
  mart_ml_features_new TO mart_ml_features;

-- Drop old table after validation period
-- (keep for 7 days in case rollback is needed)
```

### catchup=False Rationale

All SearchFlow DAGs set `catchup=False`:

```python
dag = DAG(
    'ingestion_dag',
    schedule_interval='*/5 * * * *',
    catchup=False,
    max_active_runs=1,
)
```

Without `catchup=False`, starting Airflow after downtime would trigger backfill runs
for every missed interval. For a DAG running every 5 minutes, 24 hours of downtime
would queue 288 backfill runs, overwhelming the scheduler and potentially causing
duplicate data insertion.

Backfills are always explicit and intentional, triggered via the CLI command above
with specific date ranges and validation steps.

### Backfill Performance Estimates

With CeleryExecutor (4 ETL workers, 4 tasks each = 16 parallel slots):

| History | Events | Sequential | Parallel (16 slots) |
|-|-|-|-|
| 7 days | 70M | ~4 hours | ~15 minutes |
| 30 days | 300M | ~17 hours | ~65 minutes |
| 90 days | 900M | ~51 hours | ~3.2 hours |

These estimates assume ClickHouse as the warehouse. With DuckDB (single-writer),
parallel backfill is not possible and the sequential times apply.

---

## Summary

| Subsystem | Current | At 10M/day | Migration Trigger |
|-|-|-|-|
| Kafka | 1 partition, 1 consumer | 12 partitions, 4 consumers | >50K events/day |
| Warehouse | DuckDB (embedded) | ClickHouse (distributed) | >1M rows or concurrent writers |
| Airflow | LocalExecutor | CeleryExecutor + Redis | >8 concurrent tasks |
| ML Serving | 1 FastAPI instance | 3 replicas + Nginx | p99 latency >500ms |
| dbt | Full refresh | Incremental + partial DAG | dbt run >60 seconds |
| Backfill | Manual re-run | Snapshot-validate-swap | Any schema change at scale |

The key principle: every component is correctly sized for current load. Premature scaling
adds operational overhead without user-facing benefit. Each subsystem has a specific,
measurable trigger for when to scale, and a tested migration path when that trigger fires.
