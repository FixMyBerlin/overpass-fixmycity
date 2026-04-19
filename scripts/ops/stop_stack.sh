#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib.sh
source "${SCRIPT_DIR}/lib.sh"

require_command docker
load_env

docker compose --env-file "${ENV_FILE}" -f "${ROOT_DIR}/infra/docker/docker-compose.yml" down
log "Stack stopped."
