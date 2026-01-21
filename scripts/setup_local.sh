#!/bin/bash
# SearchFlow Local Setup Script
# Sets up the project for local development

set -e

echo "🔧 SearchFlow Local Setup"
echo "========================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi
echo "✓ Docker installed"

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
echo "✓ Docker Compose installed"

# Create directories
echo ""
echo "Creating directories..."
mkdir -p data/raw data/processed
mkdir -p airflow/plugins airflow/config
mkdir -p dbt_transform/seeds dbt_transform/macros dbt_transform/snapshots dbt_transform/analyses
echo "✓ Directories created"

# Copy environment file
echo ""
echo "Setting up environment..."
if [ ! -f .env ]; then
    if [ -f env.example ]; then
        cp env.example .env
        echo "✓ Created .env from env.example"
    else
        echo "⚠ No env.example found, skipping .env creation"
    fi
else
    echo "✓ .env already exists"
fi

# Build Docker images
echo ""
echo "Building Docker images..."
docker-compose build
echo "✓ Docker images built"

echo ""
echo "========================="
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Review .env file and adjust settings if needed"
echo "  2. Run 'make start' to start all services"
echo "  3. Run 'make demo' to run the full demo"
echo ""
