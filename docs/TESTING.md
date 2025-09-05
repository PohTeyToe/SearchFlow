# Testing Guide

## Overview

SearchFlow has a multi-layer testing strategy covering data quality, Python unit tests, API integration tests, and load benchmarks.

| Layer | Tool | Count | Location |
|-|-|-|-|
| Data quality | dbt test | 79 tests | `dbt_transform/tests/` and schema YAML |
| ML unit tests | pytest | 14 tests | `ml_engine/tests/` |
| Event generator | pytest | 12 tests | `event_generator/tests/` |
| Reverse-ETL | pytest | 8 tests | `reverse_etl/tests/` |
| API integration | pytest + httpx | 10 tests | `ml_engine/tests/test_api.py` |
| Evaluation | pytest | 6 tests | `ml_engine/tests/test_evaluation.py` |
| Load testing | Locust | -- | `benchmarks/locustfile.py` |

---

## Running Tests

### All Python Tests

```bash
make test

# Or run pytest directly
cd ml_engine && python -m pytest tests/ -v
cd event_generator && python -m pytest tests/ -v
cd reverse_etl && python -m pytest tests/ -v
```

### dbt Tests

```bash
make dbt-test
```

### CI Pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs on every push to `main`:

1. **dbt-compile**: Compiles models, lints SQL with sqlfluff
2. **python-lint**: Runs ruff on Python source
3. **python-test**: Runs pytest for all three packages

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
testpaths = ["event_generator/tests", "ml_engine/tests", "reverse_etl/tests"]
addopts = "-v --tb=short"
```
