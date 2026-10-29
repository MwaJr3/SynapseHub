#!/usr/bin/env bash
# Run one project's e2e suite (which also captures documentation screenshots).
# Usage: scripts/run-e2e.sh <hashsight|assetwatch|securecode-workbench|cyberaware-lab|phishlens|netscope|incidentflow|threatintel-desk>
# Each product is filed under its company since 2026-10-29, so the slug is looked up
# in OWNER below rather than assumed to be a child of projects/.
# Requirements: python env with the backend deps, node, and Playwright browsers
#   (npx playwright install chromium — run once on a machine with network access).
set -euo pipefail
SLUG="$1"
declare -A OWNER=( [hashsight]=velaqori [assetwatch]=velaqori [securecode-workbench]=velaqori [cyberaware-lab]=tamuzi [phishlens]=velaqori [netscope]=velaqori [incidentflow]=velaqori [threatintel-desk]=velaqori )
declare -A BE_PORT=( [hashsight]=8011 [assetwatch]=8012 [securecode-workbench]=8013 [cyberaware-lab]=8014 [phishlens]=8015 [netscope]=8016 [incidentflow]=8017 [threatintel-desk]=8018 )
declare -A FE_PORT=( [hashsight]=5174 [assetwatch]=5175 [securecode-workbench]=5176 [cyberaware-lab]=5177 [phishlens]=5178 [netscope]=5179 [incidentflow]=5180 [threatintel-desk]=5181 )
BE="${BE_PORT[$SLUG]:?unknown project}"
FE="${FE_PORT[$SLUG]:?unknown project}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHOTS="$ROOT/docs/screenshots/$SLUG"
mkdir -p "$SHOTS"

cd "$ROOT/companies/${OWNER[$SLUG]}/$SLUG/backend"
export DATABASE_URL="sqlite:///./data/e2e-$SLUG.db"
uvicorn app.main:app --port "$BE" &
BE_PID=$!
cd "$ROOT/companies/${OWNER[$SLUG]}/$SLUG/frontend"
VITE_API_TARGET="http://127.0.0.1:$BE" npm run dev &
FE_PID=$!
trap 'kill $BE_PID $FE_PID 2>/dev/null || true' EXIT
sleep 5

SCREENSHOT_DIR="$SHOTS" E2E_BASE_URL="http://127.0.0.1:$FE" npx playwright test
echo "Screenshots written to $SHOTS"
