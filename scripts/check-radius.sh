#!/usr/bin/env bash
set -e
if grep -rE "rounded-(2xl|3xl|\[1[3-9]px\]|\[2[0-9]+px\])" frontend-vite/src/components/ui frontend-vite/src/components/layout frontend-vite/src/routes --include="*.tsx" --include="*.ts"; then
  echo "ERROR: forbidden over-radius (>12px on cards/buttons)"
  exit 1
fi
echo "OK: radius scale enforced"
