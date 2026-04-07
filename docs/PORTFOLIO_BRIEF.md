# SearchFlow — Portfolio Brief

> This file exists for external agents preparing application materials (resumes, cover letters).
> It summarizes what SearchFlow is, what skills it demonstrates, and how to frame it for different roles.

## One-Liner

Search analytics platform that streams user behavior through Kafka, predicts churn with explainable ML, and surfaces insights via a LangChain AI assistant — built end-to-end from event generation to Grafana dashboards.

## What It Is

SearchFlow simulates a travel search platform's analytics backend. It answers questions like: "Why are users churning?", "Which destinations should we promote?", and "How do users feel about our search results?" — from raw event capture through ML inference and business intelligence.

The demo vertical is travel search (Hotel Booking Demand dataset, 119K bookings), but the architecture applies to any search/e-commerce platform.

## Tech Stack

| Layer | Technologies |
|-|-|
| Streaming | Apache Kafka 4.0 (KRaft), confluent-kafka |
| Orchestration | Apache Airflow (5 DAGs) |
| Warehouse | DuckDB, dbt (staging → intermediate → marts) |
| ML Models | XGBoost, scikit-learn, SHAP, PyTorch, DistilBERT |
| Experiment Tracking | MLflow 3.x |
| Drift Detection | Evidently AI (conditional retraining) |
| AI Assistant | LangChain, Claude API |
| API | FastAPI, Pydantic, Redis caching |
| Frontend | React, TypeScript, Tailwind CSS, Framer Motion |
| Observability | Prometheus, Grafana (4 dashboards), Loki, Promtail |
| Infrastructure | Docker Compose (20 services), GitHub Actions CI/CD |
| Data Quality | dbt contracts, unit tests, custom generic tests (71 dbt tests) |

## Key Metrics

- 12,300+ lines of Python, 10,300+ lines of TypeScript
- 395+ automated tests across 7 components
- 20 Docker Compose services
- 5 Airflow DAGs (ingestion, transformation, reverse-ETL, training, monitoring)
- 3 ML models: churn (0.87 AUC), sentiment (TF-IDF + BERT), hybrid recommendations
- 7 CI/CD jobs with model evaluation gate (AUC >= 0.83)
- 4 Grafana dashboards (pipeline health, ML serving, Kafka metrics, system overview)
- 16 documentation files (ADRs, incident runbooks, scaling analysis)

## Resume Bullet Points

### For Data Engineering roles
- Built end-to-end data pipeline: Kafka 4.0 streaming → Airflow orchestration → DuckDB warehouse → dbt transformations (staging/intermediate/marts) with 71 data quality tests
- Designed real-time + batch ingestion architecture handling 100-500 events/sec with Kafka consumer service, DuckDB write-lock retry, and INSERT OR IGNORE deduplication
- Implemented reverse-ETL syncing analytics marts to PostgreSQL CRM, Redis recommendation cache, and email trigger queue via Airflow DAG

### For ML Engineering roles
- Trained 3 production ML models (XGBoost churn predictor with 0.87 AUC, TF-IDF/BERT sentiment classifier, hybrid collaborative+content recommendation engine) with MLflow experiment tracking
- Built automated ML pipeline: Evidently drift detection → conditional retraining → MLflow artifact logging → SHAP explainability reports, orchestrated by Airflow DAG
- Served ML predictions via FastAPI with Redis caching, rate limiting, Prometheus instrumentation, and API key authentication

### For AI/GenAI roles
- Built LangChain search analytics agent with 5 custom tools (ML model queries, hardened SQL analytics, SHAP explanation synthesis) powered by Claude LLM backend
- Implemented SQL injection hardening: DDL blocklist, file-reading function blocklist, schema allowlist, query length limits, read-only DuckDB connection

### For Full-Stack / SWE roles
- Built search analytics platform with React/TypeScript dashboard (64 tests), FastAPI backend (145 tests), and 20-service Docker Compose infrastructure
- Implemented full observability stack: Prometheus metrics, Grafana dashboards, Loki log aggregation, structured JSON logging, SLA monitoring on all pipeline DAGs
- Set up CI/CD with 7 GitHub Actions jobs, pre-commit hooks (ruff, sqlfluff, eslint), and model evaluation gate blocking merges below 0.83 AUC

## How to Frame for Specific Companies

### Data Engineering roles (DotDash, Snowflake, DoorDash)
Lead with: Kafka streaming, Airflow orchestration, dbt transformations, data quality testing. Emphasize the pipeline architecture and production patterns (monitoring, retry logic, deduplication).

### ML/AI Engineering roles (Altera, Ember, Bild AI)
Lead with: 3 ML models with SHAP explainability, MLflow tracking, Evidently drift detection, LangChain agent. Emphasize the full MLOps lifecycle (train → track → monitor → retrain).

### SWE roles (Valsoft, Hootsuite, Intuit)
Lead with: Full-stack architecture, React dashboard, FastAPI APIs, Docker infrastructure, CI/CD pipeline. Emphasize testing depth (395+ tests) and production readiness (observability, error handling).

## Links

- GitHub: https://github.com/PohTeyToe/SearchFlow
- Dashboard: https://dashboard-nine-lilac-71.vercel.app
