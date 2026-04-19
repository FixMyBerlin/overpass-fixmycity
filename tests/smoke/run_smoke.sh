#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

bash "${ROOT_DIR}/tests/smoke/offline_validation.sh"
bash "${ROOT_DIR}/scripts/ops/verify_query.sh" "${1:-http://127.0.0.1:8080/api/interpreter}"
bash "${ROOT_DIR}/scripts/ops/check_replication.sh" "${1:-http://127.0.0.1:8080/api/interpreter}"

echo "Smoke suite passed."
