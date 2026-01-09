# SearchFlow

Search analytics platform with ML models, Airflow pipelines, and React dashboard.

## Key directories
- ml_engine/ — ML models and FastAPI serving
- event_generator/ — Synthetic event generation
- airflow/ — DAG definitions and dbt models
- spark/ — PySpark analytics jobs
- dashboard/ — React + TypeScript frontend

## Running locally
docker-compose up -d

## Running tests
cd ml_engine && python -m pytest tests/ -v
cd event_generator && python -m pytest tests/ -v
