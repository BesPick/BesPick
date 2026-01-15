#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP_VERSION="$(node -p "require('./package.json').version")"
GIT_SHA="$(git rev-parse --short HEAD)"
UPLOADS_DIR="${ROOT_DIR}/public/uploads"
STANDALONE_DIR="${ROOT_DIR}/.next/standalone"
OVERRIDE_DIR="/etc/systemd/system/holocron.service.d"
OVERRIDE_FILE="${OVERRIDE_DIR}/override.conf"

echo "Setting build metadata (version ${APP_VERSION}, sha ${GIT_SHA})"
sudo mkdir -p "$OVERRIDE_DIR"
sudo tee "$OVERRIDE_FILE" >/dev/null <<EOF
[Service]
Environment=NEXT_PUBLIC_APP_VERSION=${APP_VERSION}
Environment=NEXT_PUBLIC_GIT_SHA=${GIT_SHA}
Environment=UPLOADS_DIR=${UPLOADS_DIR}
EOF

sudo systemctl daemon-reload

export NEXT_PUBLIC_APP_VERSION="${APP_VERSION}"
export NEXT_PUBLIC_GIT_SHA="${GIT_SHA}"
export UPLOADS_DIR="${UPLOADS_DIR}"

echo "Building app in $ROOT_DIR"
npm run build

if [ -d "$STANDALONE_DIR" ]; then
  echo "Preparing standalone output"
  rm -rf "$STANDALONE_DIR/.next/static" "$STANDALONE_DIR/public"
  mkdir -p "$STANDALONE_DIR/.next"
  cp -R "$ROOT_DIR/.next/static" "$STANDALONE_DIR/.next/static"
  cp -R "$ROOT_DIR/public" "$STANDALONE_DIR/public"
fi

echo "Restarting holocron service"
sudo systemctl restart holocron

echo "Deployment complete."
