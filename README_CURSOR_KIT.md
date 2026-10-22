# Outlook for Ubuntu Wayland — Cursor implementation pack

This is an **instruction and bootstrap package**, not an already-built Outlook client. The pack is designed for the user's established Cursor workflow and parallels their Teams-for-Linux fork approach.

## What is being forked?
Upstream: https://github.com/julian-alarcon/prospect-mail (MIT). Latest release checked was 1.3.0; upstream `main` `package.json` described 1.3.1 at inspection. It is a Microsoft 365 Outlook *web-wrapper*, not a fully native Exchange/Graph implementation. Phase 1 improves the desktop experience while retaining Outlook's existing corporate mail/calendar features.

## Install prerequisites (once)
```bash
sudo apt update
sudo apt install -y git gh
# Node.js 24.x is required by upstream; install with your existing preferred version manager.
gh auth login   # only if not already authenticated from the Teams project
```

## Bootstrap fork and repository (run from the extracted pack)
```bash
bash scripts/bootstrap-fork.sh ~/development/prospect-mail
cursor ~/development/prospect-mail
```

Paste the contents of `QUICK_PROMPT.txt` into **Cursor Agent** mode. The persistent instructions are also in `.cursor/rules/outlook-wayland.mdc` and `AGENTS.md`.

## Script details
- `scripts/bootstrap-fork.sh`: creates or reuses your GitHub fork and clean checkout, creates feature branch, installs Cursor docs/rules without overwriting upstream source files. Does not install the Outlook application or publish a release.
- `scripts/doctor.sh`: checks distro/session/tools locally while avoiding identity data.
- `scripts/run-wayland.sh`: starts the development build using native Wayland flags.
- `scripts/check-deb.sh`: examines the built `.deb`'s metadata and SHA256.

## Explicit limitations
A functioning and secure Outlook prototype can be developed without a new Graph application registration. Full offline email, a bespoke native Exchange client, or guaranteed feature parity with Windows Outlook are not included. Sign-in, sending/receiving mail, calendar invitations and GNOME notifications still require real authorised human testing.

## What Cursor must deliver
Small reviewed commits pushed to *your fork*, passing automated tests, an x64 Ubuntu `.deb`, security review, documentation, and one consolidated human acceptance checklist. No upstream PR or public package publication without approval.
