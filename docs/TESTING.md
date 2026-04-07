# Testing Guide

## Overview

SearchFlow has a multi-layer testing strategy covering data quality, Python unit tests, API integration tests, and load benchmarks.

| Layer | Tool | Count | Location |
|-|-|-|-|
| ML engine | pytest | 140 | `ml_engine/tests/` |
| Event generator | pytest | 60 | `event_generator/tests/` |
| Search assistant | pytest | 37 | `search_assistant/tests/` |
| Kafka consumer | pytest | 7 | `kafka_consumer/tests/` |
| Airflow SLA | pytest | 5 | `airflow/tests/` |
| Documentation | pytest | 6 | `tests/` |
| Dashboard | vitest | 64 | `dashboard/src/__tests__/` |
| dbt tests | dbt test | 71 | `dbt_transform/` |
| Load testing | Locust | -- | `benchmarks/locustfile.py` |

---

## Running Tests

### Python Tests

```bash
cd ml_engine && python -m pytest tests/ -v
cd event_generator && python -m pytest tests/ -v
cd kafka_consumer && python -m pytest tests/ -v
cd search_assistant && python -m pytest tests/ -v
python -m pytest airflow/tests/ -v
python -m pytest tests/ -v
```

### Dashboard Tests

```bash
cd dashboard && npx vitest run
```

### dbt Tests

```bash
cd dbt_transform && dbt test --profiles-dir .
```

## CI Pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs 5 jobs on every push to `main`:

1. **lint**: Ruff (Python) + SQLFluff (SQL)
2. **dbt-build**: dbt deps, build, and test
3. **python-tests**: All 4 component test suites (ml_engine, event_generator, kafka_consumer, search_assistant)
4. **model-eval**: Trains churn model from scratch on hotel bookings data, fails if AUC-ROC < 0.83 (depends on python-tests)
5. **dashboard-tests**: `npm ci && npm test`

### Pre-commit Hooks

Local linting via `.pre-commit-config.yaml`:
- **ruff**: Python lint + format
- **sqlfluff**: SQL lint with dbt templater (DuckDB dialect)
- **eslint**: TypeScript/JSX lint for dashboard

```bash
pip install pre-commit
pre-commit install
pre-commit run --all-files
```

---

## Load Testing

```bash
locust -f benchmarks/locustfile.py --host http://localhost:8000

# Headless: 100 users, 10/sec spawn, 60 seconds
locust -f benchmarks/locustfile.py --host http://localhost:8000 \
  --headless -u 100 -r 10 -t 60s --csv benchmarks/results/report
```

---

## Writing New Tests

### Python

Create `test_*.py` in the appropriate `tests/` directory. Use pytest fixtures and mock external dependencies.

### dbt

Add schema tests in YAML files or custom SQL tests in `dbt_transform/tests/`.

---

## Test Configuration

pytest settings are in `pyproject.toml`:

```toml
[tool.pytest.ini_options]
testpaths = ["ml_engine/tests", "event_generator/tests", "kafka_consumer/tests", "search_assistant/tests", "airflow/tests", "tests"]
addopts = "-v --tb=short"
```
