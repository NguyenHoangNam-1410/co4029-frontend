#!/usr/bin/env bash
set -euo pipefail

# bundle-baseline.sh — Captures a fresh bundle size baseline
# Run from frontend-vite/ root

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BASELINE_FILE="$PROJECT_DIR/bundle-baseline.json"

cd "$PROJECT_DIR"

echo "Building project..."
BUILD_OUTPUT=$(npm run build 2>&1)

echo "$BUILD_OUTPUT"

# Parse main bundle gzip size (index-*.js)
MAIN_GZIP=$(echo "$BUILD_OUTPUT" | grep -E 'dist/assets/index-.*\.js' | grep -oP 'gzip:\s+\K[\d,]+\.?\d*' | tr -d ',')

# Parse all JS gzip sizes and sum them
TOTAL_GZIP=$(echo "$BUILD_OUTPUT" | grep -E '\.js\s' | grep -oP 'gzip:\s+\K[\d,]+\.?\d*' | tr -d ',' | paste -sd+ | bc)

if [ -z "$MAIN_GZIP" ] || [ -z "$TOTAL_GZIP" ]; then
  echo "ERROR: Could not parse bundle sizes from build output"
  exit 1
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

cat > "$BASELINE_FILE" <<EOF
{
  "captured_at": "$TIMESTAMP",
  "main_gzip_kb": $MAIN_GZIP,
  "total_gzip_kb": $TOTAL_GZIP,
  "budget_pct": 30,
  "build_command": "npm run build"
}
EOF

echo ""
echo "Baseline captured:"
echo "  Main bundle (gzip): ${MAIN_GZIP} kB"
echo "  Total JS (gzip):    ${TOTAL_GZIP} kB"
echo "  Budget threshold:   30%"
echo "  Written to:         $BASELINE_FILE"
