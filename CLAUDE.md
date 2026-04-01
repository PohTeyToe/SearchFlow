# SearchFlow

Search analytics platform with ML models, Airflow pipelines, Kafka streaming, LangChain AI assistant, and React dashboard.

## Key directories
- ml_engine/ — ML models (churn, sentiment, recommendation), FastAPI serving (:8000), MLflow-tracked training scripts
- event_generator/ — Synthetic event generation with File, Redis, and Kafka publishers
- kafka_consumer/ — Kafka-to-DuckDB streaming consumer with batch insert and write-lock retry
- search_assistant/ — LangChain AI analytics agent with 5 tools, FastAPI serving (:8001)
- airflow/ — DAG definitions: ingestion (5min), transformation (hourly), reverse-ETL (6hr), training (weekly)
- dbt_transform/ — SQL transformations: staging → intermediate → marts (DuckDB)
- spark/ — PySpark analytics jobs (user segmentation, session analysis)
- dashboard/ — React + TypeScript frontend
- scripts/ — Setup utilities and DB init scripts

## Architecture
Event Generator → Kafka/Files → Airflow → DuckDB → dbt → Reverse-ETL → PostgreSQL/Redis
ML Engine serves predictions via FastAPI. Search Assistant queries ML Engine + DuckDB via LangChain agent.
MLflow tracks all training experiments. Docker Compose runs 14 services.

## Running locally
docker-compose up -d

### Service URLs
- Airflow: http://localhost:8080 (admin/admin)
- ML Engine: http://localhost:8000
- MLflow: http://localhost:5000
- Search Assistant: http://localhost:8001
- Metabase: http://localhost:3000

## Running tests
cd ml_engine && python -m pytest tests/ -v
cd event_generator && python -m pytest tests/ -v
cd kafka_consumer && python -m pytest tests/ -v
cd search_assistant && python -m pytest tests/ -v

## Key patterns
- Each component has its own conftest.py for sys.path isolation (multiple src/ packages)
- Root conftest.py switches sys.path per component to avoid import collisions
- ML training scripts use MLflow autolog + manual metric/artifact logging
- KafkaPublisher follows same Publisher ABC as File/Redis publishers
- Search assistant SQL tool has hardened input validation (DDL blocklist, schema allowlist, read-only DuckDB)
- Backdated commits use GIT_AUTHOR_DATE + GIT_COMMITTER_DATE with -0500 timezone
