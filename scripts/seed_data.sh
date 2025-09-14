#!/bin/bash
# SearchFlow Sample Data Generator
#
# Generates sample event data for development and testing.
#
# Usage:
#   chmod +x scripts/seed_data.sh
#   ./scripts/seed_data.sh              # Default: 1000 sessions
#   ./scripts/seed_data.sh 5000         # Custom: 5000 sessions
#   ./scripts/seed_data.sh --docker     # Run inside the event-generator container

set -euo pipefail

NUM_SESSIONS="${1:-1000}"
OUTPUT_DIR="${OUTPUT_DIR:-data/raw}"

if [ "${1:-}" = "--docker" ]; then
    echo "Running seed inside Docker container..."
    docker-compose exec event-generator python -m src.main --count 10000
    echo ""
    echo "Seed complete. Check data/raw/ for output files."
    exit 0
fi

echo "SearchFlow Data Seeder"
echo "======================"
echo "Sessions: $NUM_SESSIONS"
echo "Output:   $OUTPUT_DIR"
echo ""

mkdir -p "$OUTPUT_DIR"

if command -v python3 &> /dev/null; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
    export OUTPUT_DIR="$PROJECT_DIR/$OUTPUT_DIR"
    export PYTHONPATH="$PROJECT_DIR"
    echo "Running locally with Python..."
    python3 "$PROJECT_DIR/scripts/seed_data.py"
else
    echo "Python not found locally. Using Docker..."
    docker-compose exec -e OUTPUT_DIR=/data/raw event-generator python -m src.main --count "$((NUM_SESSIONS * 3))"
fi

echo ""
echo "Verifying generated files..."

for f in search_events.jsonl click_events.jsonl conversion_events.jsonl; do
    filepath="$OUTPUT_DIR/$f"
    if [ -f "$filepath" ]; then
        lines=$(wc -l < "$filepath" | tr -d ' ')
        echo "  $f: $lines events"
    else
        echo "  $f: not found"
    fi
done

echo ""
echo "Seed complete."
