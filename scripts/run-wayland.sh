#!/usr/bin/env bash
# Run from Prospect Mail fork root. Does not install or modify desktop defaults.
set -euo pipefail
cd "$(dirname "$(dirname "$(realpath "${BASH_SOURCE[0]}")")")"
if [ ! -f package.json ] || ! grep -q '"name": "prospect-mail"' package.json; then
  echo 'Run this only inside the cloned Prospect Mail repository.' >&2; exit 1
fi
if [ ! -d node_modules ]; then
  echo 'Missing node_modules. Run npm ci first.' >&2; exit 1
fi
exec npm start -- --ozone-platform=wayland
