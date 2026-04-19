#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib.sh
source "${SCRIPT_DIR}/lib.sh"

require_command curl
require_command python3

STATUS_URL="${1:-http://127.0.0.1:8080/api/status}"
RAW="$(curl -sS "${STATUS_URL}")"

python3 - <<'PY' "${RAW}"
import datetime as dt
import re
import sys

raw = sys.argv[1]
match = re.search(r"timestamp_osm_base=([0-9T:\-Z]+)", raw)
if not match:
    print(raw)
    raise SystemExit("Could not parse timestamp_osm_base from /api/status")
ts = match.group(1)
base = dt.datetime.fromisoformat(ts.replace("Z", "+00:00"))
now = dt.datetime.now(dt.timezone.utc)
lag = (now - base).total_seconds()
print(f"timestamp_osm_base={ts}")
print(f"lag_seconds={int(lag)}")
if lag < 0:
    raise SystemExit("Invalid timestamp: in the future")
PY
