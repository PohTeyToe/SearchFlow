# Deployment Guide

## Local Development

### Prerequisites

- Docker Desktop 4.x+
- Docker Compose v2
- 8 GB RAM minimum (16 GB recommended)
- 10 GB free disk space

### Quick Start

```bash
git clone https://github.com/PohTeyToe/SearchFlow.git
cd SearchFlow
chmod +x scripts/setup.sh
./scripts/setup.sh
make start
docker-compose ps
```

### Service URLs

| Service | URL | Credentials |
|-|-|-|
| Airflow Web UI | http://localhost:8080 | admin / admin |
| ML API (Swagger) | http://localhost:8000/docs | -- |
| Metabase | http://localhost:3000 | Setup on first visit |
| Spark Master UI | http://localhost:8088 | -- |
| React Dashboard | http://localhost:5173 | -- |
| PostgreSQL | localhost:5432 | airflow / airflow |
| Redis | localhost:6379 | -- |

---

## Docker Architecture

SearchFlow runs 9 services orchestrated by Docker Compose:

```
searchflow-postgres          PostgreSQL 15 (Airflow metadata + CRM tables)
searchflow-redis             Redis 7 Alpine (event buffer + ML cache)
searchflow-airflow-init      One-shot Airflow DB initialization
searchflow-airflow-webserver Airflow 2.8 web UI
searchflow-airflow-scheduler Airflow 2.8 scheduler
searchflow-event-generator   Python event simulator
searchflow-reverse-etl       Python reverse-ETL syncs
searchflow-ml-engine         FastAPI ML inference server
searchflow-spark             PySpark 3.5 (Bitnami image)
searchflow-metabase          Metabase (optional BI tool)
```

### Build Custom Images

Three services use custom Dockerfiles:

```bash
docker-compose build
docker-compose build ml-engine
```

Custom images:
- `event_generator/Dockerfile` -- Python 3.11 with redis, faker, click
- `ml_engine/Dockerfile` -- Python 3.11 with torch, transformers, fastapi
- `reverse_etl/Dockerfile` -- Python 3.11 with duckdb, psycopg2, redis
- `spark/Dockerfile` -- Bitnami Spark 3.5 with psycopg2

---

## Environment Configuration

Copy `.env.example` to `.env` and adjust values as needed:

```bash
cp .env.example .env
```

Key variables:

| Variable | Default | Description |
|-|-|-|
| `EVENTS_PER_SECOND` | 10 | Event generation rate |
| `CLICK_THROUGH_RATE` | 0.30 | Simulated CTR |
| `CONVERSION_RATE` | 0.10 | Simulated conversion rate |
| `USER_POOL_SIZE` | 10000 | Number of simulated users |
| `CACHE_TTL` | 3600 | Redis cache TTL for ML results (seconds) |
| `DUCKDB_PATH` | /data/searchflow.duckdb | Warehouse file location |

---

## Volume Mounts

| Host Path | Container Path | Used By |
|-|-|-|
| `./data` | `/data` | All services (shared data directory) |
| `./airflow/dags` | `/opt/airflow/dags` | Airflow scheduler and webserver |
| `./dbt_transform` | `/dbt` | Airflow (runs dbt inside scheduler) |
| `./event_generator/src` | `/app/src` | Event generator (live reload) |
| `./reverse_etl/src` | `/app/src` | Reverse-ETL (live reload) |
| `./ml_engine/models` | `/app/models` | ML engine (trained model artifacts) |
| `./spark` | `/app` | Spark (job scripts) |

---

## Development Workflow

### Using Dev Overrides

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

This adds `--reload` to ML engine, debug port 5678, shorter cache TTL, and faster Airflow DAG scanning.

### Running PySpark Jobs

```bash
docker-compose exec spark spark-submit /app/session_analysis.py \
  --data-dir /data/raw --output-dir /data/spark_output

docker-compose exec spark spark-submit /app/user_segmentation.py \
  --input-dir /data/spark_output --output-dir /data/spark_output
```

---

## Health Checks

| Service | Check | Interval |
|-|-|-|
| PostgreSQL | `pg_isready -U airflow` | 5s |
| Airflow Webserver | `curl --fail http://localhost:8080/health` | 10s |
| ML Engine | `curl --fail http://localhost:8000/health` | 30s |

---

## Resource Requirements

| Service | Memory |
|-|-|
| PostgreSQL | 200 MB |
| Redis | 50 MB |
| Airflow Webserver | 400 MB |
| Airflow Scheduler | 300 MB |
| Event Generator | 100 MB |
| ML Engine | 800 MB (with PyTorch models loaded) |
| Spark | 1-2 GB |
| Metabase | 500 MB |

Total: approximately 3-4 GB with all services running.

---

## Production Considerations

This project is designed for local development and portfolio demonstration. For production:

1. **Orchestration**: Replace Docker Compose with Kubernetes
2. **Warehouse**: Replace DuckDB with Snowflake or BigQuery
3. **Streaming**: Replace file-based events with Kafka or Kinesis
4. **Secrets**: Use a secrets manager instead of `.env` files
5. **Monitoring**: Add Prometheus + Grafana for service metrics
6. **CI/CD**: Extend GitHub Actions with Docker image builds and staged deployments
7. **Scaling**: Run the ML engine behind a load balancer with multiple replicas
