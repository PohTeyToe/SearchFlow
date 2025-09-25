# Changelog

All notable changes to SearchFlow are documented in this file.

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
