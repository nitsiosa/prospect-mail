#!/usr/bin/env bash
# Offline Electron/Wayland smoke test using a private headless GNOME compositor.
# Ubuntu blocks the Chromium sandbox for source checkouts through AppArmor, so
# this test-only process uses ELECTRON_DISABLE_SANDBOX=1. Packaged artifacts
# never contain that setting and are checked separately.
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
ELECTRON="$ROOT/node_modules/electron/dist/electron"
SMOKE_SCRIPT="$ROOT/testing/electron-smoke.js"

command -v dbus-run-session >/dev/null
command -v gnome-shell >/dev/null

if [ ! -x "$ELECTRON" ]; then
  echo "Electron binary missing. Run npm ci, then node node_modules/electron/install.js." >&2
  exit 1
fi

TEMP_ROOT="$(mktemp -d /tmp/prospect-mail-wayland-smoke.XXXXXX)"
mkdir -p "$TEMP_ROOT/home" "$TEMP_ROOT/run"
chmod 700 "$TEMP_ROOT/run"

cleanup() {
  if command -v fusermount3 >/dev/null 2>&1; then
    fusermount3 -u "$TEMP_ROOT/run/doc" >/dev/null 2>&1 || true
    fusermount3 -u "$TEMP_ROOT/run/gvfs" >/dev/null 2>&1 || true
  fi
  rm -rf --one-file-system "$TEMP_ROOT"
}
trap cleanup EXIT

export ROOT ELECTRON SMOKE_SCRIPT TEMP_ROOT
env -i \
  PATH="$PATH" \
  HOME="$TEMP_ROOT/home" \
  XDG_RUNTIME_DIR="$TEMP_ROOT/run" \
  XDG_CONFIG_HOME="$TEMP_ROOT/home/.config" \
  XDG_DATA_HOME="$TEMP_ROOT/home/.local/share" \
  XDG_CACHE_HOME="$TEMP_ROOT/home/.cache" \
  XDG_CURRENT_DESKTOP="GNOME" \
  GSETTINGS_BACKEND="memory" \
  LANG="C.UTF-8" \
  ROOT="$ROOT" \
  ELECTRON="$ELECTRON" \
  SMOKE_SCRIPT="$SMOKE_SCRIPT" \
  TEMP_ROOT="$TEMP_ROOT" \
  dbus-run-session -- bash -euo pipefail -c '
    gnome-shell \
      --headless \
      --wayland \
      --no-x11 \
      --virtual-monitor 1280x800 \
      --wayland-display=prospect-smoke \
      >"$TEMP_ROOT/gnome-shell.log" 2>&1 &
    compositor_pid=$!

    stop_compositor() {
      kill "$compositor_pid" >/dev/null 2>&1 || true
      wait "$compositor_pid" >/dev/null 2>&1 || true
    }
    trap stop_compositor EXIT

    for _ in $(seq 1 150); do
      [ -S "$XDG_RUNTIME_DIR/prospect-smoke" ] && break
      sleep 0.1
    done
    if [ ! -S "$XDG_RUNTIME_DIR/prospect-smoke" ]; then
      echo "Headless Wayland compositor did not start." >&2
      exit 1
    fi

    WAYLAND_DISPLAY=prospect-smoke \
    XDG_SESSION_TYPE=wayland \
    NODE_ENV=test \
    ELECTRON_DISABLE_SANDBOX=1 \
      timeout 60 "$ELECTRON" \
        --ozone-platform=wayland \
        "$SMOKE_SCRIPT" \
        "mailto:smoke@example.invalid?subject=Wayland%20smoke" \
        2>&1 | tee "$TEMP_ROOT/electron.log"

    if ! grep -q "^SMOKE_RESULT " "$TEMP_ROOT/electron.log"; then
      echo "Electron smoke result was not produced." >&2
      exit 1
    fi
  '
