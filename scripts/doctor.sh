#!/usr/bin/env bash
# Safe environment inventory: no hostnames, usernames, device serials or email.
set -uo pipefail
printf '%s\n' '== Ubuntu Outlook Wayland environment check (privacy-safe) =='
if [ -r /etc/os-release ]; then
  . /etc/os-release
  printf 'OS: %s\n' "${PRETTY_NAME:-unknown}"
fi
printf 'Architecture: %s\n' "$(uname -m)"
printf 'Desktop session type: %s\n' "${XDG_SESSION_TYPE:-unknown}"
printf 'Desktop type: %s\n' "${XDG_CURRENT_DESKTOP:-unknown}"
for tool in git gh node npm dpkg-deb xdg-open xdg-mime gdbus; do
  if command -v "$tool" >/dev/null 2>&1; then
    case "$tool" in
      node|npm) printf '%s: present (%s)\n' "$tool" "$("$tool" --version)" ;;
      *) printf '%s: present\n' "$tool" ;;
    esac
  else
    printf '%s: MISSING\n' "$tool"
  fi
done
for pkg in xdg-desktop-portal xdg-desktop-portal-gnome libnss3 libsecret-1-0; do
  if command -v dpkg-query >/dev/null 2>&1 && dpkg-query -W -f='${Status}' "$pkg" 2>/dev/null | grep -q 'install ok installed'; then
    printf '%s: installed\n' "$pkg"
  else
    printf '%s: absent/not available\n' "$pkg"
  fi
done
if [ "${XDG_SESSION_TYPE:-}" != 'wayland' ]; then
  echo 'NOTE: Native Wayland acceptance requires a Wayland login session.'
fi
if command -v node >/dev/null 2>&1; then
  major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  if [ "$major" -ne 24 ] 2>/dev/null; then
    echo 'NOTE: Prospect Mail upstream requests Node.js 24.x. Use an existing version manager if needed.'
  fi
fi
