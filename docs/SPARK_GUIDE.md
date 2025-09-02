# PySpark Jobs Documentation

## Overview

SearchFlow includes two PySpark batch analytics jobs running on a Spark 3.5 cluster. These jobs process event data at scale, producing session-level metrics and user segmentation.

---

## Job 1: Session Analysis

**File**: `spark/session_analysis.py`

1. Loads search, click, and conversion events from JSONL files
2. Sessionizes events by user using a 30-minute inactivity timeout
3. Computes per-session metrics: duration, page views, clicks, conversions, bounce flag
4. Builds a conversion funnel summary
5. Writes results to Parquet (or PostgreSQL via JDBC)

### Output: Session Metrics

| Column | Type | Description |
|-|-|-|
| `user_id` | string | User identifier |
| `computed_session_id` | string | Computed session ID |
| `session_start` | timestamp | First event in session |
| `session_end` | timestamp | Last event in session |
| `event_count` | int | Total events |
| `page_views` | int | Search events |
| `click_count` | int | Click events |
| `conversion_count` | int | Conversions |
| `duration_seconds` | long | Session length |
| `is_bounce` | boolean | Single-event session |

### Running

```bash
docker-compose exec spark spark-submit /app/session_analysis.py \
  --data-dir /data/raw --output-dir /data/spark_output
```

---

## Job 2: User Segmentation

**File**: `spark/user_segmentation.py`

1. Reads session metrics Parquet from the session analysis job
2. Aggregates per-user engagement features
3. Computes a composite engagement score (0-100)
4. Assigns each user to a behavioral segment
5. Writes segment assignments to Parquet (or PostgreSQL)

### Engagement Score

Weighted composite (0-100): sessions (20%), clicks (30%), conversions (40%), low bounce (10%).

### Segments

| Segment | Condition |
|-|-|
| `high_value` | At least 1 conversion AND engagement >= 60 |
| `at_risk` | At least 1 conversion AND engagement < 30 |
| `new_user` | 1-2 total sessions |
| `abandoned_search` | Clicks > 0 but zero conversions |
| `regular` | All other users |

### Running

```bash
docker-compose exec spark spark-submit /app/user_segmentation.py \
  --input-dir /data/spark_output --output-dir /data/spark_output
```

---

## Spark Configuration

| Setting | Value |
|-|-|
| Image | Bitnami Spark 3.5 |
| Mode | Standalone master |
| Master URL | `spark://spark:7077` |
| Spark UI | http://localhost:8088 |
| Shuffle partitions | 8 |

---

## Pipeline Order

1. Event Generator writes JSONL to `data/raw/`
2. Session Analysis reads raw JSONL, writes to `data/spark_output/session_metrics/`
3. User Segmentation reads session metrics, writes to `data/spark_output/user_segments/`

These jobs run independently of the Airflow/dbt pipeline, providing complementary batch analytics.
