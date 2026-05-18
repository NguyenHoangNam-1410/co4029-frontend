#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BASELINE_FILE="$PROJECT_DIR/bundle-baseline.json"

cd "$PROJECT_DIR"

if [ ! -f "$BASELINE_FILE" ]; then
  echo "ERROR: No baseline found at $BASELINE_FILE"
  echo "Run 'bash scripts/bundle-baseline.sh' first."
  exit 1
fi

echo "Building project..."
BUILD_OUTPUT=$(npm run build 2>&1)

TOTAL_GZIP=$(echo "$BUILD_OUTPUT" | grep -E '\.js\s' | grep -oP 'gzip:\s+\K[\d,]+\.?\d*' | tr -d ',' | paste -sd+ | bc)

if [ -z "$TOTAL_GZIP" ]; then
  echo "ERROR: Could not parse bundle sizes from build output"
  exit 1
fi

BASELINE_TOTAL=$(python3 -c "import json; print(json.load(open('$BASELINE_FILE'))['total_gzip_kb'])")
BUDGET_PCT=$(python3 -c "import json; print(json.load(open('$BASELINE_FILE'))['budget_pct'])")

DELTA_PCT=$(python3 -c "
baseline = $BASELINE_TOTAL
current = $TOTAL_GZIP
delta = ((current - baseline) / baseline) * 100
print(f'{delta:.2f}')
")

MAX_ALLOWED=$(python3 -c "print(f'{$BASELINE_TOTAL * (1 + $BUDGET_PCT / 100):.2f}')")

echo "Bundle size check:"
echo "  Baseline total (gzip): ${BASELINE_TOTAL} kB"
echo "  Current total (gzip):  ${TOTAL_GZIP} kB"
echo "  Delta:                 ${DELTA_PCT}%"
echo "  Budget:                +${BUDGET_PCT}% (max ${MAX_ALLOWED} kB)"

OVER=$(python3 -c "
delta = float('$DELTA_PCT')
budget = float('$BUDGET_PCT')
print('yes' if delta > budget else 'no')
")

if [ "$OVER" = "yes" ]; then
  echo ""
  echo "FAIL: Bundle size exceeds budget by ${DELTA_PCT}% (limit: +${BUDGET_PCT}%)"
  echo "Either reduce bundle size or refresh baseline with 'bash scripts/bundle-baseline.sh'"
  exit 1
fi

echo ""
echo "PASS: Bundle size within budget."
exit 0
