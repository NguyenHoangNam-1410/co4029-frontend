#!/usr/bin/env bash
set -e
if grep -rE "#7c3aed|#a855f7|#8b5cf6|#6d28d9" frontend-vite/src --include="*.ts" --include="*.tsx" --include="*.css"; then
  echo "ERROR: forbidden purple hex code found"
  exit 1
fi
if grep -rE "(violet|purple)-[0-9]" frontend-vite/src --include="*.ts" --include="*.tsx" --include="*.css"; then
  echo "ERROR: forbidden Tailwind violet/purple class found"
  exit 1
fi
echo "OK: no purple/violet"
