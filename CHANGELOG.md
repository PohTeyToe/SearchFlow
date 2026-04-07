# Changelog

All notable changes to SearchFlow are documented in this file.

## [Unreleased]

## [0.9.0] - 2025-04-02

### Added
- Prometheus, Grafana (:3001), Loki, statsd-exporter, kafka-exporter, promtail Docker services (6 new containers)
- 4 provisioned Grafana dashboards: pipeline-health, ml-serving, kafka-metrics, system-overview
- Evidently AI drift detection module with 4 simulation scenarios (pandemic, seasonal, geographic, price inflation)
- Monitoring Airflow DAG with conditional retraining via TriggerDagRunOperator
- `/monitor/drift`, `/monitor/performance`, `/monitor/drift/report` API endpoints
- structlog JSON logging configuration for all 4 Python services
- SLA monitoring (`sla=timedelta()`) on all 5 Airflow DAGs
- `docs/INCIDENT_RUNBOOK.md` with 5 failure scenario decision trees
- `docs/INCIDENT_EXAMPLES.md` with 2 postmortem examples
- `docs/SCALE.md` — scaling analysis for 10M events/day
- `docs/DECISIONS.md` — 8 architecture decision records
- `scripts/evaluate_model.py` — CI model evaluation gate (AUC-ROC >= 0.83)
- `scripts/seed_metrics.py` — populate Grafana dashboards with sample data
- `scripts/simulate_incident.py` — data quality incident simulation
- `scripts/simulate_drift.py` — distribution shift simulation with Evidently reports
- Dashboard drift monitoring panel (DriftMonitor, DriftStatusIndicator, PerformanceChart)
- Pre-commit hooks: ruff (Python), sqlfluff (SQL), eslint (TypeScript)
- `.sqlfluff` config with dbt templater and DuckDB dialect

### Changed
- Consolidated CI workflow from 7 jobs to 5, added model-eval gate
- Docker Compose: 14 services → 20 services
- Airflow StatsD metrics emission to statsd-exporter
- README updated with real model metrics, dataset attribution, Grafana URL

## [0.8.0] - 2025-03-27

### Added
- Hotel Booking Demand dataset integration (119,390 bookings, CC BY 4.0)
- Churn model rewrite with 14 hotel booking features and XGBoost (AUC-ROC 0.87+)
- Sentiment and recommender training updated for real datasets
- Event generator samples from real hotel booking distributions
- dbt model contracts with `contract: {enforced: true}` on mart models
- 12 dbt unit tests for transformation logic
- `mart_ml_features` dbt model computing 14 churn features in SQL
- 3 custom dbt generic tests (test_positive_value, test_valid_ratio, test_referential_integrity)
- Kafka 4.0 KRaft streaming pipeline with DuckDB consumer
- Search assistant LangGraph agent with 5 tools
- MLflow experiment tracking for all model training
- Prometheus FastAPI instrumentator on ML Engine

### Changed  
- Training scripts use MLflow autolog + manual metric/artifact logging
- dbt source freshness thresholds tightened
- dbt-duckdb upgraded to 1.8+

## [0.6.0] - 2026-01-06

### Added
- Locust load test suite for ML API endpoints (`benchmarks/locustfile.py`)
- Benchmark runner script with CSV report output (`benchmarks/run_benchmark.sh`)
- Python test job in GitHub Actions CI pipeline
- Evaluation metrics tests for precision, NDCG, and AUC-ROC

### Changed
- CI workflow now runs dbt compile, Python lint, and Python tests in parallel

## [0.5.0] - 2025-12-20

### Added
- PySpark session analysis job with 30-minute sessionization (`spark/session_analysis.py`)
- PySpark user segmentation with engagement scoring (`spark/user_segmentation.py`)
- Spark service in docker-compose with Bitnami image
- PyTorch sentiment training pipeline with DistilBERT fine-tuning

### Changed
- docker-compose.yml updated with Spark master service, ports 7077 and 8088

## [0.4.0] - 2025-12-11

### Added
- ML model evaluation framework with honest metrics (no demo boosts)
- Training results directory for persisted metrics JSON files
- README updated with real performance numbers from evaluation runs

### Fixed
- Removed artificial metric inflation from ML training code
- Evaluation metrics now reflect actual model performance

## [0.3.0] - 2025-11-26

### Added
- React + TypeScript analytics dashboard with 38 components
- ML engine with three models: recommendation, sentiment, churn
- FastAPI inference server with Redis caching
- Component-level README files for each service
- Dashboard screenshots in README
- Comprehensive ML engine documentation

### Changed
- Rebranded as Travel Search Analytics Platform with problem-focused narrative
- Dashboard optimized for 10K+ events using data decimation

## [0.2.0] - 2025-11-22

### Added
- Airflow DAGs for ingestion, transformation, and reverse-ETL
- dbt models: staging, intermediate, and mart layers
- Reverse-ETL service with CRM, email, and Redis sync
- Event generator with realistic travel search simulation
- DuckDB warehouse with raw, staging, and mart schemas
- PostgreSQL CRM simulation tables
- Redis event buffer and ML cache
- Metabase for BI dashboards

## [0.1.0] - 2025-11-21

### Added
- Initial project structure and docker-compose configuration
- Event data models (SearchEvent, ClickEvent, ConversionEvent)
- File-based event publisher
- Database initialization scripts
- Environment configuration and .gitignore
