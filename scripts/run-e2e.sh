#!/usr/bin/env bash
# Run one project's e2e suite (which also captures documentation screenshots).
# Usage: scripts/run-e2e.sh <hashsight|assetwatch|securecode-workbench|cyberaware-lab>
# Requirements: python env with the backend deps, node, and Playwright browsers
#   (npx playwright install chromium — run once on a machine with network access).
set -euo pipefail
SLUG="$1"
declare -A BE_PORT=( [hashsight]=8011 [assetwatch]=8012 [securecode-workbench]=8013 [cyberaware-lab]=8014 )
declare -A FE_PORT=( [hashsight]=5174 [assetwatch]=5175 [securecode-workbench]=5176 [cyberaware-lab]=5177 )
BE="${BE_PORT[$SLUG]:?unknown project}"
FE="${FE_PORT[$SLUG]:?unknown project}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHOTS="$ROOT/docs/screenshots/$SLUG"
mkdir -p "$SHOTS"

cd "$ROOT/projects/$SLUG/backend"
export DATABASE_URL="sqlite:///./data/e2e-$SLUG.db"
uvicorn app.main:app --port "$BE" &
BE_PID=$!
cd "$ROOT/projects/$SLUG/frontend"
VITE_API_TARGET="http://127.0.0.1:$BE" npm run dev &
FE_PID=$!
trap 'kill $BE_PID $FE_PID 2>/dev/null || true' EXIT
sleep 5

SCREENSHOT_DIR="$SHOTS" E2E_BASE_URL="http://127.0.0.1:$FE" npx playwright test
echo "Screenshots written to $SHOTS"
