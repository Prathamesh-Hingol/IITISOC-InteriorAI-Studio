#!/usr/bin/env bash
# run-all.sh
# ─────────────────────────────────────────────────────────────────────────────
# Runs all load test scripts sequentially using Docker Compose.
# Ensure the observability stack is running first:
#   docker compose up -d prometheus grafana
#
# Usage (run from repo root):
#   bash load-tests/run-all.sh [PRESET]
#
# Examples:
#   bash load-tests/run-all.sh          # smoke (default)
#   bash load-tests/run-all.sh load     # load preset for light endpoints
#   bash load-tests/run-all.sh stress   # stress test
#
# Required env vars (set in .env.loadtest or export before running):
#   K6_TOKENS          — comma-separated Clerk JWT pool
#   TEST_PROJECT_ID    — UUID of a test project
#   TEST_VERSION_ID    — UUID of a test generation/version
#   TEST_IMAGE_URL     — publicly accessible image URL
#   TEST_MASK_URL      — Cloudinary mask URL for editor generate step
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRESET="${1:-smoke}"

# Load .env.loadtest if it exists
ENV_FILE="${SCRIPT_DIR}/.env.loadtest"
if [[ -f "$ENV_FILE" ]]; then
  echo "📋  Loading env from .env.loadtest"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

export TEST_PRESET="$PRESET"

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║   InteriorAI Studio — k6 Load Tests           ║"
echo "║   Preset: $PRESET"
echo "╚════════════════════════════════════════════════╝"
echo ""

DC="docker compose -f ${SCRIPT_DIR}/docker-compose.yml"

run_script() {
  local name="$1"
  local script="$2"
  echo "────────────────────────────────────────────────"
  echo "▶  Running: $name  (preset: $TEST_PRESET)"
  echo "────────────────────────────────────────────────"
  $DC run --rm k6 run "/scripts/${script}" || {
    echo "⚠️   $name failed — continuing with next script"
  }
  echo ""
}

# Always run health first to confirm the backend is reachable
run_script "Health probes"   "health.js"

# Upload — requires K6_TOKENS
run_script "Image Upload"    "upload.js"

# AI-heavy endpoints — use load_ai preset automatically if load/stress requested
if [[ "$PRESET" == "load" || "$PRESET" == "stress" ]]; then
  export TEST_PRESET="${PRESET}_ai"
  echo "ℹ️   Switching to ${TEST_PRESET} preset for AI-heavy endpoints"
fi

run_script "AI Generations"  "generations.js"
run_script "Editor Pipeline" "editor.js"
run_script "Drag Extract"    "drag.js"

echo "════════════════════════════════════════════════"
echo "✅  All scripts complete!"
echo "📊  Open Grafana: http://localhost:3001"
echo "════════════════════════════════════════════════"
