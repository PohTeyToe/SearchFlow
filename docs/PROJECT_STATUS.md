# SearchFlow Project Status

> **Last Updated**: April 2, 2025
> **Status**: Complete

---

## Project Metrics

| Metric | Value |
|-|-|
| Docker Services | 20 |
| Python Tests (pytest) | 255 |
| Dashboard Tests (vitest) | 64 |
| dbt Tests | 71 |
| Airflow DAGs | 5 |
| Grafana Dashboards | 4 |
| ML Models | 3 (churn, sentiment, recommendation) |
| Documentation Pages | 16 |

---

## Architecture

```
Event Generator → Kafka 4.0 (KRaft) → Kafka Consumer → DuckDB
                                            ↓
                  Airflow → dbt (staging → intermediate → marts)
                                            ↓
                  Reverse-ETL → Redis/Postgres    ML Engine (FastAPI)
                                                       ↓
                  Prometheus → Grafana           Search Assistant (LangGraph)
                  Loki → Promtail                React Dashboard (Vercel)
```

**DAGs:**
- `searchflow_ingestion`: JSONL/Kafka → DuckDB raw tables (every 5 min)
- `searchflow_transformation`: dbt run + test (hourly)
- `searchflow_reverse_etl`: Sync marts → Redis/Postgres (every 6 hrs)
- `searchflow_training`: Weekly ML model retraining with MLflow
- `searchflow_model_monitoring`: Daily drift detection with conditional retraining

---

## Observability Stack

| Service | Port | Purpose |
|-|-|-|
| Prometheus | :9090 | Metrics collection |
| Grafana | :3001 | Dashboard visualization |
| Loki | :3100 | Log aggregation |
| statsd-exporter | :9102 | Airflow metrics bridge |
| kafka-exporter | :9308 | Kafka metrics bridge |
| Promtail | -- | Log shipping to Loki |

---

## Service URLs

| Service | URL | Credentials |
|-|-|-|
| Dashboard | https://dashboard-nine-lilac-71.vercel.app | -- |
| Airflow | http://localhost:8080 | admin/admin |
| ML Engine | http://localhost:8000 | -- |
| Grafana | http://localhost:3001 | admin/admin |
| MLflow | http://localhost:5000 | -- |
| Search Assistant | http://localhost:8001 | -- |
| Metabase | http://localhost:3000 | -- |
| Prometheus | http://localhost:9090 | -- |

---

## Key Directories

```
SearchFlow/
├── dashboard/             React + TypeScript (Vercel)
├── ml_engine/             Churn, sentiment, recommendations (FastAPI + MLflow)
├── event_generator/       Synthetic search traffic (Kafka producer)
├── airflow/               5 DAGs (ingestion, transform, reverse-ETL, training, monitoring)
├── dbt_transform/         SQL transforms with contracts and unit tests
├── kafka_consumer/        Kafka-to-DuckDB streaming consumer
├── search_assistant/      LangChain + LangGraph AI agent
├── spark/                 PySpark batch analytics
├── reverse_etl/           Sync marts to CRM, email, Redis
├── monitoring/            Prometheus, Grafana, Loki, Promtail configs
├── docs/                  16 documentation files
├── scripts/               Utility and simulation scripts
└── docker-compose.yml     20 services
```
