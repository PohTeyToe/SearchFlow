#!/usr/bin/env bash
set -euo pipefail

DATASET="data/raw/hotel_bookings.csv"

# Test 1: Download script produces the file
bash scripts/download_datasets.sh
if [[ ! -f "$DATASET" ]]; then
  echo "FAIL: $DATASET not found after download"
  exit 1
fi
echo "PASS: Dataset exists"

# Test 2: File has expected row count (119,390 data rows + 1 header = 119,391 lines)
LINE_COUNT=$(wc -l < "$DATASET")
if [[ "$LINE_COUNT" -lt 119000 ]]; then
  echo "FAIL: Expected >119,000 lines, got $LINE_COUNT"
  exit 1
fi
echo "PASS: Row count = $LINE_COUNT"

# Test 3: File is gitignored
if git check-ignore -q "$DATASET" 2>/dev/null; then
  echo "PASS: File is gitignored"
else
  echo "FAIL: $DATASET is NOT gitignored"
  exit 1
fi

# Test 4: Idempotency — running download again doesn't fail
bash scripts/download_datasets.sh
echo "PASS: Idempotent (re-run succeeded)"

# Test 5: File is NOT tracked by git
if git ls-files --error-unmatch "$DATASET" 2>/dev/null; then
  echo "FAIL: $DATASET is still tracked by git"
  exit 1
fi
echo "PASS: File is not tracked by git"

echo "All data infrastructure tests passed."
