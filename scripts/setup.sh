#!/bin/bash
# SearchFlow One-Command Setup
#
# Sets up the entire development environment from a fresh clone.
# Prerequisites: Docker, Docker Compose, Python 3.11+, Node.js 18+
#
# Usage:
#   chmod +x scripts/setup.sh
#   ./scripts/setup.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "SearchFlow Development Environment Setup"
echo "========================================="
echo ""

# --------------------------------------------------
# 1. Check prerequisites
# --------------------------------------------------

echo "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Install it from https://docs.docker.com/get-docker/"
    exit 1
fi
log_info "Docker installed ($(docker --version | head -c 30))"

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    log_error "Docker Compose is not installed."
    exit 1
fi
log_info "Docker Compose available"

if ! command -v python3 &> /dev/null; then
    log_warn "Python 3 not found. Python tests and scripts will not work locally."
else
    PYTHON_VERSION=$(python3 --version 2>&1)
    log_info "Python installed ($PYTHON_VERSION)"
fi

if ! command -v node &> /dev/null; then
    log_warn "Node.js not found. Dashboard development will not work locally."
else
    NODE_VERSION=$(node --version 2>&1)
    log_info "Node.js installed ($NODE_VERSION)"
fi

echo ""

# --------------------------------------------------
# 2. Create directories
# --------------------------------------------------

echo "Creating directories..."

mkdir -p data/raw data/processed data/spark_output
mkdir -p airflow/plugins airflow/config airflow/logs
mkdir -p dbt_transform/seeds dbt_transform/macros dbt_transform/snapshots dbt_transform/analyses
mkdir -p ml_engine/models/recommendation ml_engine/models/sentiment ml_engine/models/churn
mkdir -p ml_engine/training_results
mkdir -p benchmarks/results

log_info "Directory structure created"

# --------------------------------------------------
# 3. Environment file
# --------------------------------------------------

echo "Setting up environment..."

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        log_info "Created .env from .env.example"
    elif [ -f env.example ]; then
        cp env.example .env
        log_info "Created .env from env.example"
    else
        log_warn "No example env file found; skipping .env creation"
    fi
else
    log_info ".env already exists"
fi

# --------------------------------------------------
# 4. Install Python dev dependencies (optional)
# --------------------------------------------------

if command -v python3 &> /dev/null; then
    echo ""
    echo "Installing Python development tools..."

    python3 -m pip install --quiet --upgrade pip 2>/dev/null || true
    python3 -m pip install --quiet ruff pytest 2>/dev/null || true

    if command -v ruff &> /dev/null; then
        log_info "Ruff linter installed"
    fi
fi

# --------------------------------------------------
# 5. Install dashboard dependencies (optional)
# --------------------------------------------------

if command -v node &> /dev/null && [ -f dashboard/package.json ]; then
    echo ""
    echo "Installing dashboard dependencies..."
    (cd dashboard && npm install --silent 2>/dev/null) || log_warn "npm install failed; dashboard may not build"
    log_info "Dashboard dependencies installed"
fi

# --------------------------------------------------
# 6. Build Docker images
# --------------------------------------------------

echo ""
echo "Building Docker images (this may take a few minutes)..."

docker-compose build --parallel 2>/dev/null || docker-compose build
log_info "Docker images built"

# --------------------------------------------------
# 7. Summary
# --------------------------------------------------

echo ""
echo "========================================="
log_info "Setup complete!"
echo ""
echo "Quick start:"
echo "  make start          # Start all services"
echo "  make generate       # Generate 10,000 sample events"
echo "  make run-pipeline   # Run ingestion + transformation + reverse-ETL"
echo "  make demo           # All of the above in one command"
echo ""
echo "Service URLs (after 'make start'):"
echo "  Airflow:    http://localhost:8080  (admin / admin)"
echo "  ML API:     http://localhost:8000/docs"
echo "  Metabase:   http://localhost:3000"
echo "  Spark UI:   http://localhost:8088"
echo "  Dashboard:  http://localhost:5173"
echo ""
