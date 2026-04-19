#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib.sh
source "${SCRIPT_DIR}/lib.sh"

require_command curl
require_command python3

OVERPASS_URL="${1:-http://127.0.0.1:8080/api/interpreter}"
QUERY='[out:json];node(1);out;'

log "Checking replication timestamps from ${OVERPASS_URL}"
RESP_A="$(curl -sS --get --data-urlencode "data=${QUERY}" "${OVERPASS_URL}")"
sleep 65
RESP_B="$(curl -sS --get --data-urlencode "data=${QUERY}" "${OVERPASS_URL}")"

python3 - <<'PY' "${RESP_A}" "${RESP_B}"
import json
import sys

a = json.loads(sys.argv[1])
b = json.loads(sys.argv[2])
ta = a.get("osm3s", {}).get("timestamp_osm_base", "")
tb = b.get("osm3s", {}).get("timestamp_osm_base", "")

print(f"timestamp_a={ta}")
print(f"timestamp_b={tb}")
if not ta or not tb:
    raise SystemExit("Missing timestamp_osm_base in response")
if tb < ta:
    raise SystemExit("timestamp_osm_base moved backwards")
print("Replication timestamp check passed.")
PY
