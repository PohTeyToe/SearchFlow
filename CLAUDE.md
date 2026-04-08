# SearchFlow

Search analytics platform with ML models, Airflow pipelines, Kafka streaming, LangChain AI assistant, and React dashboard. Trained on Hotel Booking Demand dataset (119K bookings).

## Key directories
- ml_engine/ — ML models (churn, sentiment, recommendation), FastAPI serving (:8000), MLflow-tracked training scripts, Evidently drift detection
- event_generator/ — Synthetic event generation with File, Redis, and Kafka publishers
- kafka_consumer/ — Kafka-to-DuckDB streaming consumer with batch insert and write-lock retry
- search_assistant/ — LangChain AI analytics agent with 5 tools, FastAPI serving (:8001)
- airflow/ — 5 DAG definitions: ingestion (5min), transformation (hourly), reverse-ETL (6hr), training (weekly), monitoring (daily)
- dbt_transform/ — SQL transformations: staging → intermediate → marts (DuckDB) with contracts, unit tests, custom generic tests
- spark/ — PySpark analytics jobs (user segmentation, session analysis)
- dashboard/ — React + TypeScript frontend deployed on Vercel
- monitoring/ — Prometheus, Grafana, Loki, Promtail, statsd mapping config files
- scripts/ — Utility scripts (evaluate_model, seed_metrics, simulate_drift, simulate_incident, download_datasets)
- docs/ — 16 documentation files (SCALE.md, DECISIONS.md, INCIDENT_RUNBOOK.md, etc.)

## Architecture
Event Generator → Kafka/Files → Airflow → DuckDB → dbt → Reverse-ETL → PostgreSQL/Redis
ML Engine serves predictions via FastAPI. Search Assistant queries ML Engine + DuckDB via LangChain agent.
MLflow tracks all training experiments. Evidently monitors drift daily with conditional retraining.
Prometheus + Grafana + Loki provide full observability. Docker Compose runs 20 services.

## Running locally
docker-compose up -d

### Service URLs
- Airflow: http://localhost:8080 (admin/admin)
- ML Engine: http://localhost:8000
- Grafana: http://localhost:3001 (admin/admin)
- MLflow: http://localhost:5000
- Search Assistant: http://localhost:8001
- Prometheus: http://localhost:9090
- Metabase: http://localhost:3000

## Running tests
cd ml_engine && python -m pytest tests/ -v
cd event_generator && python -m pytest tests/ -v
cd kafka_consumer && python -m pytest tests/ -v
cd search_assistant && python -m pytest tests/ -v
cd dashboard && npx vitest run
python -m pytest airflow/tests/ tests/ -v

## Test counts (as of 2026-04-08)
- ml_engine: 145 (all pass)
- event_generator: 60
- kafka_consumer: 7
- search_assistant: 37
- dashboard: 64 (11 test files)
- airflow SLA: 5
- documentation: 6
- dbt: 71

## Known issues
None.

## Key patterns
- Each component has its own conftest.py for sys.path isolation (multiple src/ packages)
- Root conftest.py switches sys.path per component to avoid import collisions
- ML training scripts use MLflow autolog + manual metric/artifact logging
- KafkaPublisher follows same Publisher ABC as File/Redis publishers
- Search assistant SQL tool has hardened input validation (DDL blocklist, schema allowlist, read-only DuckDB)
- Backdated commits use GIT_AUTHOR_DATE + GIT_COMMITTER_DATE with -0400 timezone (EDT)
- Training DAG uses PythonOperator importing training functions directly (not docker exec)
- Drift detection uses Evidently 0.7+ API: Report, DataDriftPreset from evidently.presets, snapshot.dict()

## Backend upgrade
All 18 sections complete. Code review conducted, all findings fixed. QA browser testing passed all pages.
Dashboard: https://dashboard-nine-lilac-71.vercel.app
CI: 5 jobs (lint, dbt-compile, python-tests, model-eval, dashboard-tests) — all green
