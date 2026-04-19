#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib.sh
source "${SCRIPT_DIR}/lib.sh"

require_command curl
require_command python3

OVERPASS_URL="${1:-http://127.0.0.1:8080/api/interpreter}"
QUERY_FILE="${ROOT_DIR}/tests/smoke/germany_sample_query.overpassql"

if [[ ! -f "${QUERY_FILE}" ]]; then
  log "Missing query file ${QUERY_FILE}"
  exit 1
fi

QUERY="$(tr '\n' ' ' < "${QUERY_FILE}")"
RESP="$(curl -sS --get --data-urlencode "data=${QUERY}" "${OVERPASS_URL}")"

python3 - <<'PY' "${RESP}"
import json
import sys

payload = json.loads(sys.argv[1])
elements = payload.get("elements", [])
if not elements:
    raise SystemExit("No elements returned for Germany sample query")
print(f"elements={len(elements)}")
print("Query verification passed.")
PY
