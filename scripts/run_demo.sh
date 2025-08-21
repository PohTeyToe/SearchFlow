#!/bin/bash
# SearchFlow Demo Script
# Runs the complete pipeline end-to-end

set -e

echo "🚀 ============================================"
echo "   SearchFlow Analytics Platform Demo"
echo "   ============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

echo "📦 Step 1/5: Starting services..."
docker-compose up -d
echo -e "${GREEN}✓ Services started${NC}"
echo ""

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check Airflow health
echo "   Checking Airflow..."
for i in {1..10}; do
    if curl -s http://localhost:8080/health > /dev/null 2>&1; then
        echo -e "${GREEN}   ✓ Airflow is ready${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${YELLOW}   ⚠ Airflow may still be starting...${NC}"
    fi
    sleep 5
done
echo ""

echo "📊 Step 2/5: Generating sample events..."
docker-compose exec -T event-generator python -m src.main --mode once --count 10000 --output file
echo -e "${GREEN}✓ Generated 10,000 events${NC}"
echo ""

echo "⚙️  Step 3/5: Running ingestion pipeline..."
docker-compose exec -T airflow-scheduler airflow dags trigger searchflow_ingestion
echo "   Waiting for ingestion to complete..."
sleep 45
echo -e "${GREEN}✓ Ingestion complete${NC}"
echo ""

echo "🔄 Step 4/5: Running dbt transformations..."
docker-compose exec -T airflow-scheduler airflow dags trigger searchflow_transformation
echo "   Waiting for transformations to complete..."
sleep 90
echo -e "${GREEN}✓ Transformations complete${NC}"
echo ""

echo "📤 Step 5/5: Running Reverse-ETL syncs..."
docker-compose exec -T airflow-scheduler airflow dags trigger searchflow_reverse_etl
echo "   Waiting for syncs to complete..."
sleep 30
echo -e "${GREEN}✓ Reverse-ETL complete${NC}"
echo ""

echo "============================================"
echo -e "${GREEN}🎉 Demo Complete!${NC}"
echo "============================================"
echo ""
echo "View your results:"
echo "  📊 Airflow UI:    http://localhost:8080"
echo "                    Username: admin"
echo "                    Password: admin"
echo ""
echo "  📈 Metabase:      http://localhost:3000"
echo "                    (First-time setup required)"
echo ""
echo "Sample DuckDB queries to try:"
echo "  docker-compose exec airflow-scheduler python -c \""
echo "  import duckdb"
echo "  conn = duckdb.connect('/data/searchflow.duckdb')"
echo "  print(conn.execute('SELECT COUNT(*) FROM raw.search_events').fetchone())"
echo "  print(conn.execute('SELECT * FROM main_analytics.fct_search_funnel LIMIT 5').fetchdf())"
echo "  \""
echo ""
echo "============================================"
