#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/infra/docker/.env"
ENV_TEMPLATE="${ROOT_DIR}/infra/docker/.env.example"

log() {
  printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"
}

ensure_env_file() {
  if [[ ! -f "${ENV_FILE}" ]]; then
    cp "${ENV_TEMPLATE}" "${ENV_FILE}"
    log "Created ${ENV_FILE} from template."
  fi
}

load_env() {
  ensure_env_file
  set -a
  # shellcheck source=/dev/null
  source "${ENV_FILE}"
  set +a
}

set_env_var() {
  local key="$1"
  local value="$2"
  ensure_env_file

  if grep -q "^${key}=" "${ENV_FILE}"; then
    sed -i.bak "s|^${key}=.*$|${key}=${value}|" "${ENV_FILE}"
    rm -f "${ENV_FILE}.bak"
  else
    printf '%s=%s\n' "${key}" "${value}" >> "${ENV_FILE}"
  fi
}

require_command() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    log "Missing required command: ${cmd}"
    exit 1
  fi
}

with_backoff() {
  local max_attempts="$1"
  local initial_sleep="$2"
  shift 2
  local attempt=1
  local sleep_s="${initial_sleep}"

  while true; do
    if "$@"; then
      return 0
    fi
    if (( attempt >= max_attempts )); then
      log "Command failed after ${attempt} attempts: $*"
      return 1
    fi
    log "Attempt ${attempt} failed. Retrying in ${sleep_s}s: $*"
    sleep "${sleep_s}"
    attempt=$((attempt + 1))
    sleep_s=$((sleep_s * 2))
  done
}
