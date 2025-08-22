# Utility Scripts

Helper scripts for setup, data management, and verification.

## Scripts

| Script | Purpose |
|--------|---------|
| `setup_local.sh` | Initialize local development environment |
| `run_demo.sh` | Run complete end-to-end demo |
| `seed_data.py` | Generate initial seed data |
| `load_to_duckdb.py` | Load JSONL files to DuckDB |
| `verify_data.py` | Verify data in raw tables |
| `verify_marts.py` | Verify transformed marts |
| `init_databases.sql` | Create database schemas |

## Usage

### setup_local.sh

Initialize the local development environment:

```bash
./scripts/setup_local.sh
```

Creates:
- `.env` file from template
- `data/raw/` and `data/processed/` directories
- Initial database schemas

### run_demo.sh

Run the complete demo pipeline:

```bash
./scripts/run_demo.sh
```

Steps:
1. Generates 10,000 sample events
2. Triggers ingestion DAG
3. Triggers transformation DAG
4. Triggers reverse-ETL DAG
5. Prints summary statistics

### seed_data.py

Generate seed data for testing:

```bash
python scripts/seed_data.py --count 1000
```

### load_to_duckdb.py

Load JSONL files to DuckDB (used by ingestion DAG):

```bash
python scripts/load_to_duckdb.py --source /data/raw --target /data/searchflow.duckdb
```

### verify_data.py

Check raw table counts:

```bash
python scripts/verify_data.py
```

Output:
```
raw.search_events: 6,542 rows
raw.click_events: 1,962 rows
raw.conversion_events: 196 rows
```

### verify_marts.py

Check transformed mart data:

```bash
python scripts/verify_marts.py
```

Output:
```
main_analytics.fct_search_funnel: 170 rows
main_analytics.dim_users: 1,607 rows
main_marketing.mart_user_segments: 1,607 rows
main_marketing.mart_recommendations: 67 rows
```

### init_databases.sql

SQL script to initialize database schemas:

```bash
# Run via psql
psql -U airflow -d searchflow -f scripts/init_databases.sql
```

## Make Shortcuts

Most scripts are wrapped in Makefile targets:

```bash
make setup      # setup_local.sh
make demo       # run_demo.sh
make generate   # Generate events
```
