#!/usr/bin/env bash

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/bootstrap/bootstrap_host.sh"
  exit 1
fi

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This bootstrap script currently targets Debian/Ubuntu hosts."
  exit 1
fi

OVERPASS_GROUP="overpassops"
OVERPASS_USER="overpasssvc"

apt-get update
apt-get install -y docker.io docker-compose-plugin curl wget ca-certificates

if ! getent group "${OVERPASS_GROUP}" >/dev/null 2>&1; then
  groupadd --system "${OVERPASS_GROUP}"
fi

if ! id -u "${OVERPASS_USER}" >/dev/null 2>&1; then
  useradd --system --create-home --gid "${OVERPASS_GROUP}" --shell /usr/sbin/nologin "${OVERPASS_USER}"
fi

usermod -aG docker "${SUDO_USER:-${USER}}"
systemctl enable docker
systemctl start docker

echo "Host bootstrap complete."
echo "Log out/in so docker group membership is refreshed for your shell."
