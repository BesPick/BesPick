#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP_VERSION="$(node -p "require('./package.json').version")"
GIT_SHA="$(git rev-parse --short HEAD)"
OVERRIDE_DIR="/etc/systemd/system/holocron.service.d"
OVERRIDE_FILE="${OVERRIDE_DIR}/override.conf"

echo "Setting build metadata (version ${APP_VERSION}, sha ${GIT_SHA})"
sudo mkdir -p "$OVERRIDE_DIR"
sudo tee "$OVERRIDE_FILE" >/dev/null <<EOF
[Service]
Environment=NEXT_PUBLIC_APP_VERSION=${APP_VERSION}
Environment=NEXT_PUBLIC_GIT_SHA=${GIT_SHA}
EOF

sudo systemctl daemon-reload

export NEXT_PUBLIC_APP_VERSION="${APP_VERSION}"
export NEXT_PUBLIC_GIT_SHA="${GIT_SHA}"

echo "Building app in $ROOT_DIR"
npm run build

echo "Restarting holocron service"
sudo systemctl restart holocron

echo "Deployment complete."
