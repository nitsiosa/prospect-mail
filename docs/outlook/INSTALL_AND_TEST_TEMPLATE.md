# Prototype build and manual install — Cursor must finalise

Do not present these commands as proof that a `.deb` has been built. Replace TODO values only after actual build.

## Prerequisites
- Ubuntu GNOME Wayland; `echo $XDG_SESSION_TYPE` should be `wayland`.
- Corporate Microsoft 365 account accessible in organisation's standard authorised login flow.
- A separate Teams for Linux client or regular browser for Teams meeting links.

## Candidate artifact
- Commit: TODO
- .deb filename: TODO
- SHA256: TODO
- Electron sandbox verified: TODO
- Node test suite: TODO
- Any package conflicts: TODO

## Build on developer machine
```bash
npm ci
npm test
npm run dist:linux:deb:x64
```

## Review package without installation
```bash
dpkg-deb --info dist/*.deb
dpkg-deb --contents dist/*.deb | head -80
sha256sum dist/*.deb
```

## Installation (human consent required)
```bash
sudo apt install ./dist/ACTUAL_FILE_NAME.deb
```

Check the installed package name with `dpkg -I` before documenting uninstall instructions. Do not assume it matches executable. Document preserving/removing app data separately; do not delete user cache/credentials by default.

## Start Wayland
Try the `.desktop` launcher. If testing explicit Ozone backend:
```bash
prospect-mail --ozone-platform=wayland
```

If that fails, first collect a privacy-scrubbed diagnostic and distinguish packaging from runtime issues. Do not recommend `--no-sandbox` for installed apps.

## Manual acceptance
See `ACCEPTANCE_TESTS.md` for step-by-step list. Record real results. On failure: stage name, safe error code, Ubuntu version, package hash, and repro steps only. Never attach mail/auth content.
