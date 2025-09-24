#!/usr/bin/env bash
# Run Locust load test in headless mode and save results.
#
# Usage:
#   ./benchmarks/run_benchmark.sh [HOST] [USERS] [SPAWN_RATE] [DURATION]
#
# Defaults:
#   HOST=http://localhost:8000  USERS=100  SPAWN_RATE=10  DURATION=60s

set -euo pipefail

HOST="${1:-http://localhost:8000}"
USERS="${2:-100}"
SPAWN_RATE="${3:-10}"
DURATION="${4:-60s}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RESULTS_DIR="${SCRIPT_DIR}/results"
mkdir -p "${RESULTS_DIR}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CSV_PREFIX="${RESULTS_DIR}/report_${TIMESTAMP}"

echo "========================================="
echo "SearchFlow ML API Load Test"
echo "========================================="
echo "  Host:        ${HOST}"
echo "  Users:       ${USERS}"
echo "  Spawn rate:  ${SPAWN_RATE}/s"
echo "  Duration:    ${DURATION}"
echo "  Results:     ${CSV_PREFIX}_*.csv"
echo "========================================="
echo

locust \
    -f "${SCRIPT_DIR}/locustfile.py" \
    --host "${HOST}" \
    --headless \
    -u "${USERS}" \
    -r "${SPAWN_RATE}" \
    -t "${DURATION}" \
    --csv "${CSV_PREFIX}" \
    --csv-full-history \
    --print-stats

echo
echo "Results saved to ${RESULTS_DIR}/"
ls -lh "${CSV_PREFIX}"_*.csv 2>/dev/null || true
