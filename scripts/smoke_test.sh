#!/usr/bin/env bash
# Smoke test: API answers with meta data and the replication timestamp advances.
# Usage: scripts/smoke_test.sh [base-url] [node-id]   (defaults: local stack, a Monaco node)
set -euo pipefail

url=${1:-http://127.0.0.1:8080}
node_id=${2:-21911886}

response=$(curl -fsS --get --data-urlencode "data=[out:json];node($node_id);out meta;" "$url/api/interpreter")
grep -q '"user":' <<<"$response" || { echo "FAIL: node $node_id without user meta data" >&2; exit 1; }
echo "OK: node $node_id returned with meta data"

first=$(curl -fsS "$url/api/timestamp")
echo "Waiting up to 5 minutes for replication to advance from $first ..."
for _ in $(seq 30); do
  sleep 10
  current=$(curl -fsS "$url/api/timestamp")
  if [[ "$current" > "$first" ]]; then
    echo "OK: replication advanced to $current"
    exit 0
  fi
done
echo "FAIL: replication timestamp did not advance" >&2
exit 1
