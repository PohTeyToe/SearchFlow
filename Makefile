# SearchFlow Makefile
# Common commands for development and demo

.PHONY: setup start stop restart logs generate run-pipeline test demo clean help

# ============================================
# SETUP & LIFECYCLE
# ============================================

setup: ## Initial project setup
	@echo "📦 Setting up SearchFlow..."
	cp -n .env.example .env || true
	mkdir -p data/raw data/processed
	docker-compose build
	@echo "✅ Setup complete! Run 'make start' to begin."

start: ## Start all services
	@echo "🚀 Starting SearchFlow services..."
	docker-compose up -d
	@echo "⏳ Waiting for services to be healthy..."
	@sleep 30
	@echo "✅ Services started!"
	@echo "   - Airflow:  http://localhost:8080 (admin/admin)"
	@echo "   - Metabase: http://localhost:3000"

stop: ## Stop all services
	@echo "🛑 Stopping SearchFlow services..."
	docker-compose down

restart: stop start ## Restart all services

logs: ## Follow logs from all services
	docker-compose logs -f

logs-airflow: ## Follow Airflow logs
	docker-compose logs -f airflow-scheduler airflow-webserver

logs-generator: ## Follow event generator logs
	docker-compose logs -f event-generator

# ============================================
# DATA GENERATION
# ============================================

generate: ## Generate 10,000 sample events
	@echo "📊 Generating 10,000 events..."
	docker-compose exec event-generator python -m src.main --count 10000
	@echo "✅ Events generated in data/raw/"

generate-continuous: ## Start continuous event generation (10/sec)
	@echo "📊 Starting continuous event generation..."
	docker-compose exec -d event-generator python -m src.main --mode continuous

generate-burst: ## Generate 100,000 events (load test)
	@echo "📊 Generating 100,000 events for load testing..."
	docker-compose exec event-generator python -m src.main --count 100000 --rate 100

# ============================================
# PIPELINE EXECUTION
# ============================================

run-pipeline: ## Run full pipeline (ingest → transform → reverse-etl)
	@echo "⚙️ Running full pipeline..."
	@echo "  Step 1/3: Ingestion..."
	docker-compose exec airflow-scheduler airflow dags trigger searchflow_ingestion
	@sleep 30
	@echo "  Step 2/3: Transformation..."
	docker-compose exec airflow-scheduler airflow dags trigger searchflow_transformation
	@sleep 60
	@echo "  Step 3/3: Reverse-ETL..."
	docker-compose exec airflow-scheduler airflow dags trigger searchflow_reverse_etl
	@sleep 30
	@echo "✅ Pipeline complete!"

run-ingest: ## Run ingestion DAG only
	docker-compose exec airflow-scheduler airflow dags trigger searchflow_ingestion

run-transform: ## Run transformation DAG only
	docker-compose exec airflow-scheduler airflow dags trigger searchflow_transformation

run-reverse-etl: ## Run reverse-ETL DAG only
	docker-compose exec airflow-scheduler airflow dags trigger searchflow_reverse_etl

# ============================================
# DBT
# ============================================

dbt-run: ## Run all dbt models
	docker-compose exec airflow-scheduler bash -c "cd /dbt && dbt run"

dbt-test: ## Run all dbt tests
	docker-compose exec airflow-scheduler bash -c "cd /dbt && dbt test"

dbt-docs: ## Generate and serve dbt docs
	docker-compose exec airflow-scheduler bash -c "cd /dbt && dbt docs generate && dbt docs serve --port 8081"

dbt-debug: ## Debug dbt connection
	docker-compose exec airflow-scheduler bash -c "cd /dbt && dbt debug"

# ============================================
# TESTING
# ============================================

test: ## Run all tests
	@echo "🧪 Running tests..."
	@make dbt-test
	@echo "✅ All tests passed!"

test-data-quality: ## Run data quality checks
	docker-compose exec airflow-scheduler airflow dags trigger searchflow_data_quality

# ============================================
# DEMO
# ============================================

demo: ## Run full demo (setup → generate → pipeline → show results)
	@echo "🎬 Starting SearchFlow Demo..."
	@echo ""
	@make start
	@sleep 10
	@make generate
	@make run-pipeline
	@echo ""
	@echo "🎉 Demo complete!"
	@echo ""
	@echo "View results at:"
	@echo "   📊 Airflow:  http://localhost:8080 (admin/admin)"
	@echo "   📈 Metabase: http://localhost:3000"
	@echo ""
	@echo "Sample queries to try in DuckDB:"
	@echo "   SELECT * FROM main_analytics.fct_search_funnel LIMIT 10;"
	@echo "   SELECT segment, COUNT(*) FROM main_marketing.mart_user_segments GROUP BY 1;"

# ============================================
# UTILITIES
# ============================================

shell-airflow: ## Open shell in Airflow container
	docker-compose exec airflow-scheduler bash

shell-duckdb: ## Open DuckDB CLI
	docker-compose exec airflow-scheduler bash -c "python -c \"import duckdb; conn = duckdb.connect('/data/searchflow.duckdb'); print('DuckDB connected. Use conn.sql() to query.')\""

psql: ## Open psql to Postgres
	docker-compose exec postgres psql -U airflow -d searchflow

redis-cli: ## Open Redis CLI
	docker-compose exec redis redis-cli

clean: ## Remove all data and containers
	@echo "🧹 Cleaning up..."
	docker-compose down -v
	rm -rf data/raw/* data/processed/*
	@echo "✅ Clean complete!"

clean-events: ## Remove generated events only
	rm -rf data/raw/*

# ============================================
# HELP
# ============================================

help: ## Show this help message
	@echo "SearchFlow - Modern Data Stack Demo"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
