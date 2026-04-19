#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib.sh
source "${SCRIPT_DIR}/lib.sh"

require_command curl
require_command sha256sum
require_command osmium

FORCE_REFRESH="false"
REFRESH_METADATA="false"
EXTRACT_URL="https://download.geofabrik.de/europe/germany-latest.osm.bz2"
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
    --extract-url)
      EXTRACT_URL="$2"
      shift 2
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
FILE_NAME="$(basename "${EXTRACT_URL}")"
CACHE_BASENAME="${FILE_NAME}"
MANIFEST_FILE="${ARTIFACT_DIR}/${CACHE_BASENAME}.manifest"
EXTRACT_FILE="${ARTIFACT_DIR}/${FILE_NAME}"
CONTAINER_FILE="/cache/extracts/${FILE_NAME}"

mkdir -p "${ARTIFACT_DIR}"

if [[ -f "${EXTRACT_FILE}" && "${FORCE_REFRESH}" != "true" ]]; then
  log "Local extract cache exists. Reusing ${EXTRACT_FILE}."
else
  if [[ "${FORCE_REFRESH}" == "true" ]]; then
    log "Force refresh requested; downloading extract again."
  else
    log "No cached extract found; performing one-time download."
  fi
  with_backoff 4 15 curl -fL --retry 3 --retry-delay 5 -o "${EXTRACT_FILE}.tmp" "${EXTRACT_URL}"
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

IMPORT_FILE="${EXTRACT_FILE}"
IMPORT_SHA256="${SHA256}"
if [[ "${EXTRACT_FILE}" == *.osm.pbf ]]; then
  BZ2_FILE="${EXTRACT_FILE%.osm.pbf}.osm.bz2"
  if [[ ! -f "${BZ2_FILE}" || "${FORCE_REFRESH}" == "true" ]]; then
    log "Converting PBF to BZ2 for Overpass import compatibility."
    with_backoff 3 10 osmium cat "${EXTRACT_FILE}" -o "${BZ2_FILE}"
  else
    log "Reusing existing converted BZ2 file ${BZ2_FILE}."
  fi
  IMPORT_FILE="${BZ2_FILE}"
  IMPORT_SHA256="$(sha256sum "${IMPORT_FILE}" | awk '{print $1}')"
fi

IMPORT_BASENAME="$(basename "${IMPORT_FILE}")"
CONTAINER_FILE="/cache/extracts/${IMPORT_BASENAME}"

cat > "${MANIFEST_FILE}" <<EOF
extract_url=${EXTRACT_URL}
cached_file=${EXTRACT_FILE}
sha256=${SHA256}
import_file=${IMPORT_FILE}
import_sha256=${IMPORT_SHA256}
cached_at_utc=${DATE_UTC}
etag=${ETAG}
last_modified=${LAST_MODIFIED}
EOF

set_env_var "OVERPASS_PLANET_URL" "file://${CONTAINER_FILE}"

log "Extract cache ready."
log "Manifest written to ${MANIFEST_FILE}"
log "OVERPASS_PLANET_URL set to local cache path in infra/docker/.env."
