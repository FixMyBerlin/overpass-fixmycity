#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib.sh
source "${SCRIPT_DIR}/lib.sh"

require_command curl
require_command wget
require_command sha256sum

FORCE_REFRESH="false"
REFRESH_METADATA="false"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --force-refresh)
      FORCE_REFRESH="true"
      shift
      ;;
    --refresh-metadata)
      REFRESH_METADATA="true"
      shift
      ;;
    *)
      log "Unknown argument: $1"
      exit 1
      ;;
  esac
done

load_env

CACHE_ROOT="${OVERPASS_CACHE_ROOT:-${ROOT_DIR}/.local/cache}"
ARTIFACT_DIR="${CACHE_ROOT}/extracts"
MANIFEST_FILE="${ARTIFACT_DIR}/germany-latest.manifest"
EXTRACT_URL="https://download.geofabrik.de/europe/germany-latest.osm.pbf"
EXTRACT_FILE="${ARTIFACT_DIR}/germany-latest.osm.pbf"

mkdir -p "${ARTIFACT_DIR}"

if [[ -f "${EXTRACT_FILE}" && "${FORCE_REFRESH}" != "true" ]]; then
  log "Local extract cache exists. Reusing ${EXTRACT_FILE}."
else
  if [[ "${FORCE_REFRESH}" == "true" ]]; then
    log "Force refresh requested; downloading extract again."
  else
    log "No cached extract found; performing one-time download."
  fi
  with_backoff 4 15 wget -O "${EXTRACT_FILE}.tmp" "${EXTRACT_URL}"
  mv "${EXTRACT_FILE}.tmp" "${EXTRACT_FILE}"
fi

SHA256="$(sha256sum "${EXTRACT_FILE}" | awk '{print $1}')"
DATE_UTC="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
ETAG=""
LAST_MODIFIED=""
if [[ "${FORCE_REFRESH}" == "true" || "${REFRESH_METADATA}" == "true" || ! -f "${MANIFEST_FILE}" ]]; then
  HEADERS="$(curl -sI "${EXTRACT_URL}" || true)"
  ETAG="$(printf '%s\n' "${HEADERS}" | awk -F': ' '/^etag:/ {print $2}' | tr -d '\r')"
  LAST_MODIFIED="$(printf '%s\n' "${HEADERS}" | awk -F': ' '/^last-modified:/ {print $2}' | tr -d '\r')"
else
  log "Skipping upstream metadata request to minimize external load."
fi

cat > "${MANIFEST_FILE}" <<EOF
extract_url=${EXTRACT_URL}
cached_file=${EXTRACT_FILE}
sha256=${SHA256}
cached_at_utc=${DATE_UTC}
etag=${ETAG}
last_modified=${LAST_MODIFIED}
EOF

set_env_var "OVERPASS_PLANET_URL" "file:///cache/extracts/germany-latest.osm.pbf"

log "Extract cache ready."
log "Manifest written to ${MANIFEST_FILE}"
log "OVERPASS_PLANET_URL set to local cache path in infra/docker/.env."
