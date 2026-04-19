#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib.sh
source "${SCRIPT_DIR}/lib.sh"

require_command docker
require_command awk

load_env

if [[ -z "${OVERPASS_PLANET_URL:-}" ]]; then
  log "OVERPASS_PLANET_URL is empty. Run scripts/ops/download_extract.sh first."
  exit 1
fi

mkdir -p "${OVERPASS_DATA_ROOT:-${ROOT_DIR}/.local/overpass-data}/db"
mkdir -p "${OVERPASS_CACHE_ROOT:-${ROOT_DIR}/.local/cache}/extracts"

log "Starting Overpass stack with docker compose."
docker compose --env-file "${ENV_FILE}" -f "${ROOT_DIR}/infra/docker/docker-compose.yml" up -d

log "Waiting for overpass container startup."
for _ in $(seq 1 30); do
  if docker compose --env-file "${ENV_FILE}" -f "${ROOT_DIR}/infra/docker/docker-compose.yml" ps | awk '$1 ~ /overpass_de/ && $0 ~ /running/ {found=1} END {exit(found?0:1)}'; then
    log "Overpass container is running."
    exit 0
  fi
  sleep 10
done

log "Overpass container did not become running in time."
exit 1
