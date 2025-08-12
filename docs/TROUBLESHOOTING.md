# Troubleshooting Guide

Common issues and solutions for SearchFlow.

## Docker Issues

### Containers won't start

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs

# Restart with fresh build
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Port already in use

```
Error: bind: address already in use
```

**Fix**: Stop conflicting processes or change ports in `docker-compose.yml`.

```bash
# Find process using port 8080
netstat -ano | findstr :8080
# On Linux/Mac: lsof -i :8080
```

### Out of disk space

```bash
# Clean Docker artifacts
docker system prune -a --volumes
```

---

## Airflow Issues

### DAG not appearing

```bash
# Check for import errors
docker-compose exec airflow-scheduler airflow dags list-import-errors

# Refresh DAGs
docker-compose exec airflow-scheduler airflow dags reserialize
```

### Task stuck in "running"

```bash
# Clear task state
docker-compose exec airflow-scheduler airflow tasks clear searchflow_ingestion -t ingest_search_events -y
```

### Can't login to Airflow UI

- **URL**: http://localhost:8080
- **Default credentials**: `admin` / `admin`

If password doesn't work, reset it:

```bash
docker-compose exec airflow-webserver airflow users reset-password -u admin -p admin
```

---

## dbt Issues

### Connection error

```bash
# Debug connection
docker-compose exec airflow-scheduler bash -c "cd /dbt && dbt debug"
```

### Model compilation error

```bash
# Compile without running
docker-compose exec airflow-scheduler bash -c "cd /dbt && dbt compile"

# Run single model
docker-compose exec airflow-scheduler bash -c "cd /dbt && dbt run -s model_name"
```

### Tests failing

```bash
# Run tests with verbose output
docker-compose exec airflow-scheduler bash -c "cd /dbt && dbt test --store-failures"
```

Common test failures:
- **not_null**: Check source data for missing values
- **unique**: Check for duplicate event_ids
- **relationships**: Verify foreign key references exist

---

## DuckDB Issues

### Database locked

```
Error: database is locked
```

**Cause**: DuckDB only allows one writer at a time.

**Fix**: Ensure only one process writes to the database:
- Stop concurrent DAG runs
- Check for hanging Python processes

### Query errors

```bash
# Connect to DuckDB interactively
docker-compose exec airflow-scheduler python -c "
import duckdb
conn = duckdb.connect('/data/searchflow.duckdb')
print(conn.execute('SHOW TABLES').fetchall())
"
```

---

## Event Generator Issues

### No events generated

Check output directory exists:

```bash
docker-compose exec event-generator ls -la /data/raw/
```

Check logs:

```bash
docker-compose logs event-generator
```

### Events not being ingested

Verify JSONL format:

```bash
docker-compose exec event-generator head -1 /data/raw/search_events.jsonl | python -m json.tool
```

---

## Dashboard Issues

### npm install fails

```bash
cd dashboard
rm -rf node_modules package-lock.json
npm install
```

### Build errors

```bash
# Type check
npm run typecheck

# Lint
npm run lint
```

### Dev server won't start

```bash
# Check if port 5173 is available
netstat -ano | findstr :5173

# Start on different port
npm run dev -- --port 3001
```

---

## Quick Debug Commands

```bash
# Check all services
docker-compose ps

# Follow all logs
docker-compose logs -f

# Restart specific service
docker-compose restart airflow-scheduler

# Shell into container
docker-compose exec airflow-scheduler bash

# Check DuckDB tables
make shell-duckdb

# Check Postgres
make psql

# Check Redis
make redis-cli
```
