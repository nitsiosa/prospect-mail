#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$(dirname "$(realpath "${BASH_SOURCE[0]}")")")"
command -v dpkg-deb >/dev/null || { echo 'dpkg-deb required'; exit 1; }
shopt -s nullglob
files=(dist/*.deb)
if [ ${#files[@]} -eq 0 ]; then
  echo 'No Debian package found in dist/. Build with: npm run dist:linux:deb:x64' >&2
  exit 1
fi
for deb in "${files[@]}"; do
  echo "== $deb =="
  dpkg-deb --field "$deb" Package Version Architecture Depends
  sha256sum "$deb"
  echo 'Desktop entries / mime types:'
  dpkg-deb --contents "$deb" | grep -E '(\.desktop|icons/.+\.png|\.svg)' | head -20 || true
  echo
 done
