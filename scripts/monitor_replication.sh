#!/usr/bin/env bash
# Checks replication lag and pings the OneUptime heartbeat on success (run by a systemd timer).
# A missing heartbeat is the alert, so any failure (API down, lag too high) simply exits non-zero.
set -euo pipefail

url=${OVERPASS_URL:-http://127.0.0.1:8080}
max_lag=${OVERPASS_MAX_LAG_SECONDS:-300}

timestamp=$(curl -fsS --max-time 10 "$url/api/timestamp")
lag=$(($(date -u +%s) - $(date -u -d "$timestamp" +%s)))
echo "timestamp=$timestamp lag_seconds=$lag max_lag_seconds=$max_lag"

if ((lag > max_lag)); then
  echo "Replication lag above threshold" >&2
  exit 1
fi

if [[ -n "${ONEUPTIME_HEARTBEAT_URL:-}" ]]; then
  curl -fsS --max-time 10 "$ONEUPTIME_HEARTBEAT_URL" >/dev/null
fi
