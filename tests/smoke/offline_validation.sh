#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

python3 - <<'PY' \
  "${ROOT_DIR}/tests/smoke/fixtures/interpreter_response_a.json" \
  "${ROOT_DIR}/tests/smoke/fixtures/interpreter_response_b.json"
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as fa:
    a = json.load(fa)
with open(sys.argv[2], "r", encoding="utf-8") as fb:
    b = json.load(fb)

ta = a.get("osm3s", {}).get("timestamp_osm_base", "")
tb = b.get("osm3s", {}).get("timestamp_osm_base", "")
if not ta or not tb:
    raise SystemExit("Missing timestamp_osm_base in fixtures")
if tb < ta:
    raise SystemExit("Fixture validation failed: timestamp moved backwards")
if len(a.get("elements", [])) == 0:
    raise SystemExit("Fixture validation failed: empty elements")
print("Offline validation passed.")
PY
